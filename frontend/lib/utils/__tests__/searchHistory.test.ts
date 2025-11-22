/**
 * Tests for search history utility functions
 */

import {
  addToSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeFromSearchHistory,
} from '../searchHistory';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('searchHistory utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getSearchHistory', () => {
    it('should return empty array when no history exists', () => {
      const result = getSearchHistory('user');
      expect(result).toEqual([]);
    });

    it('should return stored history', () => {
      const history = [
        { query: 'test', timestamp: Date.now() },
        { query: 'hello', timestamp: Date.now() - 1000 },
      ];
      localStorageMock.setItem('user_search_history', JSON.stringify(history));

      const result = getSearchHistory('user');
      expect(result.length).toBe(2);
    });

    it('should sort by timestamp (newest first)', () => {
      const now = Date.now();
      const history = [
        { query: 'old', timestamp: now - 2000 },
        { query: 'new', timestamp: now },
        { query: 'middle', timestamp: now - 1000 },
      ];
      localStorageMock.setItem('user_search_history', JSON.stringify(history));

      const result = getSearchHistory('user');
      expect(result[0].query).toBe('new');
      expect(result[1].query).toBe('middle');
      expect(result[2].query).toBe('old');
    });

    it('should limit to 10 items', () => {
      const history = Array.from({ length: 15 }, (_, i) => ({
        query: `test${i}`,
        timestamp: Date.now() - i * 1000,
      }));
      localStorageMock.setItem('user_search_history', JSON.stringify(history));

      const result = getSearchHistory('user');
      expect(result.length).toBe(10);
    });

    it('should handle disease search history', () => {
      const history = [{ query: 'diabetes', timestamp: Date.now() }];
      localStorageMock.setItem('disease_search_history', JSON.stringify(history));

      const result = getSearchHistory('disease');
      expect(result.length).toBe(1);
      expect(result[0].query).toBe('diabetes');
    });
  });

  describe('addToSearchHistory', () => {
    it('should add new search to history', () => {
      addToSearchHistory('user', 'test query');
      const result = getSearchHistory('user');
      expect(result.length).toBe(1);
      expect(result[0].query).toBe('test query');
    });

    it('should not add empty query', () => {
      addToSearchHistory('user', '');
      addToSearchHistory('user', '   ');
      const result = getSearchHistory('user');
      expect(result.length).toBe(0);
    });

    it('should remove duplicates and keep newest', () => {
      addToSearchHistory('user', 'test');
      addToSearchHistory('user', 'hello');
      addToSearchHistory('user', 'test'); // Duplicate

      const result = getSearchHistory('user');
      expect(result.length).toBe(2);
      expect(result[0].query).toBe('test'); // Newest duplicate
      expect(result[1].query).toBe('hello');
    });

    it('should limit to 10 items', () => {
      for (let i = 0; i < 15; i++) {
        addToSearchHistory('user', `query${i}`);
      }

      const result = getSearchHistory('user');
      expect(result.length).toBe(10);
    });

    it('should save params with query', () => {
      const params = { filter: 'active', sort: 'name' };
      addToSearchHistory('user', 'test', params);

      const result = getSearchHistory('user');
      expect(result[0].params).toEqual(params);
    });

    it('should trim query whitespace', () => {
      addToSearchHistory('user', '  test query  ');
      const result = getSearchHistory('user');
      expect(result[0].query).toBe('test query');
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear user search history', () => {
      addToSearchHistory('user', 'test');
      clearSearchHistory('user');
      const result = getSearchHistory('user');
      expect(result).toEqual([]);
    });

    it('should clear disease search history', () => {
      addToSearchHistory('disease', 'diabetes');
      clearSearchHistory('disease');
      const result = getSearchHistory('disease');
      expect(result).toEqual([]);
    });

    it('should not affect other history type', () => {
      addToSearchHistory('user', 'user query');
      addToSearchHistory('disease', 'disease query');
      clearSearchHistory('user');

      expect(getSearchHistory('user')).toEqual([]);
      expect(getSearchHistory('disease').length).toBe(1);
    });
  });

  describe('removeFromSearchHistory', () => {
    it('should remove specific item from history', () => {
      addToSearchHistory('user', 'test1');
      addToSearchHistory('user', 'test2');
      addToSearchHistory('user', 'test3');

      removeFromSearchHistory('user', 'test2');

      const result = getSearchHistory('user');
      expect(result.length).toBe(2);
      expect(result.find((item) => item.query === 'test2')).toBeUndefined();
    });

    it('should handle removing non-existent item', () => {
      addToSearchHistory('user', 'test');
      removeFromSearchHistory('user', 'nonexistent');

      const result = getSearchHistory('user');
      expect(result.length).toBe(1);
    });

    it('should handle empty history', () => {
      removeFromSearchHistory('user', 'test');
      const result = getSearchHistory('user');
      expect(result).toEqual([]);
    });
  });
});



