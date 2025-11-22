/**
 * API client for posts, likes, and comments
 */

import { getApiBaseUrl } from '../config';

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

export interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: 'public' | 'followers_only' | 'private';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: PostAuthor;
  like_count: number;
  comment_count: number;
  is_liked_by_current_user: boolean;
  hashtags?: Hashtag[];
  mentions?: Mention[];
  images?: PostImage[];
}

export interface PostDetail extends Post {
  comments: Comment[];
  likes: PostLike[];
}

export interface PostLike {
  id: number;
  post_id: string;
  user_id: string;
  reaction_type: 'like' | 'support' | 'empathy';
  created_at: string;
  user?: PostAuthor;
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
}

export interface CreatePostData {
  content: string;
  visibility?: 'public' | 'followers_only' | 'private';
  image_urls?: string[];
}

export interface UpdatePostData {
  content?: string;
  visibility?: 'public' | 'followers_only' | 'private';
  is_active?: boolean;
  image_urls?: string[];
}

export interface CreateCommentData {
  content: string;
  parent_comment_id?: string;
}

export interface UpdateCommentData {
  content?: string;
  is_active?: boolean;
}

export interface CreateLikeData {
  reaction_type?: 'like' | 'support' | 'empathy';
}

// ========== Post API Functions ==========

/**
 * Create a new post
 */
export async function createPost(
  data: CreatePostData,
  accessToken: string
): Promise<Post> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create post');
  }

  return response.json();
}

/**
 * Get feed of posts
 */
export async function getFeed(
  skip: number = 0,
  limit: number = 20,
  accessToken?: string,
  filterType: 'all' | 'following' | 'disease' | 'my_posts' = 'all',
  diseaseId?: number
): Promise<Post[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const queryParams = new URLSearchParams();
  queryParams.append('skip', skip.toString());
  queryParams.append('limit', limit.toString());
  queryParams.append('filter_type', filterType);
  if (diseaseId !== undefined) {
    queryParams.append('disease_id', diseaseId.toString());
  }

  const url = `${getApiBaseUrl()}/api/v1/posts?${queryParams.toString()}`;
  console.log('[getFeed] Fetching from:', url);
  console.log('[getFeed] Headers:', { ...headers, Authorization: accessToken ? 'Bearer ***' : undefined });

  // Add timeout to fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('[getFeed] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
      console.error('[getFeed] Error response:', error);
      throw new Error(error.detail || 'Failed to fetch feed');
    }

    const data = await response.json();
    console.log('[getFeed] Success, received', Array.isArray(data) ? data.length : 'non-array', 'items');
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('[getFeed] Request timeout after 10 seconds');
      throw new Error('Request timeout: The server took too long to respond. Please check if the backend is running.');
    }
    console.error('[getFeed] Fetch error:', err);
    throw err;
  }
}

/**
 * Get a specific post by ID
 */
export async function getPost(
  postId: string,
  accessToken?: string
): Promise<PostDetail> {
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
  accessToken?: string
): Promise<Post[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${getApiBaseUrl()}/api/v1/posts/user/${userId}?skip=${skip}&limit=${limit}`;
  console.log('[getUserPosts] Fetching from:', url);

  // Add timeout to fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
      console.error('[getUserPosts] Error response:', error);
      throw new Error(error.detail || 'Failed to fetch user posts');
    }

    const data = await response.json();
    console.log('[getUserPosts] Success, received', Array.isArray(data) ? data.length : 'non-array', 'items');
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('[getUserPosts] Request timeout after 10 seconds');
      throw new Error('Request timeout: The server took too long to respond. Please check if the backend is running.');
    }
    console.error('[getUserPosts] Fetch error:', err);
    throw err;
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
export async function deletePost(
  postId: string,
  accessToken: string
): Promise<void> {
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
): Promise<PostLike> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/${postId}/like`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to like post');
  }

  return response.json();
}

/**
 * Unlike a post
 */
export async function unlikePost(
  postId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/${postId}/like`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

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
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/${postId}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

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
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/comments/${commentId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update comment');
  }

  return response.json();
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/posts/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete comment');
  }
}
