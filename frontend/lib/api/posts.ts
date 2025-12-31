/**
 * API client for posts, likes, and comments
 */

import { getApiBaseUrl } from '../config';
import { apiClient } from './client';

// ========== Types ==========

export interface PostAuthor {
  id: string;
  nickname: string;
  username?: string;
  avatar_url?: string;
}

export interface Hashtag {
  id: string;
  name: string;
  created_at: string;
}

export interface Mention {
  id: string;
  nickname: string;
  username?: string;
  avatar_url?: string;
}

export interface PostImage {
  id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface PostDisease {
  id: number;
  disease_id: number;
  disease_name: string;
  disease_translations?: Array<{
    id: number;
    disease_id: number;
    language_code: string;
    translated_name: string;
    details?: string;
  }>;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: 'public' | 'followers_only' | 'private';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  post_type?: 'regular' | 'health_record';
  health_record_type?: 'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise';
  health_record_data?: Record<string, any>;
  author?: PostAuthor;
  like_count: number;
  comment_count: number;
  is_liked_by_current_user: boolean;
  is_saved_by_current_user?: boolean; // Whether the post is saved by current user
  hashtags?: Hashtag[];
  mentions?: Mention[];
  images?: PostImage[];
  likes?: PostLike[]; // Reactions to the post
  user_disease?: PostDisease; // Disease information if post is linked to a disease
}

export interface PostDetail extends Post {
  comments: Comment[];
  likes: PostLike[];
}

export type ReactionType =
  | 'like'
  | 'love'
  | 'haha'
  | 'wow'
  | 'sad'
  | 'angry'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'clap'
  | 'fire'
  | 'party'
  | 'pray'
  | 'heart_eyes'
  | 'kiss'
  | 'thinking'
  | 'cool'
  | 'ok_hand'
  | 'victory'
  | 'muscle'
  | 'point_up'
  | 'point_down'
  | 'wave'
  | 'handshake'
  | 'fist_bump'
  | 'rocket'
  | 'star'
  | 'trophy'
  | 'medal'
  | 'crown'
  | 'gem'
  | 'balloon'
  | 'cake'
  | 'gift'
  | 'confetti'
  | 'sparkles'
  | 'rainbow';

export interface PostLike {
  id: number;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
  user?: PostAuthor;
}

export interface CommentImage {
  id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: PostAuthor;
  reply_count: number;
  images?: CommentImage[];
}

export interface CreatePostData {
  content: string;
  visibility?: 'public' | 'followers_only' | 'private';
  image_urls?: string[];
  user_disease_id?: number;
  post_type?: 'regular' | 'health_record';
  health_record_type?: 'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise';
  health_record_data?: Record<string, any>;
}

export interface UpdatePostData {
  content?: string;
  visibility?: 'public' | 'followers_only' | 'private';
  is_active?: boolean;
  image_urls?: string[];
  user_disease_id?: number | null; // null to explicitly clear the association
  post_type?: 'regular' | 'health_record';
  health_record_type?: 'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise';
  health_record_data?: Record<string, any>;
}

export interface CreateCommentData {
  content: string;
  parent_comment_id?: string;
  image_urls?: string[];
}

export interface UpdateCommentData {
  content?: string;
  is_active?: boolean;
}

export interface CreateLikeData {
  reaction_type?: ReactionType;
}

// ========== Post API Functions ==========

/**
 * Create a new post
 */
export async function createPost(data: CreatePostData, accessToken: string): Promise<Post> {
  console.log('[createPost] Sending request:', {
    post_type: data.post_type,
    health_record_type: data.health_record_type,
    has_health_record_data: !!data.health_record_data,
    content_length: data.content?.length || 0,
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    console.error('[createPost] API error:', {
      status: response.status,
      statusText: response.statusText,
      error,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      error.detail ||
        error.message ||
        `Failed to create post: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();
  console.log('[createPost] Success:', {
    post_id: result.id,
    post_type: result.post_type,
    timestamp: new Date().toISOString(),
  });
  return result;
}

/**
 * Get feed of posts
 */
export async function getFeed(
  skip: number = 0,
  limit: number = 20,
  accessToken?: string, // Kept for backward compatibility, but not used (apiClient handles auth)
  filterType:
    | 'all'
    | 'following'
    | 'disease'
    | 'my_posts'
    | 'following_and_my_posts'
    | 'not_following' = 'all',
  diseaseId?: number
): Promise<Post[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  queryParams.append('filter_type', filterType);
  if (diseaseId !== undefined) {
    queryParams.append('disease_id', diseaseId.toString());
  }

  const url = `/api/v1/posts?${queryParams.toString()}`;
  const fullURL = `${apiClient.defaults.baseURL}${url}`;

  console.log('[getFeed] API call:', {
    skip,
    limit,
    filterType,
    diseaseId,
    baseURL: apiClient.defaults.baseURL,
    fullURL,
    hasAuth: !!apiClient.defaults.headers.common['Authorization'],
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await apiClient.get<Post[]>(url);
    console.log('[getFeed] API response received:', {
      status: response.status,
      itemsCount: Array.isArray(response.data) ? response.data.length : 0,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  } catch (error: any) {
    console.error('[getFeed] API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * Get a specific post by ID
 */
export async function getPost(postId: string, accessToken?: string): Promise<PostDetail> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/${postId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch post');
  }

  return response.json();
}

/**
 * Get posts by a specific user
 */
export async function getUserPosts(
  userId: string,
  skip: number = 0,
  limit: number = 20,
  healthRecordType?: 'diary' | 'symptom' | 'vital' | 'meal' | 'medication' | 'exercise',
  accessToken?: string // Kept for backward compatibility, but not used (apiClient handles auth)
): Promise<Post[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  if (healthRecordType) {
    queryParams.append('health_record_type', healthRecordType);
  }
  const url = `/api/v1/posts/user/${userId}?${queryParams.toString()}`;
  const fullURL = `${apiClient.defaults.baseURL}${url}`;

  console.log('[getUserPosts] API call:', {
    userId,
    skip,
    limit,
    fullURL,
    hasAuth: !!apiClient.defaults.headers.common['Authorization'],
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await apiClient.get<Post[]>(url);
    console.log('[getUserPosts] API response received:', {
      status: response.status,
      itemsCount: Array.isArray(response.data) ? response.data.length : 0,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  } catch (error: any) {
    console.error('[getUserPosts] API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      isTimeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * Update a post
 */
export async function updatePost(
  postId: string,
  data: UpdatePostData,
  accessToken: string
): Promise<Post> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update post');
  }

  return response.json();
}

/**
 * Delete a post
 */
export async function deletePost(postId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete post');
  }
}

// ========== Like API Functions ==========

/**
 * Like a post
 */
export async function likePost(
  postId: string,
  data: CreateLikeData = { reaction_type: 'like' },
  accessToken: string
): Promise<PostLike | null> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (response.status === 204) {
    // Reaction was toggled off (same reaction type sent)
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to like post');
  }

  return response.json();
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/${postId}/like`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to unlike post');
  }
}

/**
 * Get all likes for a post
 */
export async function getPostLikes(
  postId: string,
  skip: number = 0,
  limit: number = 50
): Promise<PostLike[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/${postId}/likes?skip=${skip}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch likes');
  }

  return response.json();
}

// ========== Comment API Functions ==========

/**
 * Create a comment on a post
 */
export async function createComment(
  postId: string,
  data: CreateCommentData,
  accessToken: string
): Promise<Comment> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create comment');
  }

  return response.json();
}

/**
 * Get top-level comments for a post
 */
export async function getPostComments(
  postId: string,
  skip: number = 0,
  limit: number = 50
): Promise<Comment[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/${postId}/comments?skip=${skip}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch comments');
  }

