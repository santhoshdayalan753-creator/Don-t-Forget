export type MemoryCategory = 
  | 'shopping'
  | 'reminder'
  | 'task'
  | 'link'
  | 'idea'
  | 'book'
  | 'gift'
  | 'place'
  | 'general';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface MemoryMetadata {
  // Shopping items inline or subitems
  shoppingListId?: string;
  quantity?: string;
  unit?: string;
  
  // Library book details
  author?: string;
  libraryName?: string;
  borrowedDate?: string;
  refNumber?: string;
  returned?: boolean;
  
  // Saved link details
  url?: string;
  favicon?: string;
  
  // Gift ideas
  recipient?: string;
  occasion?: string;
  budget?: string;
  purchased?: boolean;
  
  // Places to visit
  location?: string;
  mapUrl?: string;
  visited?: boolean;

  // Reminders & dates
  reminderType?: 'birthday' | 'appointment' | 'deadline' | 'payment' | 'other';
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

  // Delivery & Dispatch tracking
  reminder_delivered?: boolean;
  reminder_delivered_at?: string;
  delivery_channel?: 'browser' | 'email' | 'in_app';
}

export interface MemoryItem {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  category: MemoryCategory;
  is_favorite: boolean;
  is_archived: boolean;
  is_completed: boolean;
  due_date?: string | null;
  priority: PriorityLevel;
  tags?: string[];
  reminder_enabled?: boolean;
  timezone?: string;
  metadata?: MemoryMetadata;
  created_at: string;
  updated_at: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  title: string;
  category: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  list_id: string;
  user_id: string;
  item_name: string;
  quantity: string;
  unit?: string;
  notes?: string;
  is_bought: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  theme_preference?: 'light' | 'dark' | 'system';
  timezone?: string;
  email_notifications_enabled?: boolean;
  browser_notifications_enabled?: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  memory_id: string;
  title: string;
  message: string;
  category: MemoryCategory;
  due_date: string;
  is_read: boolean;
  created_at: string;
}

export type FilterOptions = {
  searchQuery: string;
  category?: MemoryCategory | 'all';
  status?: 'all' | 'pending' | 'completed';
  isFavorite?: boolean;
  isArchived?: boolean;
  sortBy?: 'newest' | 'oldest' | 'due_date' | 'title';
  dateFilter?: 'all' | 'today' | 'upcoming' | 'overdue';
};
