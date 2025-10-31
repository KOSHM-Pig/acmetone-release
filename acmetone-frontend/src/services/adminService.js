import axios from 'axios';
import { API_BASE_URL } from '@/config';

/**
 * 管理员服务 - 提供管理员特有的操作方法
 */

/**
 * 删除专辑
 * @param {string} albumId - 要删除的专辑ID
 * @returns {Promise<Object>} - 返回删除结果
 */
export const deleteAlbum = async (albumId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    const response = await axios.delete(`${API_BASE_URL}/admin/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return {
      success: true,
      message: response.data.message || '专辑删除成功'
    };
  } catch (error) {
    console.error('删除专辑失败:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || '删除专辑失败'
    };
  }
}; 