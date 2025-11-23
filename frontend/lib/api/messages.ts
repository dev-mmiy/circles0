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
  console.log('[getConversations] API call:', {
    skip,
    limit,
    baseURL: apiClient.defaults.baseURL,
  });

  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const url = `/api/v1/messages/conversations?${params.toString()}`;
  const fullURL = `${apiClient.defaults.baseURL}${url}`;
  console.log('[getConversations] Full URL:', fullURL);
  console.log('[getConversations] About to call apiClient.get, timestamp:', new Date().toISOString());
  console.log('[getConversations] API client config:', {
    baseURL: apiClient.defaults.baseURL,
    timeout: apiClient.defaults.timeout,
    hasAuth: !!apiClient.defaults.headers.common['Authorization'],
  });

  try {
    console.log('[getConversations] Calling apiClient.get now...', { 
      timestamp: new Date().toISOString(),
      url,
      fullURL,
      hasAuth: !!apiClient.defaults.headers.common['Authorization'],
    });
    
    // Add a timeout wrapper to ensure we don't wait forever
    const requestStartTime = Date.now();
    console.log('[getConversations] Creating request promise...', { timestamp: new Date().toISOString() });
    
    // Create request promise - ensure axios actually sends the request
    console.log('[getConversations] About to call apiClient.get()...', {
      url,
      fullURL,
      timestamp: new Date().toISOString(),
    });
    
    const requestPromise = apiClient.get<ConversationListResponse>(url)
      .then((response) => {
        const elapsed = Date.now() - requestStartTime;
        console.log('[getConversations] Request promise resolved', { 
          elapsed, 
          status: response.status,
          hasData: !!response.data,
          timestamp: new Date().toISOString() 
        });
        return response;
      })
      .catch((error) => {
        const elapsed = Date.now() - requestStartTime;
        console.error('[getConversations] Request promise rejected', { 
          elapsed, 
          error: error.message,
          code: error.code,
          hasResponse: !!error.response,
          hasRequest: !!error.request,
          timestamp: new Date().toISOString() 
        });
        throw error;
      });
    
    console.log('[getConversations] Request promise created (axios.get() called)', {
      timestamp: new Date().toISOString(),
    });
    
    // Remove duplicate timeout wrapper - apiClient already has a 20s timeout
    // The Promise.race with timeoutPromise was causing conflicts with axios's own timeout
    // Let axios handle the timeout, which will throw ECONNABORTED error
    console.log('[getConversations] Awaiting apiClient.get response (axios handles timeout)...', { timestamp: new Date().toISOString() });
    const response = await requestPromise;
    const totalElapsed = Date.now() - requestStartTime;
    console.log('[getConversations] Promise race completed, got response', { totalElapsed, timestamp: new Date().toISOString() });
    const requestElapsed = Date.now() - requestStartTime;
    console.log('[getConversations] apiClient.get returned', { elapsed: requestElapsed, timestamp: new Date().toISOString() });
    console.log('[getConversations] API response:', {
      status: response.status,
      data: response.data,
      conversationsCount: response.data?.conversations?.length,
      hasConversations: !!response.data?.conversations,
    });
    return response.data;
  } catch (error: any) {
    console.error('[getConversations] API error:', {
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
    console.error('Failed to get total unread count:', error);
    // Return 0 on error to avoid breaking the UI
    return 0;
  }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  console.log('[getConversation] API call:', {
    conversationId,
    baseURL: apiClient.defaults.baseURL,
  });

  const url = `/api/v1/messages/conversations/${conversationId}`;
  console.log('[getConversation] Full URL:', `${apiClient.defaults.baseURL}${url}`);

  try {
    const response = await apiClient.get<Conversation>(url);
    console.log('[getConversation] API response:', {
      status: response.status,
      data: response.data,
      hasData: !!response.data,
    });
    return response.data;
  } catch (error: any) {
    console.error('[getConversation] API error:', {
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
  limit: number = 50,
  searchQuery?: string
): Promise<MessageListResponse> {
  console.log('[getMessages] API call:', {
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
  console.log('[getMessages] Full URL:', `${apiClient.defaults.baseURL}${url}`);

  try {
    const response = await apiClient.get<MessageListResponse>(url);
    console.log('[getMessages] API response:', {
      status: response.status,
      data: response.data,
      messagesCount: response.data?.messages?.length,
      hasMessages: !!response.data?.messages,
    });
    return response.data;
  } catch (error: any) {
    console.error('[getMessages] API error:', {
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


