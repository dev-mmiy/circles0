/**
 * Chat message utility functions
 * 
 * Common utilities for chat message display logic
 */

/**
 * Calculate whether to show avatar for a message
 * 
 * @param index - Current message index
 * @param prevSenderId - Previous message sender ID (or null if first message)
 * @param currentSenderId - Current message sender ID
 * @param hasImage - Whether current message has an image
 * @param alwaysShowAvatar - Whether to always show avatar (for direct messages)
 * @returns Whether to show avatar
 */
export function shouldShowAvatar(
  index: number,
  prevSenderId: string | null | undefined,
  currentSenderId: string,
  hasImage: boolean = false,
  alwaysShowAvatar: boolean = false
): boolean {
  // Always show avatar if explicitly requested (e.g., direct messages)
  if (alwaysShowAvatar) {
    return true;
  }

  // Show avatar if:
  // 1. First message
  // 2. Previous message is from different sender
  // 3. Current message has an image (always show avatar for images in group chats)
  return index === 0 || 
         prevSenderId !== currentSenderId ||
         hasImage;
}






