import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Moon, 
  Sun, 
  Database, 
  Clock, 
  Globe, 
  Mail, 
  Smartphone, 
  Laptop, 
  Send,
  CheckCircle,
  AlertTriangle,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useMemories } from '../context/MemoryContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { isGAConfigured } from '../lib/analytics';
import { ReminderScheduler, EmailDispatchRecord } from '../lib/reminderScheduler';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { memories, dbError } = useMemories();

  // Notification States
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dontforget_email_alerts') !== 'false';
  });
  const [remindersGlobalEnabled, setRemindersGlobalEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dontforget_global_reminders') !== 'false';
  });
  const [userTimezone, setUserTimezone] = useState<string>(() => {
    return localStorage.getItem('dontforget_timezone') || 'Asia/Kolkata';
  });

  // Test Email Sending State
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email dispatch history
  const [dispatchHistory, setDispatchHistory] = useState<EmailDispatchRecord[]>(() =>
    ReminderScheduler.getEmailDispatchHistory()
  );

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationMessage('This browser does not support desktop notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      new Notification("Don't Forget Notifications Active", {
        body: 'Real reminders and due date alerts are now enabled for this browser!',
        icon: '/vite.svg',
      });
      setNotificationMessage('Browser notifications enabled successfully!');
    } else {
      setNotificationMessage('Browser notification permission was denied.');
    }
    setTimeout(() => setNotificationMessage(null), 4000);
  };

  const handleToggleEmailAlerts = () => {
    const next = !emailAlertsEnabled;
    setEmailAlertsEnabled(next);
    localStorage.setItem('dontforget_email_alerts', String(next));
  };

  const handleToggleGlobalReminders = () => {
    const next = !remindersGlobalEnabled;
    setRemindersGlobalEnabled(next);
    localStorage.setItem('dontforget_global_reminders', String(next));
  };

  const handleTimezoneChange = (tz: string) => {
    setUserTimezone(tz);
    localStorage.setItem('dontforget_timezone', tz);
  };

  const handleSendTestEmail = async () => {
    if (!user?.email) return;
    setSendingTestEmail(true);
    setTestEmailResult(null);

    const webhookUrl = (import.meta.env.VITE_NOTIFICATION_WEBHOOK_URL as string) || undefined;
    const session = isSupabaseConfigured ? (await supabase.auth.getSession()).data.session : null;
    const res = await ReminderScheduler.sendTestEmail(
      user.email,
      user.name || 'User',
      webhookUrl,
      session?.access_token
    );

    setSendingTestEmail(false);
    setTestEmailResult(res);
    setDispatchHistory(ReminderScheduler.getEmailDispatchHistory());
  };

  // Upcoming scheduled reminders
  const scheduledReminders = memories
    .filter(m => m.due_date && !m.is_completed && !m.is_archived && m.reminder_enabled !== false)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Profile & Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure notification preferences, timezones, email dispatch, and check active database status.
        </p>
      </div>

      {/* Account Profile Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" />
          <span>Profile Details</span>
        </h2>
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'}
            alt="Profile"
            className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
          />
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{user?.name || 'Explorer'}</h3>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              Active Authenticated Session
            </span>
          </div>
        </div>
      </div>

      {/* Notification Preferences & Email Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-rose-500" />
          <span>Real Scheduled Reminders & Email Delivery</span>
        </h2>

        {/* Global Reminders Master Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Global Scheduler Engine
            </p>
            <p className="text-[11px] text-slate-500">
              Automatic background evaluation of due tasks, library return dates, and deadlines.
            </p>
          </div>
          <button
            onClick={handleToggleGlobalReminders}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              remindersGlobalEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
            }`}
          >
            {remindersGlobalEnabled ? 'Active' : 'Paused'}
          </button>
        </div>

        {/* Real Email Reminders to Registered Address */}
        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Scheduled Email Reminders (Resend Integration)</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dispatches an HTML reminder directly to: <strong className="text-indigo-600 font-mono">{user?.email}</strong>
              </p>
            </div>
            <button
              onClick={handleToggleEmailAlerts}
              className={`px-3 py-1 text-xs font-bold rounded-lg ${
                emailAlertsEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
              }`}
            >
              {emailAlertsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Test Email Button */}
          <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              Test your email dispatch configuration right now:
            </span>
            <button
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail || !user?.email}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              {sendingTestEmail ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Test Email to {user?.email?.split('@')[0]}</span>
            </button>
          </div>

          {testEmailResult && (
            <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              testEmailResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {testEmailResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{testEmailResult.message}</span>
            </div>
          )}
        </div>

        {/* Browser Push Notifications */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-500" />
              <span>Browser Desktop Notifications</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Permission Status: <strong className="capitalize">{notificationPermission}</strong>
            </p>
          </div>

          <button
            onClick={requestBrowserNotifications}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
          >
            {notificationPermission === 'granted' ? 'Send Test Alert' : 'Enable Notifications'}
          </button>
        </div>

        {/* Timezone Preference Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span>Timezone Configuration</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Current timezone used for scheduled date parsing and alerts.
            </p>
          </div>

          <select
            value={userTimezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
            <option value="UTC">UTC (GMT +0:00)</option>
            <option value="America/New_York">America/New_York (EST/EDT)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
          </select>
        </div>

        {notificationMessage && (
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            {notificationMessage}
          </div>
        )}
      </div>

      {/* Email Dispatch History Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-500" />
          <span>Email Delivery & Dispatch History ({dispatchHistory.length})</span>
        </h2>

        {dispatchHistory.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No reminder emails dispatched yet.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {dispatchHistory.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <p className="text-[11px] text-slate-500">
                    To: {item.recipient_email} • At: {new Date(item.dispatched_at).toLocaleTimeString()}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {item.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Active & Upcoming Reminders */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Active Scheduled Reminders ({scheduledReminders.length})</span>
        </h2>
        
        {scheduledReminders.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No pending reminders scheduled.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {scheduledReminders.map(item => (
              <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                  <p className="text-[11px] text-slate-500">
                    Category: <span className="capitalize">{item.category}</span> • Due: {new Date(item.due_date!).toLocaleString()}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Scheduled
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span>Appearance & Theme</span>
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
              theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span>Light</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
              theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all ${
              theme === 'system'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <Laptop className="w-5 h-5 text-slate-500" />
            <span>System Default</span>
          </button>
        </div>
      </div>

      {/* Database & Integrations Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          <span>System & Analytics Status</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Database Engine</p>
              <p className="text-slate-500 text-[11px]">
                {isSupabaseConfigured ? 'Connected to Supabase PostgreSQL' : 'Local Persistence Vault (Offline-first active)'}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
              isSupabaseConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isSupabaseConfigured ? 'Supabase RLS' : 'Local DB'}
            </span>
          </div>

          {dbError && (
            <p className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed break-words">
              Database error: {dbError}
            </p>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Google Analytics 4 (GA4)</p>
              <p className="text-slate-500 text-[11px]">
                Measurement ID: {import.meta.env.VITE_GA_MEASUREMENT_ID || 'Not set'}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
              isGAConfigured() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {isGAConfigured() ? 'Active Stream' : 'Dev Mock Mode'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
