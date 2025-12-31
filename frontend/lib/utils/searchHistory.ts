/**
 * Search History Utility
 * Manages search history in localStorage
 */

const MAX_HISTORY_ITEMS = 10;
const USER_SEARCH_HISTORY_KEY = 'user_search_history';
const DISEASE_SEARCH_HISTORY_KEY = 'disease_search_history';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  params?: Record<string, any>;
}

/**
 * Get search history from localStorage
 */
export function getSearchHistory(type: 'user' | 'disease'): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];

  const key = type === 'user' ? USER_SEARCH_HISTORY_KEY : DISEASE_SEARCH_HISTORY_KEY;
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const history = JSON.parse(stored) as SearchHistoryItem[];
    // Sort by timestamp (newest first) and limit to MAX_HISTORY_ITEMS
    return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_ITEMS);
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
}

/**
 * Add search query to history
 */
export function addToSearchHistory(
  type: 'user' | 'disease',
  query: string,
  params?: Record<string, any>
): void {
  if (typeof window === 'undefined') return;
  if (!query.trim()) return; // Don't save empty queries

  const key = type === 'user' ? USER_SEARCH_HISTORY_KEY : DISEASE_SEARCH_HISTORY_KEY;

  try {
    const existing = getSearchHistory(type);

    // Remove duplicate queries (keep the newest)
    const filtered = existing.filter(item => item.query !== query.trim());

    // Add new item at the beginning
    const newItem: SearchHistoryItem = {
      query: query.trim(),
      timestamp: Date.now(),
      params,
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

/**
 * Clear search history
 */
export function clearSearchHistory(type: 'user' | 'disease'): void {
  if (typeof window === 'undefined') return;

  const key = type === 'user' ? USER_SEARCH_HISTORY_KEY : DISEASE_SEARCH_HISTORY_KEY;
  localStorage.removeItem(key);
}

/**
 * Remove a specific item from search history
 */
export function removeFromSearchHistory(type: 'user' | 'disease', query: string): void {
  if (typeof window === 'undefined') return;

  const key = type === 'user' ? USER_SEARCH_HISTORY_KEY : DISEASE_SEARCH_HISTORY_KEY;

  try {
    const existing = getSearchHistory(type);
    const filtered = existing.filter(item => item.query !== query);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from search history:', error);
  }
}
