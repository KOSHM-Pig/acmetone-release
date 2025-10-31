import axios from 'axios';
import { API_BASE_URL } from '@/config';
import api from './api';

// 辅助函数：将File对象转换为Base64字符串
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

/**
 * 权利链条服务 - 处理歌曲、歌手授权文件管理
 */
class RightsChainService {
  /**
   * 获取专辑权利链条信息
   * @param {number} albumId - 专辑ID
   * @returns {Promise<Object>} - 包含专辑、歌曲和歌手授权信息的对象
   */
  async getAlbumRightsChain(albumId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/rights-chain/albums/${albumId}/rights-chain`);
      return response.data;
    } catch (error) {
      console.error('获取权利链条信息失败:', error);
      throw error.response?.data || error;
    }
  }
  
  /**
   * 上传专辑级授权文件
   * @param {number} albumId - 专辑ID
   * @param {File} file - 授权文件
   * @returns {Promise<Object>} - 上传结果
   */
  async uploadAlbumAuthorization(albumId, file) {
    try {
      const fileBase64 = await toBase64(file);
      const response = await api.post(`/rights-chain/albums/${albumId}/authorization`, {
        fileBase64,
        fileName: file.name
      });
      return response.data;
    } catch (error) {
      console.error('上传专辑授权文件失败:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * 删除专辑级授权文件
   * @param {number} albumId - 专辑ID
   * @returns {Promise<Object>} - 删除结果
   */
  async deleteAlbumAuthorization(albumId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/rights-chain/albums/${albumId}/authorization`
      );
      return response.data;
    } catch (error) {
      console.error('删除专辑授权文件失败:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * 上传歌曲级授权文件
   * @param {number} albumId - 专辑ID
   * @param {number} songId - 歌曲ID
   * @param {File} file - 授权文件
   * @returns {Promise<Object>} - 上传结果
   */
  async uploadSongAuthorization(albumId, songId, file) {
    try {
      const fileBase64 = await toBase64(file);
      const response = await api.post(`/rights-chain/albums/${albumId}/songs/${songId}/authorization`, {
        fileBase64,
        fileName: file.name
      });
      return response.data;
    } catch (error) {
      console.error('上传歌曲授权文件失败:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * 上传歌手-歌曲授权文件
   * @param {number} albumId - 专辑ID
   * @param {number} songId - 歌曲ID
   * @param {number} artistId - 歌手ID
   * @param {File} file - 授权文件
   * @returns {Promise<Object>} - 上传结果
   */
  async uploadSongArtistAuthorization(albumId, songId, artistId, file) {
    try {
      const fileBase64 = await toBase64(file);
      const response = await api.post(`/rights-chain/albums/${albumId}/songs/${songId}/artists/${artistId}/authorization`, {
        fileBase64,
        fileName: file.name
      });
      return response.data;
    } catch (error) {
      console.error('上传歌手-歌曲授权文件失败:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * 删除歌曲级授权文件
   * @param {number} albumId - 专辑ID
   * @param {number} songId - 歌曲ID
   * @returns {Promise<Object>} - 删除结果
   */
  async deleteSongAuthorization(albumId, songId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/rights-chain/albums/${albumId}/songs/${songId}/authorization`
      );
      return response.data;
    } catch (error) {
      console.error('删除歌曲授权文件失败:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * 删除歌手-歌曲授权文件
   * @param {number} albumId - 专辑ID
   * @param {number} songId - 歌曲ID
   * @param {number} artistId - 歌手ID
   * @returns {Promise<Object>} - 删除结果
   */
  async deleteSongArtistAuthorization(albumId, songId, artistId) {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/rights-chain/albums/${albumId}/songs/${songId}/artists/${artistId}/authorization`
      );
      return response.data;
    } catch (error) {
      console.error('删除歌手-歌曲授权文件失败:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * 获取授权文件预览URL
   * @param {string} filePath - 文件路径
   * @returns {string} - 预览URL
   */
  getAuthorizationPreviewUrl(filePath) {
    if (!filePath) return '';
    return `${API_BASE_URL.replace('/api', '')}/${filePath}`;
  }

  /**
   * 获取授权文件名称
   * @param {string} filePath - 文件路径
   * @returns {string} - 文件名
   */
  getAuthorizationFileName(filePath) {
    if (!filePath) return '';
    const fileName = filePath.split('/').pop();
    
    // 如果文件名包含时间戳前缀，则移除
    const timestampMatch = fileName.match(/^song_artist_auth_\d+(.+)$/);
    if (timestampMatch && timestampMatch[1]) {
      return `授权文件${timestampMatch[1]}`;
    }
    
    return fileName;
  }
}

export default new RightsChainService(); 