// ============================================
// useSearch Hook
// Debounced search functionality
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { UI } from '@/lib/constants';

export function useSearch<T>(
  items: T[],
  searchFn: (item: T, query: string) => boolean,
  debounceMs: number = UI.DEBOUNCE_DELAY
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  const filteredItems = items.filter(item => 
    !debouncedQuery.trim() || searchFn(item, debouncedQuery.toLowerCase())
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery,
    filteredItems,
    clearSearch,
    isSearching: query !== debouncedQuery,
  };
}
