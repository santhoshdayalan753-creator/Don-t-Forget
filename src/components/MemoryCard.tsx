import React, { useState } from 'react';
import { 
  Star, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  Archive, 
  ExternalLink, 
  Edit3, 
  AlertTriangle,
  BookOpen,
  MapPin,
  Gift,
  MoreVertical,
  Check,
  Bell,
  BellOff,
  X
} from 'lucide-react';
import { MemoryItem } from '../types';
import { CATEGORIES } from './QuickSaveBar';
import { useMemories } from '../context/MemoryContext';

interface MemoryCardProps {
  memory: MemoryItem;
  onEdit?: (memory: MemoryItem) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit }) => {
  const { toggleFavorite, toggleComplete, toggleArchive, deleteMemory, updateMemory } = useMemories();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(memory.title);
  const [editContent, setEditContent] = useState(memory.content || '');
  const [editDueDate, setEditDueDate] = useState(
    memory.due_date ? new Date(memory.due_date).toISOString().slice(0, 16) : ''
  );
  const [editReminderEnabled, setEditReminderEnabled] = useState(memory.reminder_enabled !== false);

  const categoryInfo = CATEGORIES.find(c => c.id === memory.category) || CATEGORIES[CATEGORIES.length - 1];
  const Icon = categoryInfo.icon;

  const now = new Date();
  const dueDate = memory.due_date ? new Date(memory.due_date) : null;
  const isOverdue = dueDate && dueDate < now && !memory.is_completed;
  const isDueSoon = dueDate && !isOverdue && (dueDate.getTime() - now.getTime() < 86400000 * 2) && !memory.is_completed;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    await updateMemory(memory.id, {
      title: editTitle.trim(),
      content: editContent.trim() || undefined,
      due_date: editDueDate ? new Date(editDueDate).toISOString() : null,
      reminder_enabled: editReminderEnabled,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-indigo-600">Editing Memory</span>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          required
          className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none"
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Notes..."
          rows={2}
          className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs border border-slate-200 dark:border-slate-700 focus:outline-none"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-0.5">Date & Time</label>
            <input
              type="datetime-local"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-0.5">Reminder Alert</label>
            <button
              type="button"
              onClick={() => setEditReminderEnabled(!editReminderEnabled)}
              className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-left font-medium"
            >
              {editReminderEnabled ? '🔔 Alert Enabled' : '🔕 Alert Disabled'}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    );
  }

  return (
    <div 
      className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 md:p-5 transition-all shadow-sm hover:shadow-md ${
        memory.is_completed 
          ? 'border-slate-200 dark:border-slate-800/60 opacity-75' 
          : isOverdue 
            ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20' 
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Checkbox / Completion Toggle */}
        <button
          onClick={() => toggleComplete(memory.id)}
          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
          title={memory.is_completed ? "Mark incomplete" : "Mark completed"}
        >
          {memory.is_completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* Center Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {/* Category Badge */}
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${categoryInfo.color}`}>
              <Icon className="w-3 h-3" />
              {categoryInfo.label}
            </span>

            {/* Overdue/Due Soon Tag */}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-3 h-3" />
                Overdue
              </span>
            )}
            {isDueSoon && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                Due Soon
              </span>
            )}

            {/* Reminder Alert Badge */}
            {memory.reminder_enabled === false && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                <BellOff className="w-3 h-3" /> Silent
              </span>
            )}

            {/* Priority tag */}
            {memory.priority === 'urgent' && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded uppercase">
                Urgent
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`font-semibold text-slate-900 dark:text-slate-100 text-base leading-snug break-words ${
            memory.is_completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
          }`}>
            {memory.title}
          </h3>

          {/* Content / Notes */}
          {memory.content && (
            <p className="mt-1 text-slate-600 dark:text-slate-400 text-xs md:text-sm line-clamp-2 leading-relaxed">
              {memory.content}
            </p>
          )}

          {/* Specialized category metadata snippets */}
          {memory.category === 'book' && memory.metadata && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-lg">
              <BookOpen className="w-3.5 h-3.5" />
              {memory.metadata.author && <span>By <strong>{memory.metadata.author}</strong></span>}
              {memory.metadata.libraryName && <span>• {memory.metadata.libraryName}</span>}
              <button
                onClick={() => updateMemory(memory.id, { metadata: { ...memory.metadata, returned: !memory.metadata?.returned } })}
                className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  memory.metadata.returned ? 'bg-emerald-200 text-emerald-800' : 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300'
                }`}
              >
                {memory.metadata.returned ? 'Returned' : 'Mark as Returned'}
              </button>
            </div>
          )}

          {memory.category === 'gift' && memory.metadata && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/40 p-2 rounded-lg">
              <Gift className="w-3.5 h-3.5" />
              {memory.metadata.recipient && <span>For: <strong>{memory.metadata.recipient}</strong></span>}
              {memory.metadata.budget && <span>Budget: <strong>{memory.metadata.budget}</strong></span>}
            </div>
          )}

          {memory.category === 'place' && memory.metadata && (
            <div className="mt-2 flex items-center justify-between text-xs text-teal-700 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/40 p-2 rounded-lg">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{memory.metadata.location || 'Saved Location'}</span>
              </div>
              <button
                onClick={() => updateMemory(memory.id, { metadata: { ...memory.metadata, visited: !memory.metadata?.visited } })}
                className="text-xs underline font-medium"
              >
                {memory.metadata.visited ? 'Visited' : 'Mark Visited'}
              </button>
            </div>
          )}

          {memory.category === 'link' && memory.metadata?.url && (
            <div className="mt-2">
              <a
                href={memory.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline max-w-full truncate"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{memory.metadata.url}</span>
              </a>
            </div>
          )}

          {/* Due date footer */}
          {dueDate && (
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
              isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(dueDate)}</span>
              {memory.reminder_enabled !== false && (
                <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded font-semibold ml-1">
                  🔔 Scheduled
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions (Favorite + More Menu) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleFavorite(memory.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              memory.is_favorite 
                ? 'text-amber-500 fill-amber-500 hover:text-amber-600' 
                : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
            }`}
            title={memory.is_favorite ? "Remove favorite" : "Add to favorites"}
          >
            <Star className={`w-4 h-4 ${memory.is_favorite ? 'fill-current' : ''}`} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div 
                className="absolute right-0 top-8 z-20 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 text-xs animate-in fade-in"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => {
                    toggleArchive(memory.id);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{memory.is_archived ? 'Unarchive' : 'Archive'}</span>
                </button>

                {confirmDelete ? (
                  <button
                    onClick={() => {
                      deleteMemory(memory.id);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete?</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
