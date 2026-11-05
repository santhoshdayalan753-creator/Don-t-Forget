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

export const MemoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [inAppNotifications, setInAppNotifications] = useState<AppNotification[]>(() => ReminderScheduler.getInAppNotifications());
  const [loading, setLoading] = useState(true);

  const userId = user ? user.id : 'local-user';

  const refreshData = useCallback(async () => {
    setLoading(true);
    if (isSupabaseConfigured && user) {
      try {
        const [memoriesRes, listsRes, itemsRes] = await Promise.all([
          supabase.from('memories').select('*').order('created_at', { ascending: false }),
          supabase.from('shopping_lists').select('*').order('created_at', { ascending: false }),
          supabase.from('shopping_items').select('*').order('created_at', { ascending: true })
        ]);

        if (memoriesRes.data) setMemories(memoriesRes.data);
        if (listsRes.data) setShoppingLists(listsRes.data);
        if (itemsRes.data) setShoppingItems(itemsRes.data);
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      }
    } else {
      // Local DB
      setMemories(localDB.getMemories(userId));
      setShoppingLists(localDB.getShoppingLists(userId));
      setShoppingItems(localDB.getShoppingItems(userId));
    }
    setLoading(false);
  }, [user, userId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Periodic Reminder Engine evaluation (Runs every 30 seconds & on memories change)
  useEffect(() => {
    const runEvaluation = async () => {
      const webhookUrl = (import.meta.env.VITE_NOTIFICATION_WEBHOOK_URL as string) || undefined;
      const updated = await ReminderScheduler.evaluateReminders(memories, {
        webhookUrl,
        onInAppAdded: (newList) => setInAppNotifications(newList)
      });
      setInAppNotifications(updated);
    };

    runEvaluation();
    const interval = setInterval(runEvaluation, 30000);
    return () => clearInterval(interval);
  }, [memories]);

  const markNotificationRead = (id: string) => {
    const updated = ReminderScheduler.markNotificationRead(id);
    setInAppNotifications(updated);
  };

  const clearNotifications = () => {
    ReminderScheduler.clearAllNotifications();
    setInAppNotifications([]);
  };

  const unreadNotifCount = inAppNotifications.filter(n => !n.is_read).length;

  const addMemory = async (
    data: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<MemoryItem> => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const newItem: MemoryItem = {
      ...data,
      id: isSupabaseConfigured ? (undefined as any) : 'mem_' + Date.now() + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      reminder_enabled: data.reminder_enabled ?? true,
      timezone: data.timezone || userTimezone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && user) {
      const { data: inserted, error } = await supabase.from('memories').insert([newItem]).select().single();
      if (error) throw error;
      setMemories(prev => [inserted, ...prev]);
      trackEvent('quick_save', { category: data.category });
      if (data.due_date) trackEvent('reminder_created', { category: data.category });
      return inserted;
    } else {
      const updated = [newItem, ...memories];
      setMemories(updated);
      localDB.saveMemories(userId, updated);
      trackEvent('quick_save', { category: data.category });
      if (data.due_date) trackEvent('reminder_created', { category: data.category });
      return newItem;
    }
  };

  const updateMemory = async (id: string, updates: Partial<MemoryItem>) => {
    const updatedTimestamp = new Date().toISOString();
    if (isSupabaseConfigured && user) {
      const { error } = await supabase.from('memories').update({ ...updates, updated_at: updatedTimestamp }).eq('id', id);
      if (error) console.error(error);
    }
    setMemories(prev => {
      const next = prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: updatedTimestamp } : m));
      localDB.saveMemories(userId, next);
      return next;
    });
  };

  const deleteMemory = async (id: string) => {
    if (isSupabaseConfigured && user) {
      await supabase.from('memories').delete().eq('id', id);
    }
    setMemories(prev => {
      const next = prev.filter(m => m.id !== id);
      localDB.saveMemories(userId, next);
      return next;
    });
  };

  const toggleFavorite = async (id: string) => {
    const target = memories.find(m => m.id === id);
    if (!target) return;
    const newStatus = !target.is_favorite;
    await updateMemory(id, { is_favorite: newStatus });
    if (newStatus) {
      trackEvent('saved_item_favourited', { category: target.category });
    }
  };

  const toggleComplete = async (id: string) => {
    const target = memories.find(m => m.id === id);
    if (!target) return;
    const newStatus = !target.is_completed;
    await updateMemory(id, { is_completed: newStatus });
    if (newStatus) {
      trackEvent('task_completed', { category: target.category });
    }
  };

  const toggleArchive = async (id: string) => {
    const target = memories.find(m => m.id === id);
    if (!target) return;
    const newStatus = !target.is_archived;
    await updateMemory(id, { is_archived: newStatus });
    if (newStatus) {
      trackEvent('item_archived', { category: target.category });
    }
  };

  // Shopping List methods
  const addShoppingList = async (title: string, category: string = 'General'): Promise<ShoppingList> => {
    const newList: ShoppingList = {
      id: isSupabaseConfigured ? (undefined as any) : 'list_' + Date.now(),
      user_id: userId,
      title,
      category,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && user) {
      const { data, error } = await supabase.from('shopping_lists').insert([newList]).select().single();
      if (error) throw error;
      setShoppingLists(prev => [data, ...prev]);
      return data;
    } else {
      const next = [newList, ...shoppingLists];
      setShoppingLists(next);
      localDB.saveShoppingLists(userId, next);
      return newList;
    }
  };

  const deleteShoppingList = async (listId: string) => {
    if (isSupabaseConfigured && user) {
      await supabase.from('shopping_lists').delete().eq('id', listId);
      await supabase.from('shopping_items').delete().eq('list_id', listId);
    }
    const nextLists = shoppingLists.filter(l => l.id !== listId);
    const nextItems = shoppingItems.filter(i => i.list_id !== listId);
    setShoppingLists(nextLists);
    setShoppingItems(nextItems);
    localDB.saveShoppingLists(userId, nextLists);
    localDB.saveShoppingItems(userId, nextItems);
  };

  const addShoppingItem = async (
    listId: string,
    itemName: string,
    quantity: string = '1',
    unit: string = '',
    notes: string = ''
  ): Promise<ShoppingItem> => {
    const newItem: ShoppingItem = {
      id: isSupabaseConfigured ? (undefined as any) : 'item_' + Date.now() + Math.random().toString(36).substring(2, 5),
      list_id: listId,
      user_id: userId,
      item_name: itemName,
      quantity,
      unit,
      notes,
      is_bought: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && user) {
      const { data, error } = await supabase.from('shopping_items').insert([newItem]).select().single();
      if (error) throw error;
      setShoppingItems(prev => [...prev, data]);
      return data;
    } else {
      const next = [...shoppingItems, newItem];
      setShoppingItems(next);
      localDB.saveShoppingItems(userId, next);
      return newItem;
    }
  };

  const toggleShoppingItemBought = async (itemId: string) => {
    const item = shoppingItems.find(i => i.id === itemId);
    if (!item) return;
    const newBought = !item.is_bought;
    const timestamp = new Date().toISOString();

    if (isSupabaseConfigured && user) {
      await supabase.from('shopping_items').update({ is_bought: newBought, updated_at: timestamp }).eq('id', itemId);
    }
    setShoppingItems(prev => {
      const next = prev.map(i => i.id === itemId ? { ...i, is_bought: newBought, updated_at: timestamp } : i);
      localDB.saveShoppingItems(userId, next);
      return next;
    });

    if (newBought) {
      trackEvent('shopping_item_completed');
    }
  };

  const deleteShoppingItem = async (itemId: string) => {
    if (isSupabaseConfigured && user) {
      await supabase.from('shopping_items').delete().eq('id', itemId);
    }
    setShoppingItems(prev => {
      const next = prev.filter(i => i.id !== itemId);
      localDB.saveShoppingItems(userId, next);
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
