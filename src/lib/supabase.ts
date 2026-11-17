import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isPlaceholderValue = (value: string) =>
  !value || /placeholder|your-project|your-anon-key|example\.com/i.test(value);

/**
 * Human readable reason why Supabase is unusable, or null when it is fine.
 * Surfaced in Settings so a misconfigured deployment is obvious instead of
 * silently falling back to localStorage.
 */
export const supabaseConfigError: string | null = (() => {
  if (isPlaceholderValue(rawUrl)) {
    return 'VITE_SUPABASE_URL is missing or still a placeholder.';
  }
  if (isPlaceholderValue(rawKey)) {
    return 'VITE_SUPABASE_ANON_KEY is missing or still a placeholder.';
  }
  if (!/^https?:\/\/[^/\s]+$/i.test(rawUrl)) {
    return `VITE_SUPABASE_URL is not a valid URL ("${rawUrl}").`;
  }
  if (rawKey.length < 20) {
    return 'VITE_SUPABASE_ANON_KEY looks truncated (expected the anon/publishable key from Project Settings → API).';
  }
  return null;
})();

/** True only when a real project URL + key are present in the build. */
export const isSupabaseConfigured = supabaseConfigError === null;

export const supabaseProjectUrl = isSupabaseConfigured ? rawUrl : '';

export const supabase = createClient(
  isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? rawKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'dontforget-auth-token',
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
    global: {
      headers: { 'x-application-name': 'dont-forget' },
    },
  }
);

/** Convenience helper used by the reminder scheduler when calling Edge Functions. */
export const supabaseAnonKey = isSupabaseConfigured ? rawKey : '';
