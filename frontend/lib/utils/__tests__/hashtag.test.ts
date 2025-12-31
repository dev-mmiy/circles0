/**
 * Tests for hashtag utility functions
 */

import { extractHashtags, highlightHashtags } from '../hashtag';

describe('hashtag utilities', () => {
  describe('extractHashtags', () => {
    it('should extract single hashtag', () => {
      const result = extractHashtags('Hello #world');
      expect(result).toEqual(['world']);
    });

    it('should extract multiple hashtags', () => {
      const result = extractHashtags('Hello #world and #test');
      expect(result).toEqual(['world', 'test']);
    });

    it('should handle hashtags at the start', () => {
      const result = extractHashtags('#start Hello');
      expect(result).toEqual(['start']);
    });

    it('should handle hashtags at the end', () => {
      const result = extractHashtags('Hello #end');
      expect(result).toEqual(['end']);
    });

    it('should handle consecutive hashtags', () => {
      const result = extractHashtags('#tag1 #tag2 #tag3');
      expect(result).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should convert to lowercase', () => {
      const result = extractHashtags('#Hello #WORLD #Test');
      expect(result).toEqual(['hello', 'world', 'test']);
    });

    it('should handle underscores', () => {
      const result = extractHashtags('#test_tag #another_tag');
      expect(result).toEqual(['test_tag', 'another_tag']);
    });

    it('should handle numbers', () => {
      const result = extractHashtags('#tag123 #456test');
      expect(result).toEqual(['tag123', '456test']);
    });

    it('should remove duplicates', () => {
      const result = extractHashtags('#test #hello #test #world');
      expect(result).toEqual(['test', 'hello', 'world']);
    });

    it('should handle empty string', () => {
      const result = extractHashtags('');
      expect(result).toEqual([]);
    });

    it('should handle text without hashtags', () => {
      const result = extractHashtags('Hello world');
      expect(result).toEqual([]);
    });

    it('should ignore invalid hashtags (special characters)', () => {
      // #test-tag extracts as 'test' (stops at '-')
      // #test@tag extracts as 'test' (stops at '@')
      // #test tag extracts as 'test' (stops at space)
      const result = extractHashtags('#test-tag #test@tag #test tag');
      expect(result).toEqual(['test']);
    });
  });

  describe('highlightHashtags', () => {
    it('should highlight single hashtag', () => {
      const result = highlightHashtags('Hello #world');
      expect(result).toBe('Hello <span class="hashtag">#world</span>');
    });

    it('should highlight multiple hashtags', () => {
      const result = highlightHashtags('Hello #world and #test');
      expect(result).toBe(
        'Hello <span class="hashtag">#world</span> and <span class="hashtag">#test</span>'
      );
    });

    it('should handle empty string', () => {
      const result = highlightHashtags('');
      expect(result).toBe('');
    });

    it('should handle text without hashtags', () => {
      const result = highlightHashtags('Hello world');
      expect(result).toBe('Hello world');
    });

    it('should preserve case', () => {
      const result = highlightHashtags('#Hello #WORLD');
      expect(result).toBe(
        '<span class="hashtag">#Hello</span> <span class="hashtag">#WORLD</span>'
      );
    });
  });
});
