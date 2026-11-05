import React, { useState } from 'react';
import { 
  Filter, 
  Search, 
  SlidersHorizontal, 
  Inbox, 
  ArrowUpDown, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { MemoryItem, MemoryCategory } from '../types';
import { useMemories } from '../context/MemoryContext';
import { MemoryCard } from '../components/MemoryCard';
import { QuickSaveBar, CATEGORIES } from '../components/QuickSaveBar';

interface GenericMemoryViewProps {
  category?: MemoryCategory;
  pageTitle: string;
  pageDescription: string;
  icon: any;
  showQuickSave?: boolean;
  filterOnlyFavorites?: boolean;
  filterOnlyArchived?: boolean;
}

export const GenericMemoryView: React.FC<GenericMemoryViewProps> = ({
  category,
  pageTitle,
  pageDescription,
  icon: Icon,
  showQuickSave = true,
  filterOnlyFavorites = false,
  filterOnlyArchived = false,
}) => {
  const { memories } = useMemories();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'due_date' | 'title'>('newest');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>(category || 'all');

  const now = new Date();

  // Filter pipeline
  const filtered = memories.filter(item => {
    // Favorites only
    if (filterOnlyFavorites && !item.is_favorite) return false;

    // Archive filter
    if (filterOnlyArchived) {
      if (!item.is_archived) return false;
    } else {
      if (item.is_archived) return false;
    }

    // Category filter
    if (category && item.category !== category) return false;
    if (!category && selectedCatFilter !== 'all' && item.category !== selectedCatFilter) return false;

    // Status filter
    if (statusFilter === 'pending' && item.is_completed) return false;
    if (statusFilter === 'completed' && !item.is_completed) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchAuthor = item.metadata?.author?.toLowerCase().includes(q);
      const matchRecipient = item.metadata?.recipient?.toLowerCase().includes(q);
      const matchLocation = item.metadata?.location?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchCategory && !matchAuthor && !matchRecipient && !matchLocation) {
        return false;
      }
    }

    return true;
  });

  // Sorting pipeline
  filtered.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{pageTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {pageDescription}
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 self-start sm:self-auto">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Quick save bar tailored to this view */}
      {showQuickSave && !filterOnlyArchived && (
        <QuickSaveBar defaultCategory={category} />
      )}

      {/* Controls Bar: Search, Category, Status, Sort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search within ${pageTitle.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* If top-level "All Memories" or "Favorites", show category filter selector */}
          {!category && (
            <select
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="due_date">Due Date</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No memories match your criteria
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No results found for "${searchQuery}". Try clearing filters or searching for something else.`
              : 'Add your first memory above or relax — you are all caught up!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <MemoryCard key={item.id} memory={item} />
          ))}
        </div>
      )}
    </div>
  );
};
