/**
 * 用户认证API服务
 * 
 * 该模块提供了与用户认证相关的API请求服务，包括登录、注册、获取用户信息等。
 * 支持与Acmetone主系统的用户数据同步。
 * 
 * @module api/auth
 * @requires ./http
 */

import { get, post, put } from './http';

// 定义接口类型
export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface UserResponse {
  success: boolean;
  data: User;
}

export interface UpdateUserRequest {
  bio?: string;
}

/**
 * 用户登录
 * 登录时会自动与Acmetone主系统同步用户数据
 * 
 * @param {LoginRequest} data - 登录请求数据
 * @returns {Promise<LoginResponse>} 登录响应，包含token和用户信息
 */
export const login = (data: LoginRequest): Promise<LoginResponse> => {
  return post<LoginResponse>('/auth/login', data);
};

/**
 * 用户注册
 * 注册时会自动将新用户同步到Acmetone主系统
 * 
 * @param {RegisterRequest} data - 注册请求数据
 * @returns {Promise<UserResponse>} 注册响应，包含用户信息
 */
export const register = (data: RegisterRequest): Promise<UserResponse> => {
  return post<UserResponse>('/auth/register', data);
};

/**
 * 获取当前用户信息
 * 获取信息时会检查并同步Acmetone主系统中的最新用户数据
 * 
 * @returns {Promise<UserResponse>} 用户信息响应
 */
export const getCurrentUser = (): Promise<UserResponse> => {
  return get<UserResponse>('/auth/me');
};

/**
 * 更新用户信息
 * 
 * @param {UpdateUserRequest} data - 更新请求数据
 * @returns {Promise<UserResponse>} 更新后的用户信息响应
 */
export const updateUser = (data: UpdateUserRequest): Promise<UserResponse> => {
  return put<UserResponse>('/auth/me', data);
};

/**
 * 更新用户头像
 * 
 * @param {FormData} formData - 包含头像文件的表单数据
 * @returns {Promise<UserResponse>} 更新后的用户信息响应
 */
export const updateAvatar = (formData: FormData): Promise<UserResponse> => {
  return put<UserResponse>('/auth/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}; 