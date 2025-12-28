/**
 * Utility functions for hashtag extraction and processing.
 */

/**
 * Extract hashtags from text.
 * 
 * Hashtags are words prefixed with '#' that contain only alphanumeric characters
 * and underscores. Minimum length is 1 character after the '#'.
 * 
 * @param text The text to extract hashtags from
 * @returns A list of unique hashtag names (without the '#' prefix), in lowercase
 */
export function extractHashtags(text: string): string[] {
  // Pattern: # followed by one or more alphanumeric characters or underscores
  const pattern = /#([a-zA-Z0-9_]+)/g;
  const matches: RegExpMatchArray[] = [];
  let match: RegExpMatchArray | null;
  
  // Collect all matches
  while ((match = pattern.exec(text)) !== null) {
    matches.push(match);
  }

  // Convert to lowercase and remove duplicates while preserving order
  const seen = new Set<string>();
  const uniqueHashtags: string[] = [];

  for (const m of matches) {
    const tag = m[1].toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      uniqueHashtags.push(tag);
    }
  }

  return uniqueHashtags;
}

/**
 * Highlight hashtags in text by wrapping them in a span with a class.
 * 
 * @param text The text to highlight hashtags in
 * @returns HTML string with hashtags wrapped in spans
 */
export function highlightHashtags(text: string): string {
  // Pattern: # followed by one or more alphanumeric characters or underscores
  const pattern = /#([a-zA-Z0-9_]+)/g;
  return text.replace(pattern, '<span class="hashtag">#$1</span>');
}

