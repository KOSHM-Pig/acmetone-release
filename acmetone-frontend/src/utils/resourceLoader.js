/**
 * 资源加载工具函数
 * 用于处理图片和音频资源的加载，确保请求带有正确的Referer
 */
import { STATIC_BASE_URL, API_BASE_URL } from '@/config';

// 安全访问令牌，与后端保持一致
const API_ACCESS_TOKEN = 'acmetone_secure_access_token';

/**
 * 获取资源的完整URL
 * @param {string} path - 资源路径
 * @param {boolean} useToken - 是否使用安全令牌
 * @returns {string} 完整的资源URL
 */
export const getResourceUrl = (path, useToken = false) => {
  if (!path) return '';
  
  // 如果已经是完整URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // 构建基础URL
  let url = `${STATIC_BASE_URL}/${path.startsWith('/') ? path.slice(1) : path}`;
  
  // 如果需要使用安全令牌，添加到URL
  if (useToken) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}access_token=${API_ACCESS_TOKEN}`;
  }
  
  return url;
};

/**
 * 获取图片的完整URL，包括处理缩略图路径
 * @param {string} path - 图片路径
 * @param {boolean} addTimestamp - 是否添加时间戳防止缓存
 * @returns {string} 完整的图片URL
 */
export const getImageUrl = (path, addTimestamp = true) => {
  if (!path) return '';
  
  // 如果已经是完整URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return addTimestamp ? `${path}?t=${Date.now()}` : path;
  }
  
  // 构建基础URL
  let baseUrl;
  if (API_BASE_URL.includes('/api')) {
    // 如果API基础URL包含/api，则使用静态资源URL
    baseUrl = STATIC_BASE_URL;
  } else {
    baseUrl = API_BASE_URL;
  }
  
  // 处理路径格式
  let normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  
  // 修复重复路径问题：移除可能重复的"uploads/"前缀
  if (normalizedPath.startsWith('uploads/album_covers/uploads/')) {
    normalizedPath = normalizedPath.replace('uploads/album_covers/uploads/', 'uploads/');
  } else if (normalizedPath.startsWith('uploads/uploads/')) {
    normalizedPath = normalizedPath.replace('uploads/uploads/', 'uploads/');
  }
  
  // 构建完整URL
  const url = `${baseUrl}/${normalizedPath}`;
  
  // 添加时间戳防止缓存
  return addTimestamp ? `${url}?t=${Date.now()}` : url;
};

/**
 * 安全加载图片
 * @param {string} path - 图片路径
 * @returns {Promise} 返回一个Promise，成功时resolve图片对象，失败时reject错误
 */
export const loadImage = (path) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'use-credentials'; // 使用凭证模式，确保发送cookies和referer
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = getResourceUrl(path);
  });
};

/**
 * 安全加载音频
 * @param {string} path - 音频路径
 * @returns {Promise} 返回一个Promise，成功时resolve音频元素，失败时reject错误
 */
export const loadAudio = (path) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.crossOrigin = 'use-credentials'; // 使用凭证模式，确保发送cookies和referer
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = (error) => reject(error);
    audio.src = getResourceUrl(path);
  });
};

/**
 * 通过代理加载资源（用于防止直接外链）
 * @param {string} path - 资源路径
 * @returns {Promise} 返回一个Promise，成功时resolve资源的Blob URL，失败时reject错误
 */
export const loadResourceViaProxy = async (path) => {
  try {
    // 检查路径是否为空
    if (!path) {
      throw new Error('资源路径为空');
    }
    
    console.log('加载资源:', path);
    
    // 检查是否是加密路径，需要使用特殊的API端点
    const isEncryptedPath = path && typeof path === 'string' && path.includes(':') && 
                           /^[0-9a-f]{32}:.+$/.test(path);
    
    console.log('是否为加密路径:', isEncryptedPath);
    
    // 检查是否是音频文件（WAV格式）
    const isAudioFile = path && typeof path === 'string' && 
                      (path.toLowerCase().endsWith('.wav') || path.toLowerCase().includes('/audio/'));
    
    console.log('是否为音频文件:', isAudioFile);
    
    let url;
    
    // 如果是音频文件，尝试使用音频转码API
    if (isAudioFile) {
      try {
        // 从当前URL中提取albumId
        const urlParts = window.location.pathname.split('/');
        const albumIdIndex = urlParts.indexOf('albums') + 1;
        const albumId = albumIdIndex > 0 && albumIdIndex < urlParts.length ? urlParts[albumIdIndex] : null;
        
        if (!albumId) {
          console.warn('无法确定专辑ID，将尝试直接加载音频');
          throw new Error('无法确定专辑ID');
        }
        
        // 尝试从DOM中获取songId，这是最可靠的方法
        let songId = null;
        const songElements = document.querySelectorAll('[data-song-id]');
        for (const element of songElements) {
          if (element.dataset.songPath === path) {
            songId = element.dataset.songId;
            break;
          }
        }
        
        // 如果无法从DOM中获取，尝试其他方法
        if (!songId) {
          console.warn('无法从DOM中获取songId，尝试其他方法');
          
          // 尝试从URL查询参数中获取
          const urlParams = new URLSearchParams(window.location.search);
          songId = urlParams.get('songId');
          
          // 不再尝试从文件名中提取，因为文件名中的数字可能不是真实的songId
        }
        
        if (!songId) {
          console.warn('无法确定歌曲ID，将尝试直接加载音频');
          throw new Error('无法确定歌曲ID');
        }
        
        console.log('使用音频转码API加载:', { albumId, songId });
        
        // 获取token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录，无法访问加密资源');
        }
        
        // 使用音频API
        const apiUrl = `${STATIC_BASE_URL}/api/albums/${albumId}/songs/${songId}/audio`;
        console.log('请求音频API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error('音频API响应错误:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`音频API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.audioUrl) {
          throw new Error('服务器未返回有效的音频URL');
        }
        
        console.log('API返回的音频URL:', data.audioUrl);
        
        // 使用返回的音频URL
        console.log('开始下载音频文件');
        const audioResponse = await fetch(data.audioUrl, {
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!audioResponse.ok) {
          console.error('音频文件下载失败:', {
            status: audioResponse.status,
            statusText: audioResponse.statusText
          });
          throw new Error(`音频文件下载失败: ${audioResponse.status} ${audioResponse.statusText}`);
        }
        
        console.log('音频文件下载成功，创建Blob');
        const blob = await audioResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('Blob URL创建成功:', blobUrl.substring(0, 30) + '...');
        return blobUrl;
      } catch (audioError) {
        // 如果音频API调用失败，回退到直接加载
        console.warn('音频API调用失败，回退到直接加载:', audioError);
      }
    }
    
    // 加密路径处理
    if (isEncryptedPath) {
      // 对于加密路径，使用专门的API端点
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录，无法访问加密资源');
      }
      
      // 从当前URL中提取albumId
      const urlParts = window.location.pathname.split('/');
      const albumIdIndex = urlParts.indexOf('albums') + 1;
      const albumId = albumIdIndex > 0 && albumIdIndex < urlParts.length ? urlParts[albumIdIndex] : null;
      
      if (!albumId) {
        throw new Error('无法确定专辑ID，无法加载音频');
      }
      
      // 从URL中提取songId - 修改提取逻辑
      // 尝试从URL参数或路径中获取songId
      let songId = null;
      
      // 检查当前页面上是否有包含data-song-id属性的元素
      const songElements = document.querySelectorAll('[data-song-id]');
      for (const element of songElements) {
        if (element.dataset.songPath === path) {
          songId = element.dataset.songId;
          break;
        }
      }
      
      // 如果无法从DOM中获取songId，尝试从URL查询参数中获取
      if (!songId) {
        const urlParams = new URLSearchParams(window.location.search);
        songId = urlParams.get('songId');
      }
      
      // 如果还是无法获取songId，尝试从路径中提取
      if (!songId) {
        // 从路径中查找可能的数字ID
        const matches = path.match(/\/(\d+)[-\/]/);
        if (matches && matches[1]) {
          songId = matches[1];
        }
      }
      
      // 如果所有方法都失败，使用一个备选方案
      if (!songId) {
        console.warn('无法从路径中提取songId，尝试使用备选方案');
        
        try {
          // 尝试从当前页面上下文中获取songId
          // 在Vue组件中，可能会有一个songs数组，遍历它找到匹配的wavFile
          const appElement = document.getElementById('app');
          if (appElement && appElement.__vue_app__) {
            // 这是一个不太可靠的方法，但可以作为最后的尝试
            console.warn('尝试从Vue应用实例中查找songId');
            
            // 如果无法从上下文中获取，则使用一个临时解决方案
            // 从path中提取一个唯一标识符，用作临时songId
            const pathHash = path.split(':')[0]; // 使用加密路径的前半部分作为唯一标识符
            songId = pathHash;
            console.warn('使用路径哈希作为临时songId:', songId);
          }
        } catch (err) {
          console.error('尝试从上下文获取songId失败:', err);
        }
      }
      
      if (!songId) {
        throw new Error('无法确定歌曲ID，无法加载音频');
      }
      
      console.log('使用API加载加密音频:', { albumId, songId });
      url = `${STATIC_BASE_URL}/api/albums/${albumId}/songs/${songId}/audio`;
      
      console.log('请求URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('API响应错误:', {
          status: response.status,
          statusText: response.statusText
        });
        
        // 尝试读取响应内容
        try {
          const errorText = await response.text();
          console.error('错误响应内容:', errorText);
          throw new Error(`加密资源加载失败: ${response.status} ${response.statusText} - ${errorText}`);
        } catch (textError) {
          throw new Error(`加密资源加载失败: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('API返回的音频URL:', data.audioUrl);
      
      if (!data.audioUrl) {
        throw new Error('服务器未返回有效的音频URL');
      }
      
      // 使用返回的音频URL
      console.log('开始下载音频文件');
      const audioResponse = await fetch(data.audioUrl, {
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!audioResponse.ok) {
        console.error('音频文件下载失败:', {
          status: audioResponse.status,
          statusText: audioResponse.statusText
        });
        throw new Error(`音频文件加载失败: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      
      console.log('音频文件下载成功，创建Blob');
      const blob = await audioResponse.blob();
      const blobUrl = URL.createObjectURL(blob);
      console.log('Blob URL创建成功:', blobUrl.substring(0, 30) + '...');
      return blobUrl;
    } else {
      // 普通资源使用标准方法
      url = getResourceUrl(path, true);
      console.log('加载普通资源:', url);
      
      // 尝试使用fetch API加载资源
      try {
        const response = await fetch(url, {
          credentials: 'include', // 包含凭证
          headers: {
            'X-Requested-With': 'XMLHttpRequest' // 标记为Ajax请求
          }
        });
        
        if (!response.ok) {
          console.error('资源加载失败:', {
            status: response.status,
            statusText: response.statusText
          });
          throw new Error(`资源加载失败: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('Blob URL创建成功:', blobUrl.substring(0, 30) + '...');
        return blobUrl; // 创建一个临时的Blob URL
      } catch (fetchError) {
        // 如果fetch失败，尝试使用XMLHttpRequest作为备选方案
        console.warn('Fetch API加载失败，尝试使用XMLHttpRequest:', fetchError);
        
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'blob';
          xhr.withCredentials = true;
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              const blob = xhr.response;
              const blobUrl = URL.createObjectURL(blob);
              console.log('XMLHttpRequest成功，Blob URL创建成功:', blobUrl.substring(0, 30) + '...');
              resolve(blobUrl);
            } else {
              console.error('XMLHttpRequest失败:', {
                status: xhr.status,
                statusText: xhr.statusText
              });
              reject(new Error(`XMLHttpRequest失败: ${xhr.status} ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = function(e) {
            console.error('XMLHttpRequest错误:', e);
            reject(new Error('XMLHttpRequest网络错误'));
          };
          
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          xhr.send();
        });
      }
    }
  } catch (error) {
    console.error('资源加载错误:', error);
    throw error;
  }
};

/**
 * 释放Blob URL资源
 * @param {string} url - 要释放的Blob URL
 */
export const revokeResourceUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export default {
  getResourceUrl,
  getImageUrl,
  loadImage,
  loadAudio,
  loadResourceViaProxy,
  revokeResourceUrl
}; 