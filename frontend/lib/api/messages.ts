/**
 * Messages API client for direct messaging between users
 */

import { apiClient } from './client';

export interface MessageSender {
  id: string;
  nickname: string;
  username: string | null;
  avatar_url: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender: MessageSender | null;
  is_read: boolean;
  read_at: string | null;
}

export interface ConversationParticipant {
  id: string;
  nickname: string;
  username: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  other_user: ConversationParticipant | null;
  last_message: Message | null;
  unread_count: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  skip: number;
  limit: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  skip: number;
  limit: number;
  conversation_id: string;
}

export interface CreateMessageData {
  recipient_id: string;
  content: string;
  image_url?: string | null;
}

export interface CreateConversationData {
  recipient_id: string;
}

export interface MarkReadRequest {
  message_ids?: string[] | null;
}

export interface MarkReadResponse {
  marked_count: number;
  message_ids: string[];
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(
  skip: number = 0,
  limit: number = 20
): Promise<ConversationListResponse> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const response = await apiClient.get<ConversationListResponse>(
    `/api/v1/messages/conversations?${params.toString()}`
  );
  return response.data;
}

/**
 * Get total unread message count across all conversations
 */
export async function getTotalUnreadCount(): Promise<number> {
  try {
    // Get all conversations (up to 100) to calculate total unread count
    let totalUnread = 0;
    let skip = 0;
    const limit = 100;

    while (true) {
      const response = await getConversations(skip, limit);
      
      // Sum up unread counts from all conversations
      totalUnread += response.conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

      // If we got fewer results than requested, we've reached the end
      if (response.conversations.length < limit) {
        break;
      }

      skip += limit;
    }

    return totalUnread;
  } catch (error) {
    console.error('Failed to get total unread count:', error);
    return 0;
  }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await apiClient.get<Conversation>(
    `/api/v1/messages/conversations/${conversationId}`
  );
  return response.data;
}

/**
 * Delete a conversation (soft delete)
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/api/v1/messages/conversations/${conversationId}`);
}

/**
 * Send a message to another user
 */
export async function sendMessage(data: CreateMessageData): Promise<Message> {
  console.log('[sendMessage] API call:', {
    url: '/api/v1/messages',
    data,
    baseURL: apiClient.defaults.baseURL,
  });
  
  try {
    const response = await apiClient.post<Message>('/api/v1/messages', data);
    console.log('[sendMessage] API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[sendMessage] API error:', error);
    throw error;
  }
}

/**
 * Get messages in a conversation
 */
export async function getMessages(
  conversationId: string,
  skip: number = 0,
  limit: number = 50
): Promise<MessageListResponse> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const response = await apiClient.get<MessageListResponse>(
    `/api/v1/messages/conversations/${conversationId}/messages?${params.toString()}`
  );
  return response.data;
}

/**
 * Mark messages as read in a conversation
 */
export async function markMessagesAsRead(
  conversationId: string,
  messageIds?: string[] | null
): Promise<MarkReadResponse> {
  const response = await apiClient.put<MarkReadResponse>(
    `/api/v1/messages/conversations/${conversationId}/read`,
    { message_ids: messageIds }
  );
  return response.data;
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/api/v1/messages/${messageId}`);
}

/**
 * Create a new conversation with a specific user
 * Returns the conversation (creates if doesn't exist)
 */
export async function createConversation(
  data: CreateConversationData
): Promise<Conversation> {
  const response = await apiClient.post<Conversation>(
    '/api/v1/messages/conversations',
    data
  );
  return response.data;
}

/**
 * Find or create a conversation with a specific user
 * Returns the conversation ID
 */
export async function findOrCreateConversation(recipientId: string): Promise<string> {
  // First, try to find existing conversation
  // Get all conversations (up to 100) to search for existing one
  let skip = 0;
  const limit = 100;
  let foundConversation: Conversation | undefined;

  // Search through conversations in batches
  while (true) {
    const conversationsResponse = await getConversations(skip, limit);
    foundConversation = conversationsResponse.conversations.find(
      (conv) => conv.other_user?.id === recipientId
    );

    if (foundConversation) {
      return foundConversation.id;
    }

    // If we got fewer results than requested, we've reached the end
    if (conversationsResponse.conversations.length < limit) {
      break;
    }

    skip += limit;
  }

  // If no conversation exists, create one using the create conversation endpoint
  const conversation = await createConversation({
    recipient_id: recipientId,
  });

  return conversation.id;
}


