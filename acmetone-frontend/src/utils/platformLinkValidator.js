/**
 * 音乐平台链接格式验证工具
 * 根据Release_Rule规范验证各平台链接格式
 */

import { platformRegex, validatePlatformUrl } from './constants';

// 平台链接示例
const platformExamples = {
  netease: 'https://music.163.com/#/artist?id=12345678',
  qq: 'https://y.qq.com/n/ryqq/singer/123456',
  kugou: 'https://www.kugou.com/singer/info/123456',
  kuwo: 'https://kuwo.cn/singer_detail/123456',
  qishui: 'https://qishui.douyin.com/s/123456',
  spotify: 'https://open.spotify.com/artist/123456abcdef',
  youtube: 'https://music.youtube.com/channel/ABCDEFGHIJKLMNOPQRST',
  appleMusic: 'https://music.apple.com/cn/artist/artist-name/123456',
  soundCloud: 'https://soundcloud.com/artist-name'
};

/**
 * 验证平台链接格式
 * @param {string} platform - 平台名称
 * @param {string} link - 要验证的链接
 * @returns {boolean} - 链接是否有效
 */
export const validatePlatformLink = (platform, link) => {
  return validatePlatformUrl(link, platform);
};

/**
 * 获取平台链接示例
 * @param {string} platform - 平台名称
 * @returns {string} - 链接示例
 */
export const getPlatformLinkExample = (platform) => {
  return platformExamples[platform] || '';
};

/**
 * 验证所有平台链接
 * @param {Object} platforms - 包含所有平台链接的对象
 * @returns {Object} - 包含每个平台链接验证结果的对象
 */
export const validateAllPlatformLinks = (platforms) => {
  const results = {};
  
  for (const platform in platforms) {
    if (Object.prototype.hasOwnProperty.call(platforms, platform)) {
      results[platform] = validatePlatformLink(platform, platforms[platform]);
    }
  }
  
  return results;
};

/**
 * 尝试修复平台链接格式
 * @param {string} platform - 平台名称
 * @param {string} link - 要修复的链接
 * @returns {string} - 修复后的链接
 */
export const fixPlatformLink = (platform, link) => {
  if (!link || link.trim() === '') {
    return '';
  }
  
  // 提取ID部分
  let id = '';
  
  switch (platform) {
    case 'netease':
      // 尝试从链接中提取ID
      const neteaseMatch = link.match(/id=(\d+)/);
      if (neteaseMatch) {
        id = neteaseMatch[1];
        return `https://music.163.com/#/artist?id=${id}`;
      }
      break;
      
    case 'qq':
      // 尝试从链接中提取歌手ID
      const qqMatch = link.match(/singer\/(\w+)/);
      if (qqMatch) {
        id = qqMatch[1];
        return `https://y.qq.com/n/ryqq/singer/${id}`;
      }
      break;
      
    // 其他平台的修复逻辑...
    
    default:
      return link; // 未知平台，返回原链接
  }
  
  return link; // 无法修复，返回原链接
};

export default {
  validatePlatformLink,
  getPlatformLinkExample,
  validateAllPlatformLinks,
  fixPlatformLink
}; 