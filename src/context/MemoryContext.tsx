import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MemoryItem, ShoppingList, ShoppingItem, AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { localDB } from '../lib/localStore';
import { trackEvent } from '../lib/analytics';
import { ReminderScheduler } from '../lib/reminderScheduler';

interface MemoryContextType {
  memories: MemoryItem[];
  shoppingLists: ShoppingList[];
  shoppingItems: ShoppingItem[];
  inAppNotifications: AppNotification[];
  unreadNotifCount: number;
  loading: boolean;
  /** Last database error (RLS, network, missing table…), null when healthy. */
  dbError: string | null;
  addMemory: (memory: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<MemoryItem>;
  updateMemory: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;

  // In-app notifications
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Shopping specific actions
  addShoppingList: (title: string, category?: string) => Promise<ShoppingList>;
  deleteShoppingList: (listId: string) => Promise<void>;
  addShoppingItem: (listId: string, itemName: string, quantity?: string, unit?: string, notes?: string) => Promise<ShoppingItem>;
  toggleShoppingItemBought: (itemId: string) => Promise<void>;
  deleteShoppingItem: (itemId: string) => Promise<void>;

  refreshData: () => Promise<void>;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

const describeError = (err: unknown): string => {
  if (!err) return 'Unknown database error';
  if (typeof err === 'string') return err;
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message, e.details, e.hint].filter(Boolean);
  return `${parts.join(' — ') || 'Unknown database error'}${e.code ? ` (code ${e.code})` : ''}`;
};

export const MemoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [inAppNotifications, setInAppNotifications] = useState<AppNotification[]>(() => ReminderScheduler.getInAppNotifications());
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const userId = user ? user.id : 'local-user';
  const isCloud = isSupabaseConfigured && Boolean(user);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setDbError(null);

    if (isCloud) {
      try {
        const [memoriesRes, listsRes, itemsRes] = await Promise.all([
          supabase.from('memories').select('*').order('created_at', { ascending: false }),
          supabase.from('shopping_lists').select('*').order('created_at', { ascending: false }),
          supabase.from('shopping_items').select('*').order('created_at', { ascending: true }),
        ]);

        const firstError = memoriesRes.error || listsRes.error || itemsRes.error;
        if (firstError) throw firstError;

        setMemories((memoriesRes.data as MemoryItem[]) ?? []);
        setShoppingLists((listsRes.data as ShoppingList[]) ?? []);
        setShoppingItems((itemsRes.data as ShoppingItem[]) ?? []);
      } catch (err) {
        const message = describeError(err);
        console.error('Failed to load from Supabase:', err);
        setDbError(message);
      }
    } else {
      // Local persistence fallback (only when Supabase is not configured)
      setMemories(localDB.getMemories(userId));
      setShoppingLists(localDB.getShoppingLists(userId));
      setShoppingItems(localDB.getShoppingItems(userId));
    }

