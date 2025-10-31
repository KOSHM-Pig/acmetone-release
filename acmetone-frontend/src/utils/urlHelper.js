import { STATIC_BASE_URL } from '@/config';

/**
 * 确保URL是完整的，避免双斜杠问题
 * @param {string} path - 资源路径
 * @returns {string} - 完整的URL
 */
export function ensureFullUrl(path) {
  if (!path) return '';
  
  // 如果已经是完整URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // 确保STATIC_BASE_URL没有尾部斜杠，path有前导斜杠
  const baseUrl = STATIC_BASE_URL.endsWith('/') ? STATIC_BASE_URL.slice(0, -1) : STATIC_BASE_URL;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
}

/**
 * 规范化路径，确保没有连续的斜杠
 * @param {string} url - 需要规范化的URL
 * @returns {string} - 规范化后的URL
 */
export function normalizeUrl(url) {
  if (!url) return '';
  
  // 替换连续的斜杠为单个斜杠，但保留协议中的双斜杠
  return url.replace(/(https?:\/\/)|(\/\/+)/g, (match) => {
    return match === '//' ? '/' : match;
  });
} 