/**
 * 音乐API服务
 * 
 * 该模块提供了与音乐相关的API请求服务，包括获取音乐列表、音乐详情、评分和评论等。
 * 
 * @module api/music
 * @requires ./http
 */

import { get, post } from './http';

// 定义接口类型
export interface Track {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  genre: string;
  releaseDate: string;
  rating?: number;
  ratingCount?: number;
  playCount?: number;
  commentCount?: number;
  label?: string;
}

export interface TrackDetail {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  genre: string;
  releaseDate: string;
  label: {
    id: number;
    name: string;
  };
  rating: number;
  ratingCount: number;
  playCount: number;
}

export interface TrackComment {
  id: number;
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TrackListParams {
  page?: number;
  limit?: number;
  genre?: string;
  sort?: 'newest' | 'rating' | 'comments';
  search?: string;
}

export interface TrackListResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    limit: number;
    tracks: Track[];
  };
}

export interface TrackDetailResponse {
  success: boolean;
  data: TrackDetail;
}

export interface TrackCommentListParams {
  page?: number;
  limit?: number;
}

export interface TrackCommentListResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    limit: number;
    comments: TrackComment[];
  };
}

export interface RateTrackRequest {
  rating: number;
  comment?: string;
}

export interface RateTrackResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    rating: number;
    comment: string;
  };
}

export interface RandomTracksResponse {
  success: boolean;
  data: Track[];
}

/**
 * 获取音乐列表
 * 
 * @param {TrackListParams} params - 查询参数
 * @returns {Promise<TrackListResponse>} 音乐列表响应
 */
export const getTracks = (params: TrackListParams = {}): Promise<TrackListResponse> => {
  return get<TrackListResponse>('/tracks', params);
};

/**
 * 获取音乐详情
 * 
 * @param {number} id - 音乐ID
 * @returns {Promise<TrackDetailResponse>} 音乐详情响应
 */
export const getTrack = (id: number): Promise<TrackDetailResponse> => {
  return get<TrackDetailResponse>(`/tracks/${id}`);
};

/**
 * 获取随机音乐
 * 
 * @param {number} limit - 返回数量
 * @returns {Promise<RandomTracksResponse>} 随机音乐响应
 */
export const getRandomTracks = (limit: number = 5): Promise<RandomTracksResponse> => {
  return get<RandomTracksResponse>('/tracks/random', { limit });
};

/**
 * 评分和评论音乐
 * 
 * @param {number} id - 音乐ID
 * @param {RateTrackRequest} data - 评分请求数据
 * @returns {Promise<RateTrackResponse>} 评分响应
 */
export const rateTrack = (id: number, data: RateTrackRequest): Promise<RateTrackResponse> => {
  return post<RateTrackResponse>(`/tracks/${id}/rate`, data);
};

/**
 * 获取音乐评论
 * 
 * @param {number} id - 音乐ID
 * @param {TrackCommentListParams} params - 查询参数
 * @returns {Promise<TrackCommentListResponse>} 评论列表响应
 */
export const getTrackComments = (
  id: number,
  params: TrackCommentListParams = {}
): Promise<TrackCommentListResponse> => {
  return get<TrackCommentListResponse>(`/tracks/${id}/comments`, params);
}; 