    setLoading(false);
  }, [isCloud, userId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Realtime sync: another tab/device (or an edge function) changes data,
  // we refetch once, debounced.
  useEffect(() => {
    if (!isCloud || !user) return;

    let timer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        refreshData();
      }, 400);
    };

    const channel = supabase
      .channel(`db-sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Supabase realtime unavailable; falling back to manual refresh.', status);
        }
      });

    return () => {
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [isCloud, user?.id, refreshData]);

  /** Persist the idempotency ledger row for a dispatched reminder. */
  const recordDispatchLog = useCallback(
    async (memory: MemoryItem, channel: 'browser' | 'email' | 'in_app') => {
      if (!isSupabaseConfigured || !user || !memory.due_date) return;
      const { error } = await supabase.from('reminder_dispatch_logs').upsert(
        [
          {
            memory_id: memory.id,
            user_id: user.id,
            channel,
            scheduled_for: memory.due_date,
            status: 'delivered',
            response_payload: { source: 'client', timezone: memory.timezone || 'UTC' },
          },
        ],
        { onConflict: 'memory_id,channel,scheduled_for', ignoreDuplicates: true }
      );
      if (error && error.code !== '23505') {
        console.warn('Could not write reminder dispatch log:', error.message);
      }
    },
    [user]
  );

  // Periodic Reminder Engine evaluation (Runs every 30 seconds & on memories change)
  useEffect(() => {
    let cancelled = false;

    const runEvaluation = async () => {
      const webhookUrl = (import.meta.env.VITE_NOTIFICATION_WEBHOOK_URL as string) || undefined;
      const updated = await ReminderScheduler.evaluateReminders(memories, {
        webhookUrl,
        // Email delivery is owned by the server-side cron worker, so the client
        // only emits browser + in-app notifications (no duplicate emails).
        onInAppAdded: (newList) => {
          if (!cancelled) setInAppNotifications(newList);
        },
        onDispatched: (memory, channel) => {
          void recordDispatchLog(memory, channel);
        },
      });
      if (!cancelled) setInAppNotifications(updated);
    };

    runEvaluation();
    const interval = setInterval(runEvaluation, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [memories, recordDispatchLog]);

  const markNotificationRead = (id: string) => {
    const updated = ReminderScheduler.markNotificationRead(id);
    setInAppNotifications(updated);
  };

  const clearNotifications = () => {
    ReminderScheduler.clearAllNotifications();
    setInAppNotifications([]);
  };

  const unreadNotifCount = inAppNotifications.filter((n) => !n.is_read).length;

  const addMemory = async (
    data: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<MemoryItem> => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const payload = {
      ...data,
      user_id: userId,
      // `metadata` is NOT NULL in Postgres; a default only applies to omitted
      // columns, so normalize here to keep null/undefined out of the insert.
      metadata: data.metadata ?? {},
      reminder_enabled: data.reminder_enabled ?? true,
      timezone: data.timezone || userTimezone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isCloud) {
      const { data: inserted, error } = await supabase.from('memories').insert([payload]).select().single();
      if (error) {
        const message = describeError(error);
        setDbError(message);
        throw new Error(message);
      }
      setMemories((prev) => [inserted as MemoryItem, ...prev]);
      trackEvent('quick_save', { category: data.category });
      if (data.due_date) trackEvent('reminder_created', { category: data.category });
      return inserted as MemoryItem;
    }

    const newItem: MemoryItem = {
      ...payload,
      id: 'mem_' + Date.now() + Math.random().toString(36).substring(2, 7),
    } as MemoryItem;

    const updated = [newItem, ...memories];
    setMemories(updated);
    localDB.saveMemories(userId, updated);
    trackEvent('quick_save', { category: data.category });
    if (data.due_date) trackEvent('reminder_created', { category: data.category });
    return newItem;
  };

  const updateMemory = async (id: string, updates: Partial<MemoryItem>) => {
    const updatedTimestamp = new Date().toISOString();

    if (isCloud) {
      const { error } = await supabase.from('memories').update({ ...updates, updated_at: updatedTimestamp }).eq('id', id);
      if (error) {
        setDbError(describeError(error));
        console.error('Failed to update memory:', error);
        return;
      }
    }

    setMemories((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...updates, updated_at: updatedTimestamp } : m));
      if (!isSupabaseConfigured) localDB.saveMemories(userId, next);
      return next;
    });
  };

  const deleteMemory = async (id: string) => {
    if (isCloud) {
      const { error } = await supabase.from('memories').delete().eq('id', id);
      if (error) {
        setDbError(describeError(error));
        console.error('Failed to delete memory:', error);
        return;
      }
    }

    setMemories((prev) => {
      const next = prev.filter((m) => m.id !== id);
      if (!isSupabaseConfigured) localDB.saveMemories(userId, next);
      return next;
    });
  };

  const toggleFavorite = async (id: string) => {
    const target = memories.find((m) => m.id === id);
    if (!target) return;
    const newStatus = !target.is_favorite;
    await updateMemory(id, { is_favorite: newStatus });
    if (newStatus) trackEvent('saved_item_favourited', { category: target.category });
  };

  const toggleComplete = async (id: string) => {
    const target = memories.find((m) => m.id === id);
    if (!target) return;
    const newStatus = !target.is_completed;
    await updateMemory(id, { is_completed: newStatus });
    if (newStatus) trackEvent('task_completed', { category: target.category });
  };

  const toggleArchive = async (id: string) => {
    const target = memories.find((m) => m.id === id);
    if (!target) return;
    const newStatus = !target.is_archived;
    await updateMemory(id, { is_archived: newStatus });
    if (newStatus) trackEvent('item_archived', { category: target.category });
  };

  // ---------------------------------------------------------------------
  // Shopping lists
  // ---------------------------------------------------------------------
  const addShoppingList = async (title: string, category: string = 'General'): Promise<ShoppingList> => {
    const payload = {
      user_id: userId,
      title,
      category,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isCloud) {
      const { data, error } = await supabase.from('shopping_lists').insert([payload]).select().single();
      if (error) {
        const message = describeError(error);
        setDbError(message);
        throw new Error(message);
      }
      setShoppingLists((prev) => [data as ShoppingList, ...prev]);
      return data as ShoppingList;
    }

    const newList: ShoppingList = { ...payload, id: 'list_' + Date.now() } as ShoppingList;
    const next = [newList, ...shoppingLists];
    setShoppingLists(next);
    localDB.saveShoppingLists(userId, next);
    return newList;
  };

  const deleteShoppingList = async (listId: string) => {
    if (isCloud) {
      // shopping_items.list_id has ON DELETE CASCADE, so items go with it.
      const { error } = await supabase.from('shopping_lists').delete().eq('id', listId);
      if (error) {
        setDbError(describeError(error));
        console.error('Failed to delete shopping list:', error);
        return;
      }
    }

    const nextLists = shoppingLists.filter((l) => l.id !== listId);
    const nextItems = shoppingItems.filter((i) => i.list_id !== listId);
    setShoppingLists(nextLists);
    setShoppingItems(nextItems);
    if (!isSupabaseConfigured) {
      localDB.saveShoppingLists(userId, nextLists);
      localDB.saveShoppingItems(userId, nextItems);
    }
  };

  const addShoppingItem = async (
    listId: string,
    itemName: string,
    quantity: string = '1',
    unit: string = '',
    notes: string = ''
  ): Promise<ShoppingItem> => {
    const payload = {
      list_id: listId,
      user_id: userId,
      item_name: itemName,
      quantity,
      unit,
      notes,
      is_bought: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isCloud) {
      const { data, error } = await supabase.from('shopping_items').insert([payload]).select().single();
      if (error) {
        const message = describeError(error);
        setDbError(message);
        throw new Error(message);
      }
      setShoppingItems((prev) => [...prev, data as ShoppingItem]);
      return data as ShoppingItem;
    }

    const newItem: ShoppingItem = {
      ...payload,
      id: 'item_' + Date.now() + Math.random().toString(36).substring(2, 5),
    } as ShoppingItem;
    const next = [...shoppingItems, newItem];
    setShoppingItems(next);
    localDB.saveShoppingItems(userId, next);
    return newItem;
  };

  const toggleShoppingItemBought = async (itemId: string) => {
    const item = shoppingItems.find((i) => i.id === itemId);
    if (!item) return;
    const newBought = !item.is_bought;
    const timestamp = new Date().toISOString();

    if (isCloud) {
      const { error } = await supabase
        .from('shopping_items')
        .update({ is_bought: newBought, updated_at: timestamp })
        .eq('id', itemId);
      if (error) {
        setDbError(describeError(error));
        console.error('Failed to update shopping item:', error);
        return;
      }
    }

    setShoppingItems((prev) => {
      const next = prev.map((i) => (i.id === itemId ? { ...i, is_bought: newBought, updated_at: timestamp } : i));
      if (!isSupabaseConfigured) localDB.saveShoppingItems(userId, next);
      return next;
    });

    if (newBought) trackEvent('shopping_item_completed');
  };

  const deleteShoppingItem = async (itemId: string) => {
    if (isCloud) {
      const { error } = await supabase.from('shopping_items').delete().eq('id', itemId);
      if (error) {
        setDbError(describeError(error));
        console.error('Failed to delete shopping item:', error);
        return;
      }
    }

    setShoppingItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      if (!isSupabaseConfigured) localDB.saveShoppingItems(userId, next);
      return next;
    });
  };

  return (
    <MemoryContext.Provider
      value={{
        memories,
        shoppingLists,
        shoppingItems,
        inAppNotifications,
        unreadNotifCount,
        loading,
        dbError,
        addMemory,
        updateMemory,
        deleteMemory,
        toggleFavorite,
        toggleComplete,
        toggleArchive,
        markNotificationRead,
        clearNotifications,
        addShoppingList,
        deleteShoppingList,
        addShoppingItem,
        toggleShoppingItemBought,
        deleteShoppingItem,
        refreshData,
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
};

export const useMemories = () => {
  const context = useContext(MemoryContext);
  if (!context) throw new Error('useMemories must be used within a MemoryProvider');
  return context;
};
