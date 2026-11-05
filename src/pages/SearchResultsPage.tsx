import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Inbox } from 'lucide-react';
import { useMemories } from '../context/MemoryContext';
import { MemoryCard } from '../components/MemoryCard';
import { trackEvent } from '../lib/analytics';

export const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { memories } = useMemories();
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (query) {
      trackEvent('search_memories', { query_length: query.length });
    }
  }, [query]);

  const results = memories.filter(item => {
    if (item.is_archived) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;

    const q = query.toLowerCase();
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchContent = item.content?.toLowerCase().includes(q);
    const matchCategory = item.category.toLowerCase().includes(q);
    const matchAuthor = item.metadata?.author?.toLowerCase().includes(q);
    const matchRecipient = item.metadata?.recipient?.toLowerCase().includes(q);
    const matchLocation = item.metadata?.location?.toLowerCase().includes(q);

    return matchTitle || matchContent || matchCategory || matchAuthor || matchRecipient || matchLocation;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-500" />
            <span>Search Results</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Showing results for “<strong className="text-slate-800 dark:text-slate-200">{query}</strong>”
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
          {results.length} found
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching memories found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            We couldn't find any memories matching your query. Check for typos or try searching a broader term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map(item => (
            <MemoryCard key={item.id} memory={item} />
          ))}
        </div>
      )}
    </div>
  );
};
