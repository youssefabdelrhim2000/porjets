import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, Loader2, X, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { ICON_MAP, NOTEBOOK_COLORS } from '@/lib/constants';
import api from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────
interface EntryPreview {
  id: string;
  preview: string;
}

interface NotebookMatch {
  notebook_id: string;
  notebook_name: string;
  notebook_icon: string;
  notebook_color: string;
  match_count: number;
  entries: EntryPreview[];
}

interface GlobalSearchProps {
  onOpenNotebook: (notebookId: string, entryId?: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const GlobalSearch: React.FC<GlobalSearchProps> = ({ onOpenNotebook }) => {
  const [query, setQuery]       = useState('');
  const [isOpen, setIsOpen]     = useState(false);
  // 700ms: بيقلل الـ requests كتير — بيبعت request بس لو المستخدم وقف الكتابة 700ms
  const debouncedQuery          = useDebounce(query, 700);
  const containerRef            = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // الـ dropdown بيظهر بس لما debouncedQuery يتحدث (المستخدم وقف الكتابة)
  // مش لما query يتغير — ده بيمنع الـ flicker
  const [dropdownReady, setDropdownReady] = useState(false);
  useEffect(() => {
    setDropdownReady(debouncedQuery.length >= 2);
  }, [debouncedQuery]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: ['global_search', debouncedQuery],
    queryFn: async ({ signal }) => {
      const res = await api.get('/search/global', {
        params: { q: debouncedQuery },
        signal,
      });
      return (res.data.data ?? []) as NotebookMatch[];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60,
    gcTime:    1000 * 60 * 5,
  });

  const results: NotebookMatch[] = data ?? [];

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = useCallback((notebookId: string, entryId?: string) => {
    onOpenNotebook(notebookId, entryId);
    setIsOpen(false);
    setQuery('');
  }, [onOpenNotebook]);

  // الـ dropdown يظهر فقط لو:
  // 1. المستخدم كتب وما أغلقهاش (isOpen)
  // 2. الـ debounce خلص (dropdownReady) — مش كل حرف
  const showDropdown  = isOpen && dropdownReady;
  const isTyping      = query !== debouncedQuery;           // المستخدم لسه بيكتب
  const showNoResults = showDropdown && !isFetching && !isTyping && results.length === 0;

  // ── Color helper ─────────────────────────────────────────────────────────
  const getColorBorder = (colorValue: string) => {
    const found = NOTEBOOK_COLORS.find(c => c.value === colorValue);
    return found?.class ?? NOTEBOOK_COLORS[0].class;
  };

  // ── Highlight helper ─────────────────────────────────────────────────────
  const highlight = (text: string, q: string) => {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/30 text-foreground rounded-sm px-0.5 not-italic">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl" dir="rtl">
      {/* ── Input ── */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="بحث شامل في جميع السجلات..."
          className="pr-11 pl-10 h-11 bg-card/60 border-border/50 text-right placeholder:text-muted-foreground/60 focus-visible:ring-primary/40"
        />
        {/* Loading spinner — يظهر بس لما الـ debounce خلص وبيعمل request */}
        {isFetching && !isTyping && (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
        {/* Clear button */}
        {!isFetching && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div
          className="absolute z-50 top-full mt-2 w-full bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ maxHeight: '420px', overflowY: 'auto' }}
        >
          {/* Still typing / waiting */}
          {isTyping && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-sm">جاري الكتابة...</p>
            </div>
          )}

          {/* Searching */}
          {!isTyping && isFetching && (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-sm">جاري البحث...</p>
            </div>
          )}

          {/* No results */}
          {showNoResults && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <BookOpen className="w-8 h-8 opacity-30" />
              <p className="text-sm">لا توجد نتائج لـ «{debouncedQuery}»</p>
            </div>
          )}

          {/* Results header */}
          {results.length > 0 && (
            <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                وُجد في <span className="font-bold text-foreground">{results.length}</span> دفتر
              </span>
              <span className="text-xs text-muted-foreground">
                نتائج «{debouncedQuery}»
              </span>
            </div>
          )}

          {/* Notebook cards */}
          {results.map((match) => {
            const IconComponent =
              ICON_MAP[match.notebook_icon as keyof typeof ICON_MAP] ?? BookOpen;
            const colorClass = getColorBorder(match.notebook_color);

            return (
                <div key={match.notebook_id} className="border-b border-border/20 last:border-0">
                  {/* زرار الدفتر */}
                  <button
                    type="button"
                    onClick={() => handleSelect(match.notebook_id)}
                    className="w-full text-right px-4 py-3 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center border mt-0.5`}>
                        <IconComponent className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {match.notebook_name}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {match.match_count} سجل
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
              
                  {/* السجلات المحددة */}
                  {match.entries.filter(e => e.preview).slice(0, 2).map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelect(match.notebook_id, entry.id)}
                      className="w-full text-right px-4 py-2 pr-16 hover:bg-primary/10 transition-colors border-t border-border/10"
                    >
                      <p className="text-xs text-muted-foreground truncate">
                        ← {highlight(entry.preview, debouncedQuery)}
                      </p>
                    </button>
                  ))}
                </div>
              );              
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
