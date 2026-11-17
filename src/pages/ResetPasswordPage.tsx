import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Lock, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Landing page for the Supabase password-recovery email link.
 * Supabase puts the recovery token in the URL; supabase-js detects it and
 * creates a short-lived session, after which the user can set a new password.
 */
export const ResetPasswordPage: React.FC = () => {
  const { updatePassword, recoveryMode } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkState, setLinkState] = useState<'checking' | 'ready' | 'invalid'>('checking');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLinkState('ready');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setLinkState((prev) => (prev === 'checking' ? 'invalid' : prev));
    }, 6000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setLinkState(session ? 'ready' : 'invalid');
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // A recovery event can arrive slightly after the first session read
  useEffect(() => {
    if (recoveryMode) setLinkState('ready');
  }, [recoveryMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const res = await updatePassword(password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setSuccess(true);
    window.setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
            <Bookmark className="w-6 h-6 fill-current" />
            <span>Don't Forget</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Set a new password</h1>
          <p className="text-xs text-slate-500">Choose a new password for your account.</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Password updated. Redirecting to your dashboard…</span>
          </div>
        ) : linkState === 'checking' ? (
          <div className="py-8 flex flex-col items-center gap-3 text-xs text-slate-500">
            <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Verifying your reset link…</span>
          </div>
        ) : linkState === 'invalid' ? (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This reset link is invalid or has expired. Open the newest link from your email, or request a new one.
              </span>
            </div>
            <Link
              to="/login"
              className="w-full block py-2.5 text-center bg-indigo-600 text-white font-semibold rounded-xl"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Confirm new password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          Remembered it?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

/**
 * Landing page for email-confirmation links (`emailRedirectTo`).
 * Supabase establishes the session from the URL, then we forward the user in.
 */
export const AuthCallbackPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), 6000);
    return () => window.clearTimeout(timer);
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
          <Bookmark className="w-6 h-6 fill-current" />
          <span>Don't Forget</span>
        </Link>

        {timedOut && !user ? (
          <>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Link needs a fresh sign-in</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              This confirmation link has already been used, expired, or was opened in a different browser. Sign in to
              continue.
            </p>
            <Link
              to="/login"
              className="w-full block py-2.5 text-center bg-indigo-600 text-white font-semibold text-sm rounded-xl"
            >
              Go to Sign In
            </Link>
          </>
        ) : (
          <>
            <span className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Confirming your account…</p>
          </>
        )}
      </div>
    </div>
  );
};