  return response.json();
}

/**
 * Get replies to a comment
 */
export async function getCommentReplies(
  commentId: string,
  skip: number = 0,
  limit: number = 20
): Promise<Comment[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/comments/${commentId}/replies?skip=${skip}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch replies');
  }

  return response.json();
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  data: UpdateCommentData,
  accessToken: string
): Promise<Comment> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/comments/${commentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update comment');
  }

  return response.json();
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete comment');
  }
}

// ========== Saved Posts API ==========

/**
 * Save a post
 */
export async function savePost(postId: string, token: string): Promise<void> {
  await apiClient.post(
    `/api/v1/posts/${postId}/save`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * Unsave a post
 */
export async function unsavePost(postId: string, token: string): Promise<void> {
  await apiClient.delete(`/api/v1/posts/${postId}/save`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Get saved posts
 */
export async function getSavedPosts(
  skip: number = 0,
  limit: number = 20,
  sortBy: 'created_at' | 'post_created_at' = 'created_at',
  sortOrder: 'asc' | 'desc' = 'desc',
  token: string
): Promise<Post[]> {
  const response = await apiClient.get<Post[]>(`/api/v1/posts/saved`, {
    params: {
      skip,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

/**
 * Check if posts are saved
 */
export async function checkSavedPosts(postIds: string[], token: string): Promise<string[]> {
  const response = await apiClient.get<{ saved_post_ids: string[] }>(`/api/v1/posts/saved/check`, {
    params: {
      post_ids: postIds.join(','),
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data.saved_post_ids;
}
