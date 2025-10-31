/**
 * 网易云音乐API服务
 * 用于从网易云音乐获取艺术家信息
 */

const axios = require('axios');
const crypto = require('crypto');

class NeteaseService {
  constructor() {
    // 网易云音乐API基础URL
    this.baseUrl = 'https://music.163.com';
    // 设置用户代理
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  /**
   * 从URL中提取艺术家ID
   * @param {string} url 网易云音乐艺术家页面URL
   * @returns {string|null} 艺术家ID或null
   */
  extractArtistId(url) {
    try {
      // 处理可能的URL编码
      let decodedUrl = url;
      try {
        decodedUrl = decodeURIComponent(url);
      } catch (e) {
        // 解码失败，使用原始URL
        console.warn('URL解码失败，使用原始URL:', e.message);
      }
      
      const urlObj = new URL(decodedUrl);
      
      // 从路径中提取ID，格式通常是: /artist?id=12345 或 /artist/12345
      if (urlObj.pathname.includes('/artist')) {
        // 如果是/artist?id=12345格式
        if (urlObj.searchParams.get('id')) {
          return urlObj.searchParams.get('id');
        }
        
        // 如果是/artist/12345格式
        const matches = urlObj.pathname.match(/\/artist\/(\d+)/);
        if (matches && matches[1]) {
          return matches[1];
        }
      }
      
      // 尝试从URL字符串中直接提取ID
      const idMatch = decodedUrl.match(/[?&]id=(\d+)/);
      if (idMatch && idMatch[1]) {
        return idMatch[1];
      }
      
      return null;
    } catch (error) {
      console.error('提取网易云艺术家ID错误:', error);
      
      // 如果URL解析失败，尝试直接从字符串中提取ID
      try {
        const idMatch = url.match(/[?&]id=(\d+)/);
        if (idMatch && idMatch[1]) {
          return idMatch[1];
        }
      } catch (e) {
        console.error('从字符串中提取ID失败:', e);
      }
      
      return null;
    }
  }

  /**
   * 生成加密参数
   * @param {Object} data 请求数据
   * @returns {Object} 加密后的参数
   */
  createSecretParams(data) {
    // 此处简化处理，实际网易云API可能需要更复杂的加密
    // 这里仅作为示例
    const text = JSON.stringify(data);
    return {
      params: Buffer.from(text).toString('base64'),
      encSecKey: '0000000000000000' // 实际使用中应当使用RSA加密生成
    };
  }

  /**
   * 获取艺术家详情
   * @param {string} artistId 艺术家ID
   * @returns {Promise<Object>} 艺术家详情
   */
  async getArtistDetail(artistId) {
    try {
      // 构建请求URL
      const url = `${this.baseUrl}/weapi/v1/artist/${artistId}`;
      
      // 构建请求数据
      const requestData = {
        id: artistId,
        csrf_token: ''
      };
      
      // 发送请求
      const response = await axios.post(url, this.createSecretParams(requestData), {
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseUrl
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('获取网易云艺术家详情错误:', error);
      throw new Error('获取网易云艺术家详情失败');
    }
  }

  /**
   * 获取艺术家简介
   * @param {string} artistId 艺术家ID
   * @returns {Promise<Object>} 艺术家简介
   */
  async getArtistDesc(artistId) {
    try {
      const url = `${this.baseUrl}/weapi/artist/introduction`;
      
      const requestData = {
        id: artistId,
        csrf_token: ''
      };
      
      const response = await axios.post(url, this.createSecretParams(requestData), {
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseUrl
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('获取网易云艺术家简介错误:', error);
      throw new Error('获取网易云艺术家简介失败');
    }
  }

  /**
   * 获取艺术家热门歌曲
   * @param {string} artistId 艺术家ID
   * @returns {Promise<Object>} 艺术家热门歌曲
   */
  async getArtistHotSongs(artistId) {
    try {
      const url = `${this.baseUrl}/weapi/v1/artist/${artistId}`;
      
      const requestData = {
        id: artistId,
        offset: 0,
        limit: 10,
        csrf_token: ''
      };
      
      const response = await axios.post(url, this.createSecretParams(requestData), {
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': this.baseUrl
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('获取网易云艺术家热门歌曲错误:', error);
      throw new Error('获取网易云艺术家热门歌曲失败');
    }
  }

  /**
   * 获取艺术家完整信息
   * @param {string} url 网易云音乐艺术家页面URL
   * @returns {Promise<Object>} 艺术家完整信息
   */
  async getArtistInfo(url) {
    try {
      // 从URL中提取艺术家ID
      const artistId = this.extractArtistId(url);
      
      if (!artistId) {
        throw new Error('无效的网易云音乐艺术家URL');
      }
      
      // 并行获取艺术家详情和简介
      const [detail, description] = await Promise.all([
        this.getArtistDetail(artistId),
        this.getArtistDesc(artistId)
      ]);
      
      // 构建返回数据
      return {
        artist: detail.artist || {},
        hotSongs: detail.hotSongs || [],
        introduction: description.introduction || [],
        briefDesc: description.briefDesc || '',
        count: {
          musicSize: detail.artist?.musicSize || 0,
          albumSize: detail.artist?.albumSize || 0,
          mvSize: detail.artist?.mvSize || 0
        }
      };
    } catch (error) {
      console.error('获取网易云艺术家信息错误:', error);
      throw error;
    }
  }

  /**
   * 从API代理获取艺术家信息
   * 使用第三方API代理，避免直接调用网易云API的复杂性
   * @param {string} url 网易云音乐艺术家页面URL
   * @returns {Promise<Object>} 艺术家信息
   */
  async getArtistInfoFromProxy(url) {
    try {
      // 从URL中提取艺术家ID
      const artistId = this.extractArtistId(url);
      
      if (!artistId) {
        throw new Error('无效的网易云音乐艺术家URL');
      }
      
      // 使用公开的第三方API代理
      // 注意：实际使用中应当替换为可靠的API源或自己的代理服务
      const proxyUrl = `https://autumnfish.cn/artist/detail?id=${artistId}`;
      
      const response = await axios.get(proxyUrl, {
        headers: {
          'User-Agent': this.userAgent
        }
      });
      
      // 如果需要，也可以获取艺术家描述
      const descResponse = await axios.get(`https://autumnfish.cn/artist/desc?id=${artistId}`, {
        headers: {
          'User-Agent': this.userAgent
        }
      });
      
      // 合并结果
      return {
        ...response.data,
        artistDesc: descResponse.data
      };
    } catch (error) {
      console.error('通过代理获取网易云艺术家信息错误:', error);
      throw error;
    }
  }
}

// 导出网易云音乐服务实例
module.exports = new NeteaseService(); 