import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  Check, 
  Clock, 
  ShoppingBag, 
  BookOpen, 
  Gift, 
  MapPin, 
  Link as LinkIcon, 
  Lightbulb, 
  Bell, 
  BellOff,
  CheckSquare,
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { parseNaturalLanguageInput } from '../lib/nlpParser';
import { useMemories } from '../context/MemoryContext';
import { MemoryCategory, PriorityLevel } from '../types';

interface QuickSaveBarProps {
  onSaved?: () => void;
  defaultCategory?: MemoryCategory;
  compact?: boolean;
}

export const CATEGORIES: { id: MemoryCategory; label: string; icon: any; color: string }[] = [
  { id: 'task', label: 'Tasks', icon: CheckSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
  { id: 'reminder', label: 'Dates & Reminders', icon: Bell, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
  { id: 'book', label: 'Library Books', icon: BookOpen, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' },
  { id: 'gift', label: 'Gift Ideas', icon: Gift, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
  { id: 'place', label: 'Places to Visit', icon: MapPin, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40' },
  { id: 'link', label: 'Saved Links', icon: LinkIcon, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' },
  { id: 'idea', label: 'Ideas & Thoughts', icon: Lightbulb, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
  { id: 'general', label: 'General Note', icon: FileText, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800' },
];

export const QuickSaveBar: React.FC<QuickSaveBarProps> = ({ onSaved, defaultCategory, compact = false }) => {
  const { addMemory } = useMemories();
  const [input, setInput] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>(defaultCategory || 'general');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  
  // Natural Language Date Detection & Confirmation state
  const [detectedDate, setDetectedDate] = useState<Date | null>(null);
  const [dateConfidence, setDateConfidence] = useState<'high' | 'medium' | 'low'>('low');
  const [dateConfirmed, setDateConfirmed] = useState<boolean>(false);

  const [isExpanded, setIsExpanded] = useState(!compact);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic details
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookLibrary, setBookLibrary] = useState('');
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftBudget, setGiftBudget] = useState('');
  const [placeLocation, setPlaceLocation] = useState('');

  // Notification permission request helper
  const [browserNotifStatus, setBrowserNotifStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const handleRequestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('Your browser does not support web notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserNotifStatus(permission);
    if (permission === 'granted') {
      new Notification("Don't Forget Active", {
        body: 'Notifications are enabled! You will be alerted when items are due.',
        icon: '/vite.svg',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.trim().length > 3) {
      const parsed = parseNaturalLanguageInput(val);
      if (!defaultCategory && parsed.category !== 'general') {
        setSelectedCategory(parsed.category);
      }
      if (parsed.detectedDate) {
        setDetectedDate(parsed.detectedDate);
        setDateConfidence(parsed.dateConfidence || 'medium');
        // High confidence auto-applies, medium/low waits or displays confirmation
        if (parsed.dateConfidence === 'high') {
          setDateConfirmed(true);
          setDueDate(formatDateTimeLocal(parsed.detectedDate));
        } else {
          setDateConfirmed(false);
        }
      } else {
        setDetectedDate(null);
        setDateConfirmed(false);
      }
      if (parsed.metadata?.recipient) {
        setGiftRecipient(parsed.metadata.recipient);
      }
    } else {
      setDetectedDate(null);
      setDateConfirmed(false);
    }
  };

  const formatDateTimeLocal = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const confirmDetectedDate = () => {
    if (detectedDate) {
      setDueDate(formatDateTimeLocal(detectedDate));
      setDateConfirmed(true);
    }
  };

  const dismissDetectedDate = () => {
    setDetectedDate(null);
    setDateConfirmed(false);
    setDueDate('');
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || saving) return;

    setSaving(true);
    setFeedback(null);

    try {
      const metadata: Record<string, any> = {};

      if (selectedCategory === 'book') {
        if (bookAuthor) metadata.author = bookAuthor;
        if (bookLibrary) metadata.libraryName = bookLibrary;
        metadata.returned = false;
      } else if (selectedCategory === 'gift') {
        if (giftRecipient) metadata.recipient = giftRecipient;
        if (giftBudget) metadata.budget = giftBudget;
        metadata.purchased = false;
      } else if (selectedCategory === 'place') {
        if (placeLocation) metadata.location = placeLocation;
        metadata.visited = false;
      } else if (selectedCategory === 'link') {
        const urlMatch = input.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
        if (urlMatch) {
          metadata.url = urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`;
        }
      }

      // If user left ambiguous date unconfirmed, ask or ignore safely without inventing
      let finalDueDate: string | null = null;
      if (dueDate) {
        finalDueDate = new Date(dueDate).toISOString();
      } else if (detectedDate && dateConfirmed) {
        finalDueDate = detectedDate.toISOString();
      }

      await addMemory({
        title: input.trim(),
        content: content.trim() || undefined,
        category: selectedCategory,
        is_favorite: false,
        is_archived: false,
        is_completed: false,
        due_date: finalDueDate,
        reminder_enabled: reminderEnabled && Boolean(finalDueDate),
        priority,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      // Reset form states
      setInput('');
      setContent('');
      setDueDate('');
      setDetectedDate(null);
      setDateConfirmed(false);
      setBookAuthor('');
      setBookLibrary('');
      setGiftRecipient('');
      setGiftBudget('');
      setPlaceLocation('');
      
      setFeedback({ type: 'success', text: 'Saved successfully to database!' });
      setTimeout(() => setFeedback(null), 3500);
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err?.message || 'Error saving item. Please check connection.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
      <form onSubmit={handleQuickSubmit} className="space-y-4">
        {/* Main Quick Input */}
        <div className="relative flex items-center">
          <div className="absolute left-4 text-indigo-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder='Capture anything... (e.g. "Buy milk tomorrow", "Return my library book on Nov 5", "Call friend at 6 PM", "Pay electricity bill next Monday")'
            className="w-full pl-12 pr-28 py-3.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:text-base font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || saving}
            className="absolute right-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>

        {/* Natural Language Date Confirmation Notice */}
        {detectedDate && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-200 p-3 rounded-xl gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Detected Date: <strong>{detectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                {!dateConfirmed && dateConfidence !== 'high' && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">(Please confirm this date)</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {!dateConfirmed ? (
                <button
                  type="button"
                  onClick={confirmDetectedDate}
                  className="px-2.5 py-1 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                >
                  Confirm Date
                </button>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Date Active
                </span>
              )}
              <button
                type="button"
                onClick={dismissDetectedDate}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Category Pills & Notification Request Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 font-semibold whitespace-nowrap mr-1">Category:</span>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : ''}`} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {browserNotifStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Browser Alerts</span>
            </button>
          )}
        </div>

        {/* Controls footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            <span>{isExpanded ? '− Collapse details' : '+ Add notes, reminder & custom fields'}</span>
          </button>
          
          {feedback && (
            <span className={`text-xs font-semibold flex items-center gap-1.5 animate-fade-in ${
              feedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {feedback.text}
            </span>
          )}
        </div>

        {/* Expanded Controls Panel */}
        {isExpanded && (
          <div className="space-y-3 pt-2 text-xs">
            {/* Notes / Description */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add optional notes, context, or reference numbers..."
              rows={2}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Reminder or Due Date */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (e.target.value) setDateConfirmed(true);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Reminder Enable/Disable Switch */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold flex items-center gap-1">
                  {reminderEnabled ? <Bell className="w-3.5 h-3.5 text-amber-500" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
                  Reminder Alert
                </label>
                <button
                  type="button"
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`w-full p-2 rounded-lg border text-left font-medium transition-all flex items-center justify-between ${
                    reminderEnabled
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <span>{reminderEnabled ? '🔔 Alert Enabled' : '🔕 Alert Disabled'}</span>
                  <span className="text-[10px] underline">{reminderEnabled ? 'Turn Off' : 'Turn On'}</span>
                </button>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Category-specific specialized inputs */}
              {selectedCategory === 'book' && (
                <>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Author</label>
                    <input
                      type="text"
                      placeholder="e.g. James Clear"
                      value={bookAuthor}
                      onChange={(e) => setBookAuthor(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Library Name</label>
                    <input
                      type="text"
                      placeholder="e.g. City Public Library"
                      value={bookLibrary}
                      onChange={(e) => setBookLibrary(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </>
              )}

              {selectedCategory === 'gift' && (
                <>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Recipient</label>
                    <input
                      type="text"
                      placeholder="e.g. Maya, Mom, Friend"
                      value={giftRecipient}
                      onChange={(e) => setGiftRecipient(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Budget</label>
                    <input
                      type="text"
                      placeholder="e.g. $50"
                      value={giftBudget}
                      onChange={(e) => setGiftBudget(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </>
              )}

              {selectedCategory === 'place' && (
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Marina Beach, San Francisco"
                    value={placeLocation}
                    onChange={(e) => setPlaceLocation(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
