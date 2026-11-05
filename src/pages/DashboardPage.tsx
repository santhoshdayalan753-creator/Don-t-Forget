import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  CheckSquare, 
  AlertTriangle, 
  Clock, 
  Star, 
  ArrowRight, 
  Inbox,
  Bell,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMemories } from '../context/MemoryContext';
import { QuickSaveBar, CATEGORIES } from '../components/QuickSaveBar';
import { MemoryCard } from '../components/MemoryCard';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { memories } = useMemories();
  const [recentFilter, setRecentFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const now = new Date();
  const activeMemories = memories.filter(m => !m.is_archived);

  // Filter specific slices
  const todayTasks = activeMemories.filter(m => {
    if (m.category !== 'task' || m.is_completed) return false;
    if (!m.due_date) return true;
    const due = new Date(m.due_date);
    return due.toDateString() === now.toDateString();
  });

  const overdueItems = activeMemories.filter(m => {
    if (m.is_completed || !m.due_date) return false;
    return new Date(m.due_date) < now;
  });

  const upcomingReminders = activeMemories.filter(m => {
    if (m.is_completed || !m.due_date) return false;
    const due = new Date(m.due_date);
    return due > now;
  }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()).slice(0, 4);

  const favoriteItems = activeMemories.filter(m => m.is_favorite).slice(0, 4);

  // Recently captured items directly connected to Instant Capture
  const recentItems = activeMemories
    .filter(m => {
      if (recentFilter === 'pending') return !m.is_completed;
      if (recentFilter === 'completed') return m.is_completed;
      return true;
    })
    .slice(0, 6);

  // Category counts
  const categoryCounts = CATEGORIES.map(cat => ({
    ...cat,
    count: activeMemories.filter(m => m.category === cat.id).length
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Hello, {user?.name || 'Explorer'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            “Think It. Save It. Never Forget It.” Here is your overview for today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overdueItems.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>{overdueItems.length} Overdue</span>
            </div>
          )}
          <div className="text-xs font-medium text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
            {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Prominent Instant Capture Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Instant Capture</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            Natural language date detection active
          </span>
        </div>
        <QuickSaveBar />
      </div>

      {/* Overdue alert banner if items overdue */}
      {overdueItems.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Overdue Items Requiring Attention</span>
            </h3>
            <span className="text-xs text-rose-600 font-semibold">{overdueItems.length} items</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdueItems.slice(0, 4).map(item => (
              <MemoryCard key={item.id} memory={item} />
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Today's Tasks & Upcoming Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span>Today's Tasks</span>
            </h2>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <Inbox className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No pending tasks scheduled for today. Great job!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.slice(0, 4).map(item => (
                <MemoryCard key={item.id} memory={item} />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Reminders & Dates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Upcoming Reminders</span>
            </h2>
            <Link to="/reminders" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingReminders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 mx-auto stroke-1" />
              <p className="text-xs">No upcoming dates scheduled right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingReminders.map(item => (
                <MemoryCard key={item.id} memory={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Overview Hub */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Memory Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {categoryCounts.map(cat => {
            const Icon = cat.icon;
            const path = cat.id === 'general' ? '/all' : `/${cat.id === 'task' ? 'tasks' : cat.id === 'reminder' ? 'reminders' : cat.id === 'book' ? 'books' : cat.id === 'link' ? 'links' : cat.id === 'gift' ? 'gifts' : cat.id === 'place' ? 'places' : cat.id === 'shopping' ? 'shopping' : cat.id + 's'}`;
            return (
              <Link
                key={cat.id}
                to={path}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 p-4 rounded-2xl shadow-sm hover:shadow transition-all group flex flex-col justify-between h-28"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl ${cat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                    {cat.count}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                    {cat.label}
                  </h4>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Favorites Showcase */}
      {favoriteItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Starred Favorites</span>
            </h2>
            <Link to="/favorites" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoriteItems.map(item => (
              <MemoryCard key={item.id} memory={item} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Captured Memories Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Recently Captured Items ({activeMemories.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setRecentFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  recentFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRecentFilter('pending')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  recentFilter === 'pending' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setRecentFilter('completed')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  recentFilter === 'completed' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Completed
              </button>
            </div>
            <Link to="/all" className="text-xs font-semibold text-indigo-600 hover:underline">
              Browse All
            </Link>
          </div>
        </div>

        {recentItems.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-slate-400">
            <p className="text-xs">No memories found in this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentItems.map(item => (
              <MemoryCard key={item.id} memory={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
