/**
 * Google Analytics 4 (GA4) Integration Utility
 * Safe, privacy-friendly, and non-sensitive tracking.
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-0SHNQET22C';

export const isGAConfigured = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    Boolean(GA_MEASUREMENT_ID) &&
    GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX' &&
    GA_MEASUREMENT_ID.startsWith('G-')
  );
};

export const initGA = () => {
  if (typeof window === 'undefined') return;
  if (!isGAConfigured()) {
    console.info(
      '%c[GA4 Note]%c Measurement ID not configured or is placeholder. Analytics events will run in dev/safe mock mode.',
      'color: #6366f1; font-weight: bold',
      'color: inherit'
    );
    return;
  }

  // Ensure gtag and dataLayer exist
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
  }

  // Check if script is already present in document
  if (!document.getElementById('ga-script') && !document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false, // Managed manually on SPA route transitions
      anonymize_ip: true,
    });
  }
};

export const trackPageView = (path: string, title?: string) => {
  if (!isGAConfigured()) return;
  try {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: title || document.title,
      });
    }
  } catch (err) {
    console.error('GA4 Page View Error:', err);
  }
};

/**
 * Track custom events with non-sensitive metadata only
 * (NEVER send user email, titles, notes, personal data)
 */
export const trackEvent = (
  eventName:
    | 'sign_up'
    | 'login'
    | 'quick_save'
    | 'search_memories'
    | 'task_created'
    | 'task_completed'
    | 'reminder_created'
    | 'library_reminder_created'
    | 'shopping_item_completed'
    | 'saved_item_favourited'
    | 'item_archived'
    | 'theme_changed',
  params?: Record<string, string | number | boolean>
) => {
  if (!isGAConfigured()) return;
  try {
    if (window.gtag) {
      window.gtag('event', eventName, params);
    }
  } catch (err) {
    console.error(`GA4 Event Error (${eventName}):`, err);
  }
};
