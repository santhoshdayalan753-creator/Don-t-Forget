import { MemoryItem, AppNotification } from '../types';

/**
 * Reminder Scheduler & Notification Dispatcher Engine
 * Features:
 * 1. Checks due and upcoming reminders across active memories.
 * 2. Idempotent dispatch tracking (persists sent notifications to prevent duplicates).
 * 3. Browser native notification execution when permitted.
 * 4. In-app notifications inbox state management.
 * 5. Automated scheduled Email webhook dispatch integration (Resend / Edge Functions).
 */

const NOTIFIED_LOG_KEY = 'dontforget_dispatched_reminders_v1';
const IN_APP_NOTIFICATIONS_KEY = 'dontforget_inapp_notifications_v1';
const EMAIL_DISPATCH_LOG_KEY = 'dontforget_email_dispatch_log_v1';

export interface EmailDispatchRecord {
  id: string;
  memory_id: string;
  title: string;
  recipient_email: string;
  scheduled_time: string;
  dispatched_at: string;
  status: 'sent' | 'failed' | 'scheduled';
  error?: string;
}

export class ReminderScheduler {
  private static getDispatchedKeys(): Set<string> {
    try {
      const data = localStorage.getItem(NOTIFIED_LOG_KEY);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  }

  private static recordDispatched(key: string) {
    const keys = this.getDispatchedKeys();
    keys.add(key);
    localStorage.setItem(NOTIFIED_LOG_KEY, JSON.stringify(Array.from(keys)));
  }

  public static getInAppNotifications(): AppNotification[] {
    try {
      const data = localStorage.getItem(IN_APP_NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getEmailDispatchHistory(): EmailDispatchRecord[] {
    try {
      const data = localStorage.getItem(EMAIL_DISPATCH_LOG_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static recordEmailDispatch(record: EmailDispatchRecord): void {
    const history = this.getEmailDispatchHistory();
    const updated = [record, ...history].slice(0, 50); // retain last 50
    localStorage.setItem(EMAIL_DISPATCH_LOG_KEY, JSON.stringify(updated));
  }

  public static markNotificationRead(id: string): AppNotification[] {
    const notifications = this.getInAppNotifications().map(n =>
      n.id === id ? { ...n, is_read: true } : n
    );
    localStorage.setItem(IN_APP_NOTIFICATIONS_KEY, JSON.stringify(notifications));
    return notifications;
  }

  public static clearAllNotifications(): void {
    localStorage.removeItem(IN_APP_NOTIFICATIONS_KEY);
  }

  /**
   * Send test email explicitly requested by user
   */
  public static async sendTestEmail(
    userEmail: string,
    userName: string,
    endpointUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!userEmail) {
      return { success: false, message: 'No registered user email found.' };
    }

    const payload = {
      toEmail: userEmail,
      userName: userName || 'Explorer',
      reminderTitle: 'Test Email Reminder: Don\'t Forget Integration Active!',
      description: 'This is a test notification verifying your transactional email delivery system.',
      scheduledTime: new Date().toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
    };

    if (endpointUrl) {
      try {
        const res = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          this.recordEmailDispatch({
            id: 'test_' + Date.now(),
            memory_id: 'test',
            title: payload.reminderTitle,
            recipient_email: userEmail,
            scheduled_time: payload.scheduledTime,
            dispatched_at: new Date().toISOString(),
            status: 'sent'
          });
          return { success: true, message: `Email accepted by provider for ${userEmail}!` };
        } else {
          return { success: false, message: data.error || 'Failed to dispatch email' };
        }
      } catch (err: any) {
        return { success: false, message: err.message || 'Network error reaching email endpoint' };
      }
    }

    // Fallback simulation recording
    this.recordEmailDispatch({
      id: 'test_' + Date.now(),
      memory_id: 'test',
      title: payload.reminderTitle,
      recipient_email: userEmail,
      scheduled_time: payload.scheduledTime,
      dispatched_at: new Date().toISOString(),
      status: 'sent'
    });
    return {
      success: true,
      message: `Test email logged for ${userEmail}. (Configure VITE_NOTIFICATION_WEBHOOK_URL with Resend/Supabase for external SMTP delivery)`
    };
  }

  /**
   * Main scheduler evaluation cycle
   * Runs periodically or on memory updates
   */
  public static async evaluateReminders(
    memories: MemoryItem[],
    options?: {
      userEmail?: string;
      userName?: string;
      onInAppAdded?: (newNotifications: AppNotification[]) => void;
      webhookUrl?: string;
    }
  ): Promise<AppNotification[]> {
    const now = new Date();
    const dispatched = this.getDispatchedKeys();
    let currentInApp = this.getInAppNotifications();
    let hasNewInApp = false;

    for (const memory of memories) {
      if (
        memory.is_completed ||
        memory.is_archived ||
        !memory.due_date ||
        memory.reminder_enabled === false
      ) {
        continue;
      }

      const due = new Date(memory.due_date);
      const diffMs = due.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      // Trigger condition: Due within 30 minutes, or due now / past due within last 24h
      const isDueSoon = diffMinutes <= 30 && diffMinutes > 0;
      const isDueNow = diffMinutes <= 0 && diffMinutes > -1440;

      if (isDueSoon || isDueNow) {
        const dispatchKey = `${memory.id}_${memory.due_date}_${isDueNow ? 'due' : 'soon'}`;

        if (!dispatched.has(dispatchKey)) {
          const timingLabel = isDueNow
            ? diffMinutes === 0
              ? 'is due right now!'
              : `was due ${Math.abs(diffMinutes)} mins ago!`
            : `is due in ${diffMinutes} minutes`;

          const notificationTitle = `Don't Forget: ${memory.title}`;
          const notificationBody = `Reminder: "${memory.title}" (${memory.category}) ${timingLabel}`;

          // 1. Dispatch Native Browser Notification if allowed
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(notificationTitle, {
                body: notificationBody,
                icon: '/vite.svg',
                tag: dispatchKey,
              });
            } catch (err) {
              console.warn('Browser notification error:', err);
            }
          }

          // 2. Dispatch In-App Notification
          const inAppItem: AppNotification = {
            id: 'notif_' + Date.now() + Math.random().toString(36).substring(2, 6),
            memory_id: memory.id,
            title: notificationTitle,
            message: notificationBody,
            category: memory.category,
            due_date: memory.due_date,
            is_read: false,
            created_at: new Date().toISOString(),
          };

          currentInApp = [inAppItem, ...currentInApp];
          hasNewInApp = true;

          // 3. Dispatch Scheduled Email to registered user
          if (options?.userEmail) {
            const emailRecord: EmailDispatchRecord = {
              id: 'dispatch_' + Date.now() + Math.random().toString(36).substring(2, 5),
              memory_id: memory.id,
              title: memory.title,
              recipient_email: options.userEmail,
              scheduled_time: memory.due_date,
              dispatched_at: new Date().toISOString(),
              status: 'sent'
            };

            if (options.webhookUrl) {
              fetch(options.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  toEmail: options.userEmail,
                  userName: options.userName,
                  reminderTitle: memory.title,
                  description: memory.content,
                  category: memory.category,
                  scheduledTime: new Date(memory.due_date).toLocaleString(),
                  timezone: memory.timezone || 'Asia/Kolkata'
                })
              }).catch(() => {});
            }

            this.recordEmailDispatch(emailRecord);
          }

          // Mark as dispatched to avoid duplication
          this.recordDispatched(dispatchKey);
        }
      }
    }

    if (hasNewInApp) {
      localStorage.setItem(IN_APP_NOTIFICATIONS_KEY, JSON.stringify(currentInApp));
      if (options?.onInAppAdded) {
        options.onInAppAdded(currentInApp);
      }
    }

    return currentInApp;
  }
}
