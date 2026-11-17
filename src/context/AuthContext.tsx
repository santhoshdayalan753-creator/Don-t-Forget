import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** True when the user arrived through a password-recovery email link. */
  recoveryMode: boolean;
  login: (email: string, password?: string) => Promise<{ error?: string }>;
  signup: (email: string, password?: string, name?: string) => Promise<{ error?: string; confirmationRequired?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; success?: boolean }>;
  updatePassword: (password: string) => Promise<{ error?: string; success?: boolean }>;
  resendConfirmation: (email: string) => Promise<{ error?: string; success?: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'dontforget_auth_user';

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');

const mapUser = (authUser: SupabaseUser): User => ({
  id: authUser.id,
  email: authUser.email || '',
  name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
  avatar: authUser.user_metadata?.avatar_url,
});

const translateAuthError = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address first — check your inbox for the confirmation link.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Email rate limit reached (Supabase allows only a few emails per hour on the default SMTP). Configure custom SMTP in Supabase → Authentication → Emails, or retry later.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password is too weak — use at least 6 characters.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Cannot reach Supabase. Check your internet connection and the project URL.';
  }
  return message;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      let cancelled = false;

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (cancelled) return;
          setUser(session?.user ? mapUser(session.user) : null);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setUser(null);
          setLoading(false);
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
        if (event === 'SIGNED_OUT') setRecoveryMode(false);
        setUser(session?.user ? mapUser(session.user) : null);
        setLoading(false);
      });

      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    }

    // Offline / unconfigured mode (development only)
    const savedUser = localStorage.getItem(LOCAL_USER_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    if (isSupabaseConfigured) {
      if (!password) {
        return { error: 'Password is required.' };
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: translateAuthError(error.message) };
      if (data.user) trackEvent('login', { method: 'supabase' });
      return {};
    }

    const localUser: User = {
      id: 'user_' + btoa(email).slice(0, 10),
      email,
      name: email.split('@')[0],
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    };
    setUser(localUser);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
    trackEvent('login', { method: 'local' });
    return {};
  };

  const signup = async (email: string, password?: string, name?: string) => {
    if (isSupabaseConfigured) {
      if (!password) return { error: 'Password is required.' };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name || email.split('@')[0] },
          emailRedirectTo: `${origin()}/auth/callback`,
        },
      });

      if (error) return { error: translateAuthError(error.message) };

      // Confirmation email enabled -> no session until the link is clicked
      if (data.user && !data.session) {
        trackEvent('sign_up', { method: 'supabase_confirmation_pending' });
        return { confirmationRequired: true };
      }

      if (data.user) trackEvent('sign_up', { method: 'supabase' });
      return {};
    }

    const localUser: User = {
      id: 'user_' + btoa(email).slice(0, 10),
      email,
      name: name || email.split('@')[0],
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    };
    setUser(localUser);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
    trackEvent('sign_up', { method: 'local' });
    return {};
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setRecoveryMode(false);
    localStorage.removeItem(LOCAL_USER_KEY);
  };

  const resetPassword = async (email: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin()}/reset-password`,
      });
      if (error) return { error: translateAuthError(error.message) };
      return { success: true };
    }
    return { success: true };
  };

  const updatePassword = async (password: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: translateAuthError(error.message) };
      setRecoveryMode(false);
      return { success: true };
    }
    return { success: true };
  };

  const resendConfirmation = async (email: string) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${origin()}/auth/callback` },
      });
      if (error) return { error: translateAuthError(error.message) };
      return { success: true };
    }
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        recoveryMode,
        login,
        signup,
        logout,
        resetPassword,
        updatePassword,
        resendConfirmation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
