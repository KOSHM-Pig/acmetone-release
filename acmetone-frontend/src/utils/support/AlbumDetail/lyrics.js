import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL } from '@/config';

export const createLyricsFunctions = (songForm, lyricsFileList, translationLyricsFileList) => {
  // 歌词预览相关变量
  const lyricsPreviewVisible = ref(false);
  const lyricsPreviewTitle = ref('歌词预览');
  const lyricsPreviewLoading = ref(false);
  const lyricsPreviewError = ref('');
  const parsedLyrics = ref([]);
  const parsedTranslationLyrics = ref([]);
  const currentPreviewLyrics = ref([]);
  const showDualLyrics = ref(false);
  const combinedLyricsPreviewVisible = ref(false);
  const combinedLyrics = ref([]);
  const currentEditingLyricsPath = ref('');
  const currentEditingTranslationLyricsPath = ref('');
  const isEditingLyrics = ref(false);
  const editedLyrics = ref([]);

  // 处理歌词文件变更
  const handleLyricsChange = (file) => {
    // 检查文件大小
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.raw.size > maxSize) {
      ElMessage.error('歌词文件大小不能超过2MB!');
      lyricsFileList.value = [];
      songForm.lyricsFile = null;
      return false;
    }
  
    lyricsFileList.value = [file];
    songForm.lyricsFile = file.raw;
    return true;
  };
  
  // 处理翻译歌词文件变更
  const handleTranslationLyricsChange = (file) => {
    // 检查文件大小
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.raw.size > maxSize) {
      ElMessage.error('歌词文件大小不能超过2MB!');
      translationLyricsFileList.value = [];
      songForm.translationLyricsFile = null;
      return false;
    }
  
    translationLyricsFileList.value = [file];
    songForm.translationLyricsFile = file.raw;
    return true;
  };
  
  // 处理歌词文件移除
  const handleLyricsRemove = () => {
    lyricsFileList.value = [];
    songForm.lyricsFile = null;
  };
  
  // 处理翻译歌词文件移除
  const handleTranslationLyricsRemove = () => {
    translationLyricsFileList.value = [];
    songForm.translationLyricsFile = null;
  };
  
  // 创建一个专门用于上传歌词文件的函数
  const uploadLyricsFiles = async (albumId, songId, lyricsFile, translationLyricsFile, progressCallback) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      // 准备表单数据
      const formData = new FormData();
      
      // 添加歌词文件(如果存在)
      if (lyricsFile) {
        formData.append('lyricsFile', lyricsFile);
      }
      
      // 添加翻译歌词文件(如果存在)
      if (translationLyricsFile) {
        formData.append('translationLyricsFile', translationLyricsFile);
      }
      
      // 如果两个文件都不存在，则直接返回
      if (!lyricsFile && !translationLyricsFile) {
        return null;
      }
      
      // 发送请求到后端
      const response = await axios.post(
        `${API_BASE_URL}/albums/${albumId}/songs/${songId}/lyrics`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            if (progressCallback) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              progressCallback(progress);
            }
          }
        }
      );
      
      ElMessage.success('歌词文件上传成功');
      return response.data;
    } catch (error) {
      console.error('上传歌词文件错误:', error);
      console.error('错误详情:', error.response?.data || error.message);
      ElMessage.error(`上传歌词文件失败: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  };
  
  // 处理音频加载错误
  const handleAudioError = (song, event) => {
    console.error('音频播放错误:', event);
    song.audioError = true;
    song.audioErrorMessage = '音频播放失败，请重试';
    ElMessage.error('音频播放失败，请重试');
  };
  
  // 格式化歌词时间
  const formatLyricsTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };
  
  // 解析LRC文件
  const parseLrcFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const content = e.target.result;
        resolve(parseLrcContent(content));
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };
  
  // 预览歌词
  const previewLyrics = async (type) => {
    lyricsPreviewVisible.value = true;
    lyricsPreviewLoading.value = true;
    lyricsPreviewError.value = '';
    parsedLyrics.value = [];
    parsedTranslationLyrics.value = [];
    currentPreviewLyrics.value = [];
    showDualLyrics.value = false;
    
    // 重置编辑状态
    isEditingLyrics.value = false;
    isEditingTranslationLyrics.value = false;
    editingLyricsContent.value = '';
    editingTranslationLyricsContent.value = '';
    
    // 记录当前编辑的歌曲ID
    currentEditingSongId.value = songForm.editingSongId || null;
    
    try {
      if (type === 'main') {
        lyricsPreviewTitle.value = '歌词预览';
        // 获取歌词文件，优先使用新上传的文件，如果没有则使用原始文件路径
        const file = songForm.lyricsFile || (lyricsFileList.value.length > 0 && lyricsFileList.value[0].raw ? lyricsFileList.value[0].raw : null);
        
        if (file) {
          // 如果有新上传的文件，直接解析
          const lyrics = await parseLrcFile(file);
          parsedLyrics.value = lyrics;
          currentPreviewLyrics.value = lyrics;
          currentEditingLyricsPath.value = ''; // 新文件还没有路径
        } else if (songForm.originalLyricsFile && songForm.isEditing) {
          // 如果是编辑模式且有原始歌词文件路径，从服务器获取歌词内容
          const lyrics = await fetchLyricsFromServer(songForm.originalLyricsFile);
          parsedLyrics.value = lyrics;
          currentPreviewLyrics.value = lyrics;
          currentEditingLyricsPath.value = songForm.originalLyricsFile;
        } else {
          throw new Error('没有可用的歌词文件');
        }
        
        // 检查是否有翻译歌词
        const translationFile = songForm.translationLyricsFile || 
          (translationLyricsFileList.value.length > 0 && translationLyricsFileList.value[0].raw ? translationLyricsFileList.value[0].raw : null);
        
        if (translationFile) {
          // 如果有新上传的翻译歌词，解析并准备双语预览
          try {
            const translationLyrics = await parseLrcFile(translationFile);
            parsedTranslationLyrics.value = translationLyrics;
            showDualLyrics.value = true;
            currentEditingTranslationLyricsPath.value = ''; // 新文件还没有路径
          } catch (e) {
            console.error('解析翻译歌词失败:', e);
            // 继续显示主歌词
          }
        } else if (songForm.originalTranslationLyricsFile && songForm.isEditing) {
          // 如果是编辑模式且有原始翻译歌词文件路径，从服务器获取歌词内容
          try {
            const translationLyrics = await fetchLyricsFromServer(songForm.originalTranslationLyricsFile);
            parsedTranslationLyrics.value = translationLyrics;
            showDualLyrics.value = true;
            currentEditingTranslationLyricsPath.value = songForm.originalTranslationLyricsFile;
          } catch (e) {
            console.error('获取原始翻译歌词失败:', e);
            // 继续显示主歌词
          }
        }
      } else if (type === 'translation') {
        lyricsPreviewTitle.value = '翻译歌词预览';
        // 获取翻译歌词文件，优先使用新上传的文件，如果没有则使用原始文件路径
        const file = songForm.translationLyricsFile || 
          (translationLyricsFileList.value.length > 0 && translationLyricsFileList.value[0].raw ? translationLyricsFileList.value[0].raw : null);
        
        if (file) {
          // 如果有新上传的文件，直接解析
          const lyrics = await parseLrcFile(file);
          parsedTranslationLyrics.value = lyrics;
          currentPreviewLyrics.value = lyrics;
          currentEditingTranslationLyricsPath.value = ''; // 新文件还没有路径
        } else if (songForm.originalTranslationLyricsFile && songForm.isEditing) {
          // 如果是编辑模式且有原始翻译歌词文件路径，从服务器获取歌词内容
          const lyrics = await fetchLyricsFromServer(songForm.originalTranslationLyricsFile);
          parsedTranslationLyrics.value = lyrics;
          currentPreviewLyrics.value = lyrics;
          currentEditingTranslationLyricsPath.value = songForm.originalTranslationLyricsFile;
        } else {
          throw new Error('没有可用的翻译歌词文件');
        }
        
        // 检查是否有主歌词
        const mainFile = songForm.lyricsFile || (lyricsFileList.value.length > 0 && lyricsFileList.value[0].raw ? lyricsFileList.value[0].raw : null);
        
        if (mainFile) {
          // 如果有新上传的主歌词，解析并准备双语预览
          try {
            const mainLyrics = await parseLrcFile(mainFile);
            parsedLyrics.value = mainLyrics;
            showDualLyrics.value = true;
            currentEditingLyricsPath.value = ''; // 新文件还没有路径
          } catch (e) {
            console.error('解析主歌词失败:', e);
            // 继续显示翻译歌词
          }
        } else if (songForm.originalLyricsFile && songForm.isEditing) {
          // 如果是编辑模式且有原始歌词文件路径，从服务器获取歌词内容
          try {
            const mainLyrics = await fetchLyricsFromServer(songForm.originalLyricsFile);
            parsedLyrics.value = mainLyrics;
            showDualLyrics.value = true;
            currentEditingLyricsPath.value = songForm.originalLyricsFile;
          } catch (e) {
            console.error('获取原始主歌词失败:', e);
            // 继续显示翻译歌词
          }
        }
      }
    } catch (error) {
      lyricsPreviewError.value = error.message;
      console.error('预览歌词错误:', error);
    } finally {
      lyricsPreviewLoading.value = false;
    }
  };
  
  // 从服务器获取歌词
  const fetchLyricsFromServer = async (lyricsFilePath) => {
    try {
      
      // 构建API URL - 使用新的独立歌词API
      const apiUrl = `${API_BASE_URL}/lyrics?path=${encodeURIComponent(lyricsFilePath)}`;
      
      // 请求API获取歌词内容 - 移除token验证
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('歌词API响应错误:', {
            status: response.status,
            statusText: response.statusText
          });
          
          // 尝试读取错误响应内容
          const errorText = await response.text();
          console.error('错误响应内容:', errorText);
          
          // 如果API请求失败，尝试备用方案：直接解析LRC内容
          return await parseLrcContentDirectly(lyricsFilePath);
        }
        
        const data = await response.json();
        
        if (!data.content) {
          console.warn('服务器返回了空的歌词内容');
          // 尝试备用方案
          return await parseLrcContentDirectly(lyricsFilePath);
        }
        
        // 解析歌词内容
        const lyrics = [];
        const content = data.content;
        
        // 增强的正则表达式，支持更多格式的时间标签
        const regex = /\[(\d{2}):(\d{2})[\.\:](\d{2})\](.*)/g;
        let match;
        
        // 如果没有匹配到任何歌词行，尝试显示原始内容
        let hasMatches = false;
        
        while ((match = regex.exec(content)) !== null) {
          hasMatches = true;
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          const milliseconds = parseInt(match[3]);
          const text = match[4].trim();
          
          const timeInSeconds = minutes * 60 + seconds + milliseconds / 100;
          
          lyrics.push({
            time: timeInSeconds,
            text: text
          });
        }
        
        // 如果没有匹配到任何歌词行，尝试按行分割并创建简单的时间序列
        if (!hasMatches && content.trim()) {
          
          const lines = content.split('\n').filter(line => line.trim());
          lines.forEach((line, index) => {
            // 为每行创建一个简单的时间序列 (每行间隔3秒)
            lyrics.push({
              time: index * 3,
              text: line.trim()
            });
          });
        }
        
        // 按时间排序
        lyrics.sort((a, b) => a.time - b.time);
        
        return lyrics;
      } catch (fetchError) {
        console.error('获取歌词API请求失败:', fetchError);
        // 尝试备用方案
        return await parseLrcContentDirectly(lyricsFilePath);
      }
    } catch (error) {
      console.error('从服务器获取歌词失败:', error);
      throw new Error(`获取歌词失败: ${error.message}`);
    }
  };
  
  // 直接解析LRC内容
  const parseLrcContentDirectly = async (lyricsFilePath) => {
    
    try {
      // 提取歌词文件名
      const fileName = lyricsFilePath.split('/').pop() || lyricsFilePath;
      
      // 尝试直接从文件名中提取有用信息
      let fileInfo = '未知歌词文件';
      if (fileName) {
        // 移除时间戳和前缀
        const cleanName = fileName.replace(/^(lyrics|translation)_lyrics_\d+_/, '').replace(/^translation_/, '');
        fileInfo = cleanName || fileName;
      }
      
      // 创建一个简单的歌词结构
      const lyrics = [
        { time: 0, text: '[备用歌词] 无法从服务器获取歌词，显示备用内容' },
        { time: 1, text: `歌词文件: ${fileInfo}` },
        { time: 2, text: '请检查服务器日志以获取更多信息' },
        { time: 3, text: '或者尝试重新上传歌词文件' }
      ];
      
      return lyrics;
    } catch (error) {
      console.error('备用歌词解析失败:', error);
      return [
        { time: 0, text: '无法解析歌词文件' },
        { time: 1, text: '请尝试重新上传歌词文件' }
      ];
    }
  };
  
  // 预览双语对照歌词
  const previewCombinedLyrics = () => {
    if (!parsedLyrics.value.length || !parsedTranslationLyrics.value.length) {
      ElMessage.warning('需要同时上传原文歌词和翻译歌词才能预览双语对照');
      return;
    }
    
    // 合并两种歌词
    const combined = [];
    const mainLyrics = [...parsedLyrics.value];
    const transLyrics = [...parsedTranslationLyrics.value];
    
    // 为每个主歌词行找到最接近的翻译歌词行
    mainLyrics.forEach(mainLine => {
      const mainTime = mainLine.time;
      let closestTransLine = null;
      let minTimeDiff = Number.MAX_VALUE;
      
      transLyrics.forEach(transLine => {
        const timeDiff = Math.abs(transLine.time - mainTime);
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestTransLine = transLine;
        }
      });
      
      // 如果时间差在1秒内，认为是对应的翻译
      if (closestTransLine && minTimeDiff < 1) {
        combined.push({
          time: mainLine.time,
          text: mainLine.text,
          translation: closestTransLine.text
        });
      } else {
        combined.push({
          time: mainLine.time,
          text: mainLine.text,
          translation: ''
        });
      }
    });
    
    // 添加没有匹配到的翻译歌词
    transLyrics.forEach(transLine => {
      const transTime = transLine.time;
      // 检查是否已经添加过这个时间点附近的翻译
      const exists = combined.some(line => Math.abs(line.time - transTime) < 1);
      
      if (!exists) {
        combined.push({
          time: transLine.time,
          text: '',
          translation: transLine.text
        });
      }
    });
    
    // 按时间排序
    combined.sort((a, b) => a.time - b.time);
    
    combinedLyrics.value = combined;
    combinedLyricsPreviewVisible.value = true;
    lyricsPreviewVisible.value = false;
  };
  
  // 歌词编辑相关变量
  const isEditingTranslationLyrics = ref(false);
  const editingLyricsContent = ref('');
  const editingTranslationLyricsContent = ref('');
  const savingLyrics = ref(false);
  const currentEditingSongId = ref(null);
  
  // 检查是否可以编辑歌词
  const canEditLyrics = computed(() => {
    // 只有专辑所有者或管理员可以编辑歌词
    if (!userStore.user) return false;
    
    // 如果是管理员，始终可以编辑
    if (userStore.user.role === 'admin') return true;
    
    // 如果是专辑所有者且专辑状态允许编辑
    if (album.value?.submittedById === userStore.user.id) {
      // 检查专辑状态是否允许编辑
      return canEditSong(album.value);
    }
    
    return false;
  });
  
  // 开始编辑歌词
  const startEditLyrics = () => {
    // 根据当前预览的歌词类型决定编辑哪个歌词
    if (lyricsPreviewTitle.value.includes('翻译')) {
      // 编辑翻译歌词
      isEditingTranslationLyrics.value = true;
      
      // 将解析后的歌词转换为LRC格式文本
      editingTranslationLyricsContent.value = convertLyricsToLrcFormat(parsedTranslationLyrics.value);
    } else {
      // 编辑原文歌词
      isEditingLyrics.value = true;
      
      // 将解析后的歌词转换为LRC格式文本
      editingLyricsContent.value = convertLyricsToLrcFormat(showDualLyrics.value ? parsedLyrics.value : currentPreviewLyrics.value);
    }
  };
  
  // 取消编辑歌词
  const cancelEditLyrics = () => {
    isEditingLyrics.value = false;
    isEditingTranslationLyrics.value = false;
    editingLyricsContent.value = '';
    editingTranslationLyricsContent.value = '';
  };
  
  // 将歌词转换为LRC格式
  const convertLyricsToLrcFormat = (lyrics) => {
    if (!lyrics || !lyrics.length) return '';
    
    return lyrics.map(line => {
      const minutes = Math.floor(line.time / 60).toString().padStart(2, '0');
      const seconds = Math.floor(line.time % 60).toString().padStart(2, '0');
      const milliseconds = Math.floor((line.time % 1) * 100).toString().padStart(2, '0');
      
      return `[${minutes}:${seconds}.${milliseconds}]${line.text}`;
    }).join('\n');
  };
  
  // 保存歌词更改
  const saveLyricsChanges = async () => {
    try {
      savingLyrics.value = true;
      
      // 检查是否有歌曲ID
      if (!currentEditingSongId.value && songForm.editingSongId) {
        currentEditingSongId.value = songForm.editingSongId;
      }
      
      if (!currentEditingSongId.value) {
        ElMessage.error('无法确定要修改的歌曲，请重新打开歌词编辑');
        return;
      }
      
      // 准备要保存的歌词内容
      let lyricsContent = null;
      let translationLyricsContent = null;
      let lyricsPath = currentEditingLyricsPath.value;
      let translationLyricsPath = currentEditingTranslationLyricsPath.value;
      
      if (isEditingLyrics.value) {
        lyricsContent = editingLyricsContent.value;
        
        // 如果是在编辑模式下，需要获取歌词文件路径
        if (songForm.isEditing && songForm.originalLyricsFile) {
          lyricsPath = songForm.originalLyricsFile;
        }
      }
      
      if (isEditingTranslationLyrics.value) {
        translationLyricsContent = editingTranslationLyricsContent.value;
        
        // 如果是在编辑模式下，需要获取翻译歌词文件路径
        if (songForm.isEditing && songForm.originalTranslationLyricsFile) {
          translationLyricsPath = songForm.originalTranslationLyricsFile;
        }
      }
      
      // 调用API保存歌词
      const albumId = album.value.id;
      const songId = currentEditingSongId.value;
      
      // 获取token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      // 构建请求数据
      const requestData = {
        lyricsContent: lyricsContent,
        translationLyricsContent: translationLyricsContent,
        lyricsPath: lyricsPath,
        translationLyricsPath: translationLyricsPath
      };
      
      // 发送请求
      const response = await axios.post(
        `${API_BASE_URL}/lyrics/save/${songId}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      
      
      // 更新本地歌词数据
      if (isEditingLyrics.value) {
        // 解析保存的歌词内容
        const newLyrics = await parseLrcContent(lyricsContent);
        
        // 更新显示
        if (showDualLyrics.value) {
          parsedLyrics.value = newLyrics;
        } else {
          currentPreviewLyrics.value = newLyrics;
        }
        
        // 如果API返回了新的文件路径，更新路径
        if (response.data.lyricsPath) {
          currentEditingLyricsPath.value = response.data.lyricsPath;
          
          // 如果在编辑歌曲模式下，更新歌曲表单
          if (songForm.isEditing) {
            songForm.originalLyricsFile = response.data.lyricsPath;
          }
        }
      }
      
      if (isEditingTranslationLyrics.value) {
        // 解析保存的翻译歌词内容
        const newTranslationLyrics = await parseLrcContent(translationLyricsContent);
        
        // 更新显示
        parsedTranslationLyrics.value = newTranslationLyrics;
        
        // 如果API返回了新的文件路径，更新路径
        if (response.data.translationLyricsPath) {
          currentEditingTranslationLyricsPath.value = response.data.translationLyricsPath;
          
          // 如果在编辑歌曲模式下，更新歌曲表单
          if (songForm.isEditing) {
            songForm.originalTranslationLyricsFile = response.data.translationLyricsPath;
          }
        }
      }
      
      // 退出编辑模式
      isEditingLyrics.value = false;
      isEditingTranslationLyrics.value = false;
      
      ElMessage.success('歌词保存成功');
    } catch (error) {
      console.error('保存歌词失败:', error);
      ElMessage.error(`保存歌词失败: ${error.response?.data?.message || error.message}`);
    } finally {
      savingLyrics.value = false;
    }
  };
  
  // 解析LRC内容
  const parseLrcContent = async (content) => {
    if (!content) return [];
    
    const lyrics = [];
    
    // 增强的正则表达式，支持更多格式的时间标签
    const regex = /\[(\d{2}):(\d{2})[\.\:](\d{2})\](.*)/g;
    let match;
    
    // 如果没有匹配到任何歌词行，尝试显示原始内容
    let hasMatches = false;
    
    while ((match = regex.exec(content)) !== null) {
      hasMatches = true;
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3]);
      const text = match[4].trim();
      
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 100;
      
      lyrics.push({
        time: timeInSeconds,
        text: text
      });
    }
    
    // 如果没有匹配到任何歌词行，尝试按行分割并创建简单的时间序列
    if (!hasMatches && content.trim()) {
      
      const lines = content.split('\n').filter(line => line.trim());
      lines.forEach((line, index) => {
        // 为每行创建一个简单的时间序列 (每行间隔3秒)
        lyrics.push({
          time: index * 3,
          text: line.trim()
        });
      });
    }
    
    // 按时间排序
    lyrics.sort((a, b) => a.time - b.time);
    
    return lyrics;
  };

  return {
    handleLyricsChange,
    handleTranslationLyricsChange,
    handleLyricsRemove,
    handleTranslationLyricsRemove,
    uploadLyricsFiles,
    handleAudioError,
    formatLyricsTime,
    parseLrcFile,
    previewLyrics,
    fetchLyricsFromServer,
    parseLrcContentDirectly,
    previewCombinedLyrics,
    startEditLyrics,
    cancelEditLyrics,
    convertLyricsToLrcFormat,
    saveLyricsChanges,
    parseLrcContent,
    // 导出响应式变量
    lyricsPreviewVisible,
    lyricsPreviewTitle,
    lyricsPreviewLoading,
    lyricsPreviewError,
    parsedLyrics,
    parsedTranslationLyrics,
    currentPreviewLyrics,
    showDualLyrics,
    combinedLyricsPreviewVisible,
    combinedLyrics,
    currentEditingLyricsPath,
    currentEditingTranslationLyricsPath,
    isEditingLyrics,
    editedLyrics
  };
};

// 以下是其他歌词相关函数，暂时保留在文件中

// 歌词预览相关变量
const lyricsPreviewVisible = ref(false);
const lyricsPreviewTitle = ref('歌词预览');
const lyricsPreviewLoading = ref(false);
const lyricsPreviewError = ref('');
const parsedLyrics = ref([]);
const parsedTranslationLyrics = ref([]);
const currentPreviewLyrics = ref([]);
const showDualLyrics = ref(false);
const combinedLyricsPreviewVisible = ref(false);
const combinedLyrics = ref([]);