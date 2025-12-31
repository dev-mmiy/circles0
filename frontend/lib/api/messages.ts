/**
 * Messages API client for direct messaging between users
 */

import { apiClient } from './client';
import { debugLog } from '@/lib/utils/debug';

export interface MessageSender {
  id: string;
  nickname: string;
  username: string | null;
  avatar_url: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
  user: MessageSender | null;
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
  reactions?: MessageReaction[] | null;
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

export interface CreateMessageReactionData {
  reaction_type: string;
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(
  skip: number = 0,
  limit: number = 20
): Promise<ConversationListResponse> {
  debugLog.log('[getConversations] API call:', {
    skip,
    limit,
    baseURL: apiClient.defaults.baseURL,
  });

  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const url = `/api/v1/messages/conversations?${params.toString()}`;

  try {
    const response = await apiClient.get<ConversationListResponse>(url);
    debugLog.log('[getConversations] API response:', {
      status: response.status,
      conversationsCount: response.data?.conversations?.length,
    });
    return response.data;
  } catch (error: any) {
    debugLog.error('[getConversations] API error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
    });
    throw error;
  }
}

/**
 * Get total unread message count across all conversations
 * Note: This is a simplified version that only checks the first page of conversations
 * to avoid timeout issues. For a production app, consider adding a dedicated API endpoint.
 */
export async function getTotalUnreadCount(): Promise<number> {
  try {
    // Only get the first page of conversations to avoid timeout
    // In production, this should be replaced with a dedicated API endpoint
    const response = await getConversations(0, 20);

    // Sum up unread counts from the first page only
    const totalUnread = response.conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

    return totalUnread;
  } catch (error) {
    debugLog.error('Failed to get total unread count:', error);
    // Return 0 on error to avoid breaking the UI
    return 0;
  }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  debugLog.log('[getConversation] API call:', {
    conversationId,
    baseURL: apiClient.defaults.baseURL,
  });

  const url = `/api/v1/messages/conversations/${conversationId}`;
  debugLog.log('[getConversation] Full URL:', `${apiClient.defaults.baseURL}${url}`);

  try {
    const response = await apiClient.get<Conversation>(url);
    debugLog.log('[getConversation] API response:', {
      status: response.status,
      data: response.data,
      hasData: !!response.data,
    });
    return response.data;
  } catch (error: any) {
    debugLog.error('[getConversation] API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
      request: error.request ? 'Request made but no response' : 'No request made',
    });
    throw error;
  }
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
  debugLog.log('[sendMessage] API call:', {
    url: '/api/v1/messages',
    data,
    baseURL: apiClient.defaults.baseURL,
  });

  try {
    const response = await apiClient.post<Message>('/api/v1/messages', data);
    debugLog.log('[sendMessage] API response:', response.data);
    return response.data;
  } catch (error) {
    debugLog.error('[sendMessage] API error:', error);
    throw error;
  }
}

/**
 * Get messages in a conversation
 */
export async function getMessages(
  conversationId: string,
  skip: number = 0,
  limit: number = 50,
  searchQuery?: string
): Promise<MessageListResponse> {
  debugLog.log('[getMessages] API call:', {
    conversationId,
    skip,
    limit,
    searchQuery,
    baseURL: apiClient.defaults.baseURL,
  });

  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  if (searchQuery) {
    params.append('q', searchQuery);
  }

  const url = `/api/v1/messages/conversations/${conversationId}/messages?${params.toString()}`;
  debugLog.log('[getMessages] Full URL:', `${apiClient.defaults.baseURL}${url}`);

  try {
    const response = await apiClient.get<MessageListResponse>(url);
    debugLog.log('[getMessages] API response:', {
      status: response.status,
      data: response.data,
      messagesCount: response.data?.messages?.length,
      hasMessages: !!response.data?.messages,
    });
    return response.data;
  } catch (error: any) {
    debugLog.error('[getMessages] API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
      request: error.request ? 'Request made but no response' : 'No request made',
    });
    throw error;
  }
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
export async function createConversation(data: CreateConversationData): Promise<Conversation> {
  const response = await apiClient.post<Conversation>('/api/v1/messages/conversations', data);
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
      conv => conv.other_user?.id === recipientId
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

/**
 * Add or update a reaction to a message
 */
export async function addMessageReaction(
  messageId: string,
  data: CreateMessageReactionData
): Promise<MessageReaction | null> {
  try {
    const response = await apiClient.post<MessageReaction>(
      `/api/v1/messages/${messageId}/reactions`,
      data
    );
    return response.data;
  } catch (error: any) {
    // 204 No Content means reaction was removed (toggle off)
    if (error.response?.status === 204) {
      return null;
    }
    // 422エラーの詳細をログに出力
    if (error.response?.status === 422) {
      debugLog.error('[addMessageReaction] Validation error:', {
        status: error.response.status,
        data: error.response.data,
        requestData: data,
      });
    }
    debugLog.error('[addMessageReaction] API error:', error);
    throw error;
  }
}

/**
 * Remove a reaction from a message
 */
export async function removeMessageReaction(messageId: string): Promise<void> {
  await apiClient.delete(`/api/v1/messages/${messageId}/reactions`);
}

/**
 * Get all reactions for a message
 */
export async function getMessageReactions(messageId: string): Promise<MessageReaction[]> {
  const response = await apiClient.get<MessageReaction[]>(
    `/api/v1/messages/${messageId}/reactions`
  );
  return response.data;
}
