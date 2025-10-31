/**
 * 厂牌API服务
 * 
 * 该模块提供了与音乐厂牌相关的API请求服务，包括获取厂牌列表、厂牌详情等。
 * 
 * @module api/labels
 * @requires ./http
 */

import { get } from './http';
import { Track } from './music';

// 定义接口类型
export interface Label {
  id: number;
  name: string;
  logo: string;
  country: string;
  founded: string;
  mainGenres: string[];
}

export interface LabelDetail {
  id: number;
  name: string;
  logo: string;
  description: string;
  founded: string;
  country: string;
  monthlyListeners: number;
  totalReleases: number;
  mainGenres: string[];
  topTracks: Track[];
}

export interface LabelListParams {
  page?: number;
  limit?: number;
  genre?: string;
  sort?: 'name' | 'popularity' | 'founded';
  search?: string;
}

export interface LabelListResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    limit: number;
    labels: Label[];
  };
}

export interface LabelDetailResponse {
  success: boolean;
  data: LabelDetail;
}

/**
 * 获取厂牌列表
 * 
 * @param {LabelListParams} params - 查询参数
 * @returns {Promise<LabelListResponse>} 厂牌列表响应
 */
export const getLabels = (params: LabelListParams = {}): Promise<LabelListResponse> => {
  return get<LabelListResponse>('/labels', params);
};

/**
 * 获取厂牌详情
 * 
 * @param {number} id - 厂牌ID
 * @returns {Promise<LabelDetailResponse>} 厂牌详情响应
 */
export const getLabel = (id: number): Promise<LabelDetailResponse> => {
  return get<LabelDetailResponse>(`/labels/${id}`);
}; 