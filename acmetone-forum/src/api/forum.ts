/**
 * 论坛API服务
 * 
 * 该模块提供了与论坛相关的API请求服务，包括获取分类、话题列表、话题详情、发布话题、回复等。
 * 
 * @module api/forum
 * @requires ./http
 */

import { get, post } from './http';
import { User } from './auth';

// 定义接口类型
export interface ForumCategory {
  id: number;
  name: string;
  color: string;
}

export interface TopicPreview {
  id: number;
  title: string;
  excerpt: string;
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  category: string;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  lastReply?: {
    user: {
      id: number;
      name: string;
      avatar: string;
    };
    content: string;
    createdAt: string;
  };
}

export interface TopicDetail {
  id: number;
  title: string;
  content: string;
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  category: {
    id: number;
    name: string;
    color: string;
  };
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reply {
  id: number;
  content: string;
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  createdAt: string;
  children: Reply[];
}

export interface TopicListParams {
  page?: number;
  limit?: number;
  category?: number;
  sort?: 'newest' | 'replies' | 'views';
  search?: string;
}

export interface TopicListResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    limit: number;
    topics: TopicPreview[];
  };
}

export interface TopicDetailResponse {
  success: boolean;
  data: TopicDetail;
}

export interface CreateTopicRequest {
  title: string;
  content: string;
  categoryId: number;
}

export interface CreateTopicResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    title: string;
  };
}

export interface ReplyListParams {
  page?: number;
  limit?: number;
}

export interface ReplyListResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    limit: number;
    replies: Reply[];
  };
}

export interface CreateReplyRequest {
  content: string;
  parentId?: number;
}

export interface CreateReplyResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    content: string;
  };
}

export interface CategoryListResponse {
  success: boolean;
  data: ForumCategory[];
}

/**
 * 获取论坛分类列表
 * 
 * @returns {Promise<CategoryListResponse>} 分类列表响应
 */
export const getCategories = (): Promise<CategoryListResponse> => {
  return get<CategoryListResponse>('/forum/categories');
};

/**
 * 获取话题列表
 * 
 * @param {TopicListParams} params - 查询参数
 * @returns {Promise<TopicListResponse>} 话题列表响应
 */
export const getTopics = (params: TopicListParams = {}): Promise<TopicListResponse> => {
  return get<TopicListResponse>('/forum/topics', params);
};

/**
 * 获取话题详情
 * 
 * @param {number} id - 话题ID
 * @returns {Promise<TopicDetailResponse>} 话题详情响应
 */
export const getTopic = (id: number): Promise<TopicDetailResponse> => {
  return get<TopicDetailResponse>(`/forum/topics/${id}`);
};

/**
 * 创建新话题
 * 
 * @param {CreateTopicRequest} data - 创建话题请求数据
 * @returns {Promise<CreateTopicResponse>} 创建话题响应
 */
export const createTopic = (data: CreateTopicRequest): Promise<CreateTopicResponse> => {
  return post<CreateTopicResponse>('/forum/topics', data);
};

/**
 * 获取话题回复列表
 * 
 * @param {number} topicId - 话题ID
 * @param {ReplyListParams} params - 查询参数
 * @returns {Promise<ReplyListResponse>} 回复列表响应
 */
export const getReplies = (topicId: number, params: ReplyListParams = {}): Promise<ReplyListResponse> => {
  return get<ReplyListResponse>(`/forum/topics/${topicId}/replies`, params);
};

/**
 * 创建回复
 * 
 * @param {number} topicId - 话题ID
 * @param {CreateReplyRequest} data - 创建回复请求数据
 * @returns {Promise<CreateReplyResponse>} 创建回复响应
 */
export const createReply = (topicId: number, data: CreateReplyRequest): Promise<CreateReplyResponse> => {
  return post<CreateReplyResponse>(`/forum/topics/${topicId}/replies`, data);
}; 