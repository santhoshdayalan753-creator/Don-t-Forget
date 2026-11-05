import { MemoryItem, ShoppingList, ShoppingItem } from '../types';

const MEMORIES_KEY = 'dontforget_memories_v1';
const SHOPPING_LISTS_KEY = 'dontforget_shopping_lists_v1';
const SHOPPING_ITEMS_KEY = 'dontforget_shopping_items_v1';

// Initial starter seed data if completely fresh
const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'seed-1',
    user_id: 'local-user',
    title: 'Return "Atomic Habits" by James Clear',
    content: 'Borrowed from City Central Library. Reference #LIB-8842.',
    category: 'book',
    is_favorite: true,
    is_archived: false,
    is_completed: false,
    due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    priority: 'high',
    tags: ['reading', 'library'],
    metadata: {
      author: 'James Clear',
      libraryName: 'City Central Library',
      borrowedDate: new Date(Date.now() - 86400000 * 12).toISOString(),
      refNumber: 'LIB-8842',
      returned: false,
    },
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'seed-2',
    user_id: 'local-user',
    title: 'Annual Dental Checkup & Cleaning',
    content: 'Appointment with Dr. Martinez at Apex Dental Clinic.',
    category: 'reminder',
    is_favorite: true,
    is_archived: false,
    is_completed: false,
    due_date: new Date(Date.now() + 86400000 * 1).toISOString(),
    priority: 'high',
    tags: ['health', 'appointment'],
    metadata: {
      reminderType: 'appointment',
      recurring: 'yearly'
    },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'seed-3',
    user_id: 'local-user',
    title: 'Complete quarterly personal budget review',
    content: 'Review savings, subscriptions, and investment targets.',
    category: 'task',
    is_favorite: false,
    is_archived: false,
    is_completed: false,
    due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    priority: 'medium',
    tags: ['finance', 'planning'],
    metadata: {},
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'seed-4',
    user_id: 'local-user',
    title: 'Wireless noise-cancelling headphones',
    content: 'Birthday gift idea for sister. Sony WH-1000XM5 or Bose QuietComfort.',
    category: 'gift',
    is_favorite: true,
    is_archived: false,
    is_completed: false,
    priority: 'medium',
    tags: ['sister', 'birthday'],
    metadata: {
      recipient: 'Sister (Maya)',
      occasion: 'Birthday',
      budget: '$250',
      purchased: false,
    },
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'seed-5',
    user_id: 'local-user',
    title: 'Marina Coastal Trail & Sunset Point',
    content: 'Great sunset spot for weekend walk with family. Free parking near North Pier.',
    category: 'place',
    is_favorite: false,
    is_archived: false,
    is_completed: false,
    priority: 'low',
    tags: ['nature', 'weekend'],
    metadata: {
      location: 'Marina Coastal Trail, Pier 4',
      mapUrl: 'https://maps.google.com',
      visited: false,
    },
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'seed-6',
    user_id: 'local-user',
    title: 'Web Dev Best Practices Guide & Architecture Principles',
    content: 'Clean article on accessible web design, state management, and modern tooling.',
    category: 'link',
    is_favorite: false,
    is_archived: false,
    is_completed: false,
    priority: 'low',
    tags: ['tech', 'reading'],
    metadata: {
      url: 'https://developer.mozilla.org',
    },
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'seed-7',
    user_id: 'local-user',
    title: 'AI Micro-Journaling App Idea',
    content: 'What if an app prompt took 3 voice bullets at 9 PM and organized daily milestones automatically?',
    category: 'idea',
    is_favorite: true,
    is_archived: false,
    is_completed: false,
    priority: 'medium',
    tags: ['startup', 'product'],
    metadata: {},
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  }
];

const DEFAULT_SHOPPING_LISTS: ShoppingList[] = [
  {
    id: 'list-1',
    user_id: 'local-user',
    title: 'Weekly Groceries',
    category: 'Supermarket',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'list-2',
    user_id: 'local-user',
    title: 'Hardware & Home Supplies',
    category: 'Home Depot',
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_SHOPPING_ITEMS: ShoppingItem[] = [
  {
    id: 'item-1',
    list_id: 'list-1',
    user_id: 'local-user',
    item_name: 'Organic Oat Milk',
    quantity: '2',
    unit: 'cartons',
    notes: 'Unsweetened',
    is_bought: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-2',
    list_id: 'list-1',
    user_id: 'local-user',
    item_name: 'Avocados',
    quantity: '4',
    unit: 'pcs',
    notes: 'Ripe ready to eat',
    is_bought: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-3',
    list_id: 'list-1',
    user_id: 'local-user',
    item_name: 'Sourdough Bread',
    quantity: '1',
    unit: 'loaf',
    notes: '',
    is_bought: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'item-4',
    list_id: 'list-2',
    user_id: 'local-user',
    item_name: 'LED Lightbulbs Warm White',
    quantity: '1',
    unit: 'pack of 4',
    notes: 'E27 socket',
    is_bought: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const localDB = {
  getMemories: (userId: string): MemoryItem[] => {
    try {
      const data = localStorage.getItem(`${MEMORIES_KEY}_${userId}`);
      if (!data) {
        localStorage.setItem(`${MEMORIES_KEY}_${userId}`, JSON.stringify(DEFAULT_MEMORIES));
        return DEFAULT_MEMORIES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_MEMORIES;
    }
  },

  saveMemories: (userId: string, items: MemoryItem[]) => {
    localStorage.setItem(`${MEMORIES_KEY}_${userId}`, JSON.stringify(items));
  },

  getShoppingLists: (userId: string): ShoppingList[] => {
    try {
      const data = localStorage.getItem(`${SHOPPING_LISTS_KEY}_${userId}`);
      if (!data) {
        localStorage.setItem(`${SHOPPING_LISTS_KEY}_${userId}`, JSON.stringify(DEFAULT_SHOPPING_LISTS));
        return DEFAULT_SHOPPING_LISTS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_SHOPPING_LISTS;
    }
  },

  saveShoppingLists: (userId: string, lists: ShoppingList[]) => {
    localStorage.setItem(`${SHOPPING_LISTS_KEY}_${userId}`, JSON.stringify(lists));
  },

  getShoppingItems: (userId: string): ShoppingItem[] => {
    try {
      const data = localStorage.getItem(`${SHOPPING_ITEMS_KEY}_${userId}`);
      if (!data) {
        localStorage.setItem(`${SHOPPING_ITEMS_KEY}_${userId}`, JSON.stringify(DEFAULT_SHOPPING_ITEMS));
        return DEFAULT_SHOPPING_ITEMS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_SHOPPING_ITEMS;
    }
  },

  saveShoppingItems: (userId: string, items: ShoppingItem[]) => {
    localStorage.setItem(`${SHOPPING_ITEMS_KEY}_${userId}`, JSON.stringify(items));
  }
};
