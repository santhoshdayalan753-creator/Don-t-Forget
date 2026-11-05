import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { 
  CheckSquare, 
  Bell, 
  Layers, 
  BookOpen, 
  Link as LinkIcon, 
  Lightbulb, 
  Gift, 
  MapPin, 
  Star, 
  Archive 
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MemoryProvider } from './context/MemoryContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { ShoppingPage } from './pages/ShoppingPage';
import { GenericMemoryView } from './pages/GenericMemoryView';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { SettingsPage } from './pages/SettingsPage';
import { initGA, trackPageView } from './lib/analytics';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Route Change Analytics Tracker
const RouteAnalyticsTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return null;
};

export const App: React.FC = () => {
  useEffect(() => {
    initGA();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <MemoryProvider>
          <BrowserRouter>
            <RouteAnalyticsTracker />
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected App Pages */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/all"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      pageTitle="All Memories"
                      pageDescription="Complete searchable repository of your saved notes, links, tasks, and memories."
                      icon={Layers}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      category="task"
                      pageTitle="Tasks"
                      pageDescription="Manage personal to-dos, priorities, deadlines, and project action items."
                      icon={CheckSquare}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reminders"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      category="reminder"
                      pageTitle="Dates & Reminders"
                      pageDescription="Never miss birthdays, appointments, recurring deadlines, or payments."
                      icon={Bell}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shopping"
                element={
                  <ProtectedRoute>
                    <ShoppingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/books"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      category="book"
                      pageTitle="Library Book Reminders"
                      pageDescription="Track borrowed books, library branches, and return due dates without late fees."
                      icon={BookOpen}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/links"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      category="link"
                      pageTitle="Saved Links"
                      pageDescription="Store helpful websites, articles, bookmarks, and reference tools."
                      icon={LinkIcon}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ideas"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      category="idea"
                      pageTitle="Ideas & Thoughts"
                      pageDescription="Capture spontaneous inspirations, brainstorming thoughts, and creative concepts."
                      icon={Lightbulb}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gifts"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      category="gift"
                      pageTitle="Gift Ideas"
                      pageDescription="Remember thoughtful gifts for family and friends with occasions and budgets."
                      icon={Gift}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/places"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      category="place"
                      pageTitle="Places to Visit"
                      pageDescription="Bucket lists of spots, trails, restaurants, and vacation destinations to visit."
                      icon={MapPin}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      filterOnlyFavorites={true}
                      pageTitle="Starred Favorites"
                      pageDescription="Quick access to all your pinned and most important memories."
                      icon={Star}
                      showQuickSave={false}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/archive"
                element={
                  <ProtectedRoute>
                    <GenericMemoryView
                      filterOnlyArchived={true}
                      pageTitle="Archived Memories"
                      pageDescription="Past or completed items safely preserved out of daily view."
                      icon={Archive}
                      showQuickSave={false}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MemoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
