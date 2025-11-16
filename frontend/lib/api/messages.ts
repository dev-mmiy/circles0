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
    `/messages/conversations?${params.toString()}`
  );
  return response.data;
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await apiClient.get<Conversation>(
    `/messages/conversations/${conversationId}`
  );
  return response.data;
}

/**
 * Delete a conversation (soft delete)
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/messages/conversations/${conversationId}`);
}

/**
 * Send a message to another user
 */
export async function sendMessage(data: CreateMessageData): Promise<Message> {
  const response = await apiClient.post<Message>('/messages', data);
  return response.data;
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
    `/messages/conversations/${conversationId}/messages?${params.toString()}`
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
    `/messages/conversations/${conversationId}/read`,
    { message_ids: messageIds }
  );
  return response.data;
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}`);
}

