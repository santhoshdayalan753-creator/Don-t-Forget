import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bookmark, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Smartphone, 
  Layers, 
  Search, 
  Bell, 
  Zap, 
  ShoppingBag, 
  BookOpen,
  CheckCircle,
  Mail,
  Calendar,
  Lock,
  ChevronRight,
  Globe,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [modalContent, setModalContent] = useState<'terms' | 'privacy' | 'about' | 'contact' | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Bookmark className="w-5 h-5 fill-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">Don't Forget</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28 px-4 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Think It. Save It. Never Forget It.</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Capture anything important, save it securely, and receive reminders right on time.
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal">
            Save library return dates, grocery lists, tasks, doctor appointments, gift ideas, and spontaneous thoughts. Get email and browser alerts even when closed.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={user ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>{user ? "Open Your Dashboard" : "Get Started Free"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            {!user && (
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
              >
                Sign In to Your Vault
              </Link>
            )}
          </div>

          {/* Interactive Hero Preview Bar */}
          <div className="mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl max-w-2xl mx-auto text-left space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Instant Capture Preview</span>
              <span className="text-indigo-500 font-bold">Natural Language + Automated Email Alert</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                  “Return my library book on October 30 at 6 PM”
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Auto-categorized as <strong>Library Book</strong> • Scheduled for <strong>Oct 30, 6:00 PM (Asia/Kolkata)</strong>
                </span>
              </div>
              <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0 self-start sm:self-auto flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email Alert Set
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold">How Don't Forget Works</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Three simple steps to keep your life organized and stress-free.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Think It & Type Naturally</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Type what you want to remember — “Buy milk tomorrow”, “Pay electricity bill next Monday”, or “Call dentist at 4 PM”.
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Instant Safe Vaulting</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your entry is securely stored with user-isolated Row Level Security. Categorized and searchable in milliseconds.
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Scheduled Delivery</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive scheduled email reminders and browser alerts when due, even if you logged out or closed your computer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Engineered for Daily Peace of Mind</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Everything in one minimal, fast, and accessible space.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Reliable Email Reminders</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Server-side scheduling sends beautiful HTML email notifications via transactional email providers directly to your inbox.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Library Book Tracker</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Keep track of library branches, borrowed titles, return deadlines, and overdue alerts so you never pay late fees.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Checklist Shopping Lists</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Create separate supermarket, pharmacy, or DIY lists with quantities and strike them off effortlessly while shopping.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Instant Global Search</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Filter across categories, favorites, archives, and dates in milliseconds. Find any note when you need it.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Timezone Aware</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Configured with your exact local timezone (defaults to Asia/Kolkata for Indian users) so reminders arrive on the dot.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Private & Isolated Storage</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                PostgreSQL Row Level Security ensures only you have access to your private memories and reminders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 dark:text-slate-200">Don't Forget</span>
            <span>— “Think It. Save It. Never Forget It.”</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button onClick={() => setModalContent('about')} className="hover:text-indigo-600 hover:underline">
              About
            </button>
            <button onClick={() => setModalContent('terms')} className="hover:text-indigo-600 hover:underline">
              Terms of Service
            </button>
            <button onClick={() => setModalContent('privacy')} className="hover:text-indigo-600 hover:underline">
              Privacy Policy
            </button>
            <button onClick={() => setModalContent('contact')} className="hover:text-indigo-600 hover:underline">
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* Information Modals */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto text-xs sm:text-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold capitalize text-slate-900 dark:text-white">
                {modalContent === 'terms' && 'Terms of Service'}
                {modalContent === 'privacy' && 'Privacy Policy'}
                {modalContent === 'about' && 'About Don\'t Forget'}
                {modalContent === 'contact' && 'Contact Support'}
              </h3>
              <button
                onClick={() => setModalContent(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-slate-600 dark:text-slate-400 space-y-3 leading-relaxed">
              {modalContent === 'terms' && (
                <>
                  <p><strong>1. Acceptance of Terms:</strong> By using Don't Forget, you agree to store personal memories and reminders responsibly.</p>
                  <p><strong>2. User Accounts:</strong> You are responsible for safeguarding your login credentials. Each account is strictly private.</p>
                  <p><strong>3. Notifications:</strong> Email and in-app reminders are sent according to your scheduled preferences.</p>
                </>
              )}

              {modalContent === 'privacy' && (
                <>
                  <p><strong>1. Privacy First:</strong> Your memories, notes, and reminders belong exclusively to you. We do not sell or monetize personal content.</p>
                  <p><strong>2. Row Level Security:</strong> All records are secured using cryptographic authentication and database-level isolation.</p>
                  <p><strong>3. Analytics:</strong> Google Analytics 4 tracks non-sensitive product events only. Private reminder text is never sent.</p>
                </>
              )}

              {modalContent === 'about' && (
                <>
                  <p><strong>Don't Forget</strong> was built to solve the frustration of forgetting daily necessities, library return deadlines, and personal appointments.</p>
                  <p>With natural-language Instant Capture, automated scheduled reminders, and multi-category checklists, you think it once, save it safely, and never worry about forgetting again.</p>
                </>
              )}

              {modalContent === 'contact' && (
                <>
                  <p>Have questions, feature suggestions, or need help with your scheduled reminders?</p>
                  <p>Email our support team directly at: <strong className="text-indigo-600">support@dontforget.app</strong></p>
                  <p>We typically respond within 24 hours.</p>
                </>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalContent(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
