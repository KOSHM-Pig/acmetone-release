/**
 * LRC歌词制作工具类
 * 基于lrc-maker项目，适配Acmetone平台
 */

// LRC时间格式转换工具
export class LrcTimeUtils {
  /**
   * 将秒数转换为LRC时间格式 [mm:ss.xx]
   * @param {number} seconds 秒数
   * @returns {string} LRC时间格式
   */
  static secondsToLrcTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '[00:00.00]';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);
    
    return `[${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}]`;
  }

  /**
   * 将LRC时间格式转换为秒数
   * @param {string} lrcTime LRC时间格式 [mm:ss.xx]
   * @returns {number} 秒数
   */
  static lrcTimeToSeconds(lrcTime) {
    const match = lrcTime.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
    if (!match) return 0;
    
    const [, minutes, seconds, centiseconds] = match;
    return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100;
  }

  /**
   * 格式化显示时间
   * @param {number} seconds 秒数
   * @returns {string} 显示格式 mm:ss
   */
  static formatDisplayTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// LRC解析器
export class LrcParser {
  /**
   * 解析LRC文件内容
   * @param {string} content LRC文件内容
   * @returns {Object} 解析结果
   */
  static parse(content) {
    const lines = content.split('\n');
    const metadata = {};
    const lyrics = [];
    
    lines.forEach((line, index) => {
      line = line.trim();
      if (!line) return;
      
      // 解析元数据 [ar:艺术家] [ti:标题] [al:专辑] 等
      const metaMatch = line.match(/^\[(\w+):(.+)\]$/);
      if (metaMatch) {
        const [, key, value] = metaMatch;
        metadata[key] = value.trim();
        return;
      }
      
      // 解析歌词行 [mm:ss.xx]歌词内容
      const lyricMatch = line.match(/^(\[[\d:.,]+\])+(.*)$/);
      if (lyricMatch) {
        const timeTagsStr = lyricMatch[1];
        const text = lyricMatch[2].trim();
        
        // 提取所有时间标签
        const timeTags = timeTagsStr.match(/\[\d{2}:\d{2}\.\d{2}\]/g) || [];
        
        timeTags.forEach(timeTag => {
          const time = LrcTimeUtils.lrcTimeToSeconds(timeTag);
          lyrics.push({
            id: `${index}-${time}`,
            time,
            timeTag,
            text,
            originalLine: line
          });
        });
      } else {
        // 无时间标签的歌词行
        lyrics.push({
          id: `${index}-no-time`,
          time: null,
          timeTag: '',
          text: line,
          originalLine: line
        });
      }
    });
    
    // 按时间排序
    lyrics.sort((a, b) => {
      if (a.time === null) return 1;
      if (b.time === null) return -1;
      return a.time - b.time;
    });
    
    return {
      metadata,
      lyrics,
      duration: lyrics.length > 0 ? Math.max(...lyrics.filter(l => l.time !== null).map(l => l.time)) : 0
    };
  }

  /**
   * 生成LRC文件内容
   * @param {Object} lrcData LRC数据
   * @returns {string} LRC文件内容
   */
  static stringify(lrcData) {
    const { metadata, lyrics } = lrcData;
    const lines = [];
    
    // 添加元数据
    Object.entries(metadata).forEach(([key, value]) => {
      if (value) {
        lines.push(`[${key}:${value}]`);
      }
    });
    
    if (lines.length > 0) {
      lines.push(''); // 空行分隔
    }
    
    // 添加歌词
    lyrics.forEach(lyric => {
      if (lyric.time !== null) {
        lines.push(`${lyric.timeTag}${lyric.text}`);
      } else if (lyric.text) {
        lines.push(lyric.text);
      }
    });
    
    return lines.join('\n');
  }
}

// 音频处理工具
export class AudioUtils {
  /**
   * 创建音频上下文
   * @returns {AudioContext} 音频上下文
   */
  static createAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
  }

  /**
   * 加载音频文件
   * @param {File} file 音频文件
   * @returns {Promise<string>} 音频URL
   */
  static loadAudioFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }
      
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      
      audio.addEventListener('canplaythrough', () => {
        resolve(url);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      });
      
      audio.load();
    });
  }

  /**
   * 获取音频时长
   * @param {string} audioUrl 音频URL
   * @returns {Promise<number>} 音频时长（秒）
   */
  static getAudioDuration(audioUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        reject(new Error('Failed to get audio duration'));
      });
      
      audio.load();
    });
  }
}

// 文件处理工具
export class FileUtils {
  /**
   * 下载文件
   * @param {string} content 文件内容
   * @param {string} filename 文件名
   * @param {string} mimeType MIME类型
   */
  static downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * 读取文件内容
   * @param {File} file 文件对象
   * @returns {Promise<string>} 文件内容
   */
  static readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * 验证文件类型
   * @param {File} file 文件对象
   * @param {Array} allowedTypes 允许的文件类型
   * @returns {boolean} 是否有效
   */
  static validateFileType(file, allowedTypes) {
    if (!file) return false;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    return allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type.slice(1);
      }
      return mimeType.includes(type);
    });
  }
}

// 快捷键管理
export class KeyboardManager {
  constructor() {
    this.shortcuts = new Map();
    this.isEnabled = true;
  }

  /**
   * 注册快捷键
   * @param {string} key 按键组合
   * @param {Function} callback 回调函数
   * @param {Object} options 选项
   */
  register(key, callback, options = {}) {
    this.shortcuts.set(key, { callback, options });
  }

  /**
   * 注销快捷键
   * @param {string} key 按键组合
   */
  unregister(key) {
    this.shortcuts.delete(key);
  }

  /**
   * 处理按键事件
   * @param {KeyboardEvent} event 键盘事件
   */
  handleKeyDown(event) {
    if (!this.isEnabled) return;
    
    const key = this.getKeyString(event);
    const shortcut = this.shortcuts.get(key);
    
    if (shortcut) {
      const { callback, options } = shortcut;
      
      if (options.preventDefault !== false) {
        event.preventDefault();
      }
      
      if (options.stopPropagation !== false) {
        event.stopPropagation();
      }
      
      callback(event);
    }
  }

  /**
   * 获取按键字符串
   * @param {KeyboardEvent} event 键盘事件
   * @returns {string} 按键字符串
   */
  getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    parts.push(event.code.toLowerCase());
    
    return parts.join('+');
  }

  /**
   * 启用快捷键
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * 禁用快捷键
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * 清除所有快捷键
   */
  clear() {
    this.shortcuts.clear();
  }
}

// 本地存储管理
export class StorageManager {
  static STORAGE_KEY = 'acmetone_lrc_maker';

  /**
   * 保存LRC数据
   * @param {Object} data LRC数据
   */
  static saveLrcData(data) {
    try {
      const serialized = JSON.stringify({
        ...data,
        timestamp: Date.now()
      });
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save LRC data:', error);
    }
  }

  /**
   * 加载LRC数据
   * @returns {Object|null} LRC数据
   */
  static loadLrcData() {
    try {
      const serialized = localStorage.getItem(this.STORAGE_KEY);
      if (!serialized) return null;
      
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to load LRC data:', error);
      return null;
    }
  }

  /**
   * 清除LRC数据
   */
  static clearLrcData() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * 获取存储大小
   * @returns {number} 存储大小（字节）
   */
  static getStorageSize() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? new Blob([data]).size : 0;
  }
}
