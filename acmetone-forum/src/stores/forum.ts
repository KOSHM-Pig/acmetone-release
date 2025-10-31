/**
 * 论坛状态管理
 * 
 * 该模块提供了论坛相关的状态管理，包括获取分类、话题列表、话题详情、发布话题、回复等功能。
 * 
 * @module stores/forum
 * @requires pinia
 * @requires ../api/forum
 */

import { defineStore } from 'pinia';
import {
  getCategories,
  getTopics,
  getTopic,
  createTopic,
  getReplies,
  createReply,
  ForumCategory,
  TopicPreview,
  TopicDetail,
  Reply,
  TopicListParams,
  CreateTopicRequest,
  CreateReplyRequest,
} from '@/api/forum';

export interface ForumState {
  categories: ForumCategory[];
  topics: TopicPreview[];
  currentTopic: TopicDetail | null;
  replies: Reply[];
  totalTopics: number;
  totalReplies: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
}

/**
 * 论坛状态管理
 */
export const useForumStore = defineStore('forum', {
  state: (): ForumState => ({
    categories: [],
    topics: [],
    currentTopic: null,
    replies: [],
    totalTopics: 0,
    totalReplies: 0,
    currentPage: 1,
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * 获取论坛分类
     * @returns {ForumCategory[]} 分类列表
     */
    forumCategories: (state) => state.categories,

    /**
     * 获取话题列表
     * @returns {TopicPreview[]} 话题列表
     */
    topicList: (state) => state.topics,

    /**
     * 获取当前话题
     * @returns {TopicDetail | null} 当前话题
     */
    currentTopicDetail: (state) => state.currentTopic,

    /**
     * 获取回复列表
     * @returns {Reply[]} 回复列表
     */
    replyList: (state) => state.replies,
  },

  actions: {
    /**
     * 获取论坛分类
     * @returns {Promise<void>}
     */
    async fetchCategories() {
      this.loading = true;
      this.error = null;
      try {
        const response = await getCategories();
        this.categories = response.data;
      } catch (error: any) {
        this.error = error.response?.data?.message || '获取分类失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取话题列表
     * @param {TopicListParams} params - 查询参数
     * @returns {Promise<void>}
     */
    async fetchTopics(params: TopicListParams = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await getTopics(params);
        this.topics = response.data.topics;
        this.totalTopics = response.data.total;
        this.currentPage = response.data.page;
      } catch (error: any) {
        this.error = error.response?.data?.message || '获取话题列表失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取话题详情
     * @param {number} id - 话题ID
     * @returns {Promise<void>}
     */
    async fetchTopic(id: number) {
      this.loading = true;
      this.error = null;
      try {
        const response = await getTopic(id);
        this.currentTopic = response.data;
      } catch (error: any) {
        this.error = error.response?.data?.message || '获取话题详情失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 创建新话题
     * @param {CreateTopicRequest} data - 创建话题请求数据
     * @returns {Promise<number>} 新话题ID
     */
    async publishTopic(data: CreateTopicRequest) {
      this.loading = true;
      this.error = null;
      try {
        const response = await createTopic(data);
        return response.data.id;
      } catch (error: any) {
        this.error = error.response?.data?.message || '发布话题失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取话题回复列表
     * @param {number} topicId - 话题ID
     * @param {Object} params - 查询参数
     * @returns {Promise<void>}
     */
    async fetchReplies(topicId: number, params = { page: 1, limit: 20 }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await getReplies(topicId, params);
        this.replies = response.data.replies;
        this.totalReplies = response.data.total;
      } catch (error: any) {
        this.error = error.response?.data?.message || '获取回复列表失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 发表回复
     * @param {number} topicId - 话题ID
     * @param {CreateReplyRequest} data - 创建回复请求数据
     * @returns {Promise<number>} 新回复ID
     */
    async publishReply(topicId: number, data: CreateReplyRequest) {
      this.loading = true;
      this.error = null;
      try {
        const response = await createReply(topicId, data);
        // 重新获取回复列表，确保显示最新回复
        await this.fetchReplies(topicId);
        return response.data.id;
      } catch (error: any) {
        this.error = error.response?.data?.message || '发表回复失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * 清除当前话题
     */
    clearCurrentTopic() {
      this.currentTopic = null;
      this.replies = [];
    },
  },
}); 