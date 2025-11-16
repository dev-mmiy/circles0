/**
 * Utilities for extracting mentions from text content.
 */

/**
 * Extract @mentions from text content.
 * 
 * Mentions are in the format @username or @nickname.
 * Usernames/nicknames can contain letters, numbers, underscores, and hyphens.
 * Minimum length: 1 character, maximum length: 50 characters.
 * 
 * @param content - The text content to extract mentions from
 * @returns List of mentioned usernames/nicknames (without @ symbol)
 * 
 * @example
 * extractMentions("Hello @john, how are you? @jane_doe")
 * // Returns: ['john', 'jane_doe']
 * 
 * @example
 * extractMentions("No mentions here")
 * // Returns: []
 */
export function extractMentions(content: string): string[] {
  // Pattern: @ followed by alphanumeric, underscore, or hyphen
  // Minimum 1 character, maximum 50 characters
  const pattern = /@([a-zA-Z0-9_-]{1,50})/g;
  
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  
  // Use exec in a loop to find all matches (for ES5 compatibility)
  while ((match = pattern.exec(content)) !== null) {
    matches.push(match[1]);
  }
  
  // Remove duplicates while preserving order (case-insensitive)
  const seen = new Set<string>();
  const uniqueMentions: string[] = [];
  
  for (const mention of matches) {
    const lowerMention = mention.toLowerCase();
    if (!seen.has(lowerMention)) {
      seen.add(lowerMention);
      uniqueMentions.push(mention);
    }
  }
  
  return uniqueMentions;
}

/**
 * Normalize a mention string.
 * 
 * Currently just converts to lowercase for consistency.
 * 
 * @param mention - The mention string to normalize
 * @returns Normalized mention string
 */
export function normalizeMention(mention: string): string {
  return mention.toLowerCase().trim();
}


