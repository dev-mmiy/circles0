/**
 * Groups API client for group chat
 */

import { apiClient } from './client';
import { debugLog } from '@/lib/utils/debug';

export interface CreateGroupMessageReactionData {
  reaction_type: string;
}

export interface GroupMemberInfo {
  id: string;
  nickname: string;
  username: string | null;
  avatar_url: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  left_at: string | null;
  user: GroupMemberInfo | null;
}

export interface GroupMessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
  user: GroupMemberInfo | null;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender: GroupMemberInfo | null;
  is_read: boolean;
  read_at: string | null;
  reactions?: GroupMessageReaction[] | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  creator_id: string | null;
  last_message_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  creator: GroupMemberInfo | null;
  members: GroupMember[];
  member_count: number;
  last_message: GroupMessage | null;
  unread_count: number;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
  skip: number;
  limit: number;
}

export interface GroupMessageListResponse {
  messages: GroupMessage[];
  total: number;
  skip: number;
  limit: number;
  group_id: string;
}

export interface CreateGroupData {
  name: string;
  description?: string | null;
  member_ids?: string[];
}

export interface UpdateGroupData {
  name?: string;
  description?: string | null;
  avatar_url?: string | null;
}

export interface CreateGroupMessageData {
  content: string;
  image_url?: string | null;
}

export interface AddMemberData {
  user_ids: string[];
}

export interface UpdateMemberRoleData {
  is_admin: boolean;
}

export interface MarkGroupMessagesReadRequest {
  message_ids?: string[] | null;
}

export interface MarkGroupMessagesReadResponse {
  marked_count: number;
  message_ids: string[];
}

/**
 * Create a new group
 */
export async function createGroup(data: CreateGroupData): Promise<Group> {
  const response = await apiClient.post<Group>('/api/v1/groups', data);
  return response.data;
}

/**
 * Get all groups for the current user
 */
/**
 * Get all groups for the current user
 */
export async function getGroups(skip: number = 0, limit: number = 20): Promise<GroupListResponse> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const response = await apiClient.get<GroupListResponse>(`/api/v1/groups?${params.toString()}`);
  return response.data;
}

/**
 * Search groups by name or description
 */
export async function searchGroups(
  query: string,
  skip: number = 0,
  limit: number = 20
): Promise<GroupListResponse> {
  const params = new URLSearchParams({
    q: query,
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const response = await apiClient.get<GroupListResponse>(
    `/api/v1/groups/search?${params.toString()}`
  );
  return response.data;
}

/**
 * Get a specific group by ID
 */
export async function getGroup(groupId: string): Promise<Group> {
  const response = await apiClient.get<Group>(`/api/v1/groups/${groupId}`);
  return response.data;
}

/**
 * Update a group
 */
export async function updateGroup(groupId: string, data: UpdateGroupData): Promise<Group> {
  const response = await apiClient.put<Group>(`/api/v1/groups/${groupId}`, data);
  return response.data;
}

/**
 * Delete a group (soft delete)
 */
export async function deleteGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/api/v1/groups/${groupId}`);
}

/**
 * Add members to a group
 */
export async function addMembers(groupId: string, data: AddMemberData): Promise<Group> {
  const response = await apiClient.post<Group>(`/api/v1/groups/${groupId}/members`, data);
  return response.data;
}

/**
 * Remove a member from a group
 */
export async function removeMember(groupId: string, userId: string): Promise<void> {
  await apiClient.delete(`/api/v1/groups/${groupId}/members/${userId}`);
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  groupId: string,
  userId: string,
  data: UpdateMemberRoleData
): Promise<Group> {
  const response = await apiClient.put<Group>(
    `/api/v1/groups/${groupId}/members/${userId}/role`,
    data
  );
  return response.data;
}

/**
 * Send a message to a group
 */
export async function sendGroupMessage(
  groupId: string,
  data: CreateGroupMessageData
): Promise<GroupMessage> {
  const response = await apiClient.post<GroupMessage>(`/api/v1/groups/${groupId}/messages`, data);
  return response.data;
}

/**
 * Get messages in a group
 */
export async function getGroupMessages(
  groupId: string,
  skip: number = 0,
  limit: number = 50
): Promise<GroupMessageListResponse> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const response = await apiClient.get<GroupMessageListResponse>(
    `/api/v1/groups/${groupId}/messages?${params.toString()}`
  );
  return response.data;
}

/**
 * Mark group messages as read
 */
export async function markGroupMessagesAsRead(
  groupId: string,
  messageIds?: string[] | null
): Promise<MarkGroupMessagesReadResponse> {
  const response = await apiClient.put<MarkGroupMessagesReadResponse>(
    `/api/v1/groups/${groupId}/messages/read`,
    { message_ids: messageIds }
  );
  return response.data;
}

/**
 * Delete a group message (soft delete)
 */
export async function deleteGroupMessage(groupId: string, messageId: string): Promise<void> {
  await apiClient.delete(`/api/v1/groups/${groupId}/messages/${messageId}`);
}

/**
 * Get unread message count for a group
 */
export async function getGroupUnreadCount(groupId: string): Promise<number> {
  const response = await apiClient.get<{ unread_count: number }>(
    `/api/v1/groups/${groupId}/unread-count`
  );
  return response.data.unread_count;
}

/**
 * Add or update a reaction to a group message
 */
export async function addGroupMessageReaction(
  groupId: string,
  messageId: string,
  data: CreateGroupMessageReactionData
): Promise<GroupMessageReaction | null> {
  try {
    const response = await apiClient.post<GroupMessageReaction>(
      `/api/v1/groups/${groupId}/messages/${messageId}/reactions`,
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
      debugLog.error('[addGroupMessageReaction] Validation error:', {
        status: error.response.status,
        data: error.response.data,
        requestData: data,
      });
    }
    debugLog.error('[addGroupMessageReaction] API error:', error);
    throw error;
  }
}

/**
 * Remove a reaction from a group message
 */
export async function removeGroupMessageReaction(
  groupId: string,
  messageId: string
): Promise<void> {
  await apiClient.delete(`/api/v1/groups/${groupId}/messages/${messageId}/reactions`);
}

/**
 * Get all reactions for a group message
 */
export async function getGroupMessageReactions(
  groupId: string,
  messageId: string
): Promise<GroupMessageReaction[]> {
  const response = await apiClient.get<GroupMessageReaction[]>(
    `/api/v1/groups/${groupId}/messages/${messageId}/reactions`
  );
  return response.data;
}
