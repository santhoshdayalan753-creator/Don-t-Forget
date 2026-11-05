import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Bookmark, 
  Home, 
  Layers, 
  ShoppingBag, 
  CheckSquare, 
  Bell, 
  Link as LinkIcon, 
  Lightbulb, 
  BookOpen, 
  Gift, 
  MapPin, 
  Star, 
  Archive, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Search,
  Check,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useMemories } from '../context/MemoryContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { memories, inAppNotifications, unreadNotifCount, markNotificationRead, clearNotifications } = useMemories();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const navigate = useNavigate();

  // Counts for sidebar badges
  const overdueCount = memories.filter(
    m => m.due_date && new Date(m.due_date) < new Date() && !m.is_completed && !m.is_archived
  ).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearch.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/all', label: 'All Memories', icon: Layers },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/reminders', label: 'Dates & Reminders', icon: Bell, badge: overdueCount > 0 ? overdueCount : undefined },
    { to: '/shopping', label: 'Shopping Lists', icon: ShoppingBag },
    { to: '/books', label: 'Library Books', icon: BookOpen },
    { to: '/links', label: 'Saved Links', icon: LinkIcon },
    { to: '/ideas', label: 'Ideas & Thoughts', icon: Lightbulb },
    { to: '/gifts', label: 'Gift Ideas', icon: Gift },
    { to: '/places', label: 'Places to Visit', icon: MapPin },
    { to: '/favorites', label: 'Favorites', icon: Star },
    { to: '/archive', label: 'Archive', icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-800 dark:text-slate-100">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg text-indigo-600 dark:text-indigo-400">
          <Bookmark className="w-5 h-5 fill-current" />
          <span>Don't Forget</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Notifications Trigger Mobile */}
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="p-2 relative rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        {/* Brand */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
              <Bookmark className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block">
                Don't Forget
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Think It. Save It.</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {/* Desktop Notifications Dropdown trigger */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 relative rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>

              {/* Notification Popover */}
              {notifDropdownOpen && (
                <div 
                  className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in"
                  onMouseLeave={() => setNotifDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 text-xs font-bold">
                    <span>Reminders & Alerts ({unreadNotifCount} new)</span>
                    {inAppNotifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {inAppNotifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400">No active alerts right now.</p>
                    ) : (
                      inAppNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 text-xs flex items-start justify-between gap-2 transition-colors ${
                            notif.is_read ? 'opacity-60 bg-transparent' : 'bg-indigo-50/40 dark:bg-indigo-950/30'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{notif.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{notif.message}</p>
                          </div>
                          {!notif.is_read && (
                            <button
                              onClick={() => markNotificationRead(notif.id)}
                              className="p-1 text-indigo-600 hover:text-indigo-800"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search memories..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent dark:border-slate-700/60"
            />
          </form>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'Active User'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Logged in'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/settings"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
