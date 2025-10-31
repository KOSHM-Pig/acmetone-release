<!--
  LRC歌词制作组件 - 垂直布局
-->
<template>
  <div class="lrc-maker-container">
    <!-- 顶部工具栏 -->
    <div class="lrc-toolbar">
      <div class="toolbar-left">
        <h1>LRC 歌词制作器</h1>
        <div class="mode-indicator">
          <span :class="['mode-badge', isTimingMode ? 'timing' : 'editing']">
            {{ isTimingMode ? '打轴模式' : '编辑模式' }}
          </span>
          <span v-if="isTimingMode && (currentTimingLine || currentSelectedLineIndex !== null)" class="timing-info">
            {{ getCurrentLineDisplayInfo() }}
          </span>
        </div>
      </div>

      <div class="toolbar-actions">
        <button
          class="garrix-btn secondary small"
          @click="toggleBilingualMode"
          :class="{ 'active': isBilingualMode }"
          :disabled="isAutoMode"
          :title="isAutoMode ? '模式已根据歌曲语言自动设置' : ''"
        >
          {{ isBilingualMode ? '单语模式' : '双语模式' }}
        </button>

        <button
          class="garrix-btn primary"
          @click="toggleMode"
          :disabled="!audioFile || (!hasLyrics && !isTimingMode)"
        >
          {{ isTimingMode ? '编辑模式' : '打轴模式' }}
        </button>

        <button
          class="garrix-btn secondary"
          @click="exportLrcFile"
          :disabled="!hasLyrics"
        >
          导出LRC
        </button>

        <button
          class="garrix-btn danger"
          @click="clearAll"
          :disabled="!hasLyrics"
        >
          清空
        </button>
      </div>
    </div>

    <!-- 中间内容区域 -->
    <div class="lrc-content">


      <!-- 编辑模式：文本编辑器 -->
      <div v-if="!isTimingMode" class="editor-mode">
        <!-- 单语模式 -->
        <div v-if="!isBilingualMode" class="single-language-editor">
          <AcmetoneInput
            v-model="lyricsText"
            type="textarea"
            placeholder="请输入歌词内容，每行一句歌词..."
            @input="handleLyricsInput"
            ref="lyricsTextarea"
            class="large-textarea full-height"
          />
        </div>

        <!-- 双语模式 -->
        <div v-else class="bilingual-editor">
          <div class="editor-column">
            <h4 class="column-title">原文歌词</h4>
            <AcmetoneInput
              v-model="lyricsText"
              type="textarea"
              placeholder="请输入原文歌词内容，每行一句歌词..."
              @input="handleLyricsInput"
              @scroll="handleOriginalScroll"
              ref="originalLyricsTextarea"
              class="large-textarea full-height"
            />
          </div>

          <div class="editor-column">
            <h4 class="column-title">翻译歌词</h4>
            <AcmetoneInput
              v-model="translationLyricsText"
              type="textarea"
              placeholder="请输入翻译歌词内容，每行一句歌词..."
              @input="handleTranslationLyricsInput"
              @scroll="handleTranslationScroll"
              ref="translationLyricsTextarea"
              class="large-textarea full-height"
            />
          </div>
        </div>
      </div>

      <!-- 打轴模式：歌词列表 -->
      <div v-else class="timing-mode">
        <div class="timing-controls">
          <button
            class="garrix-btn secondary small"
            @click="previousTimingLine"
          >
            ↑ 上一行
          </button>
          <button
            class="garrix-btn secondary small"
            @click="nextTimingLine"
          >
            ↓ 下一行
          </button>

          <span class="timing-hint">
            按空格键插入时间戳 | 上下键导航 | 可重新打轴覆盖
            <span v-if="isBilingualMode"> | 双语模式：同时打轴原文和翻译</span>
          </span>
        </div>

        <div class="lyrics-list" ref="lyricsListRef">
          <div
            v-for="(line, index) in allLyricsLines"
            :key="index"
            :class="[
              'lyric-item',
              {
                'current': isCurrentTimingLine(line),
                'has-timestamp': line.hasTimestamp,
                'bilingual': isBilingualMode
              }
            ]"
            @click="selectTimingLine(line)"
          >
            <div class="line-number">{{ index + 1 }}</div>

            <!-- 单语模式 -->
            <div v-if="!isBilingualMode" class="line-content">
              <span v-if="line.hasTimestamp" class="timestamp">{{ extractTimestamp(line.text) }}</span>
              <span class="text">{{ extractLyricText(line.text) }}</span>
            </div>

            <!-- 双语模式 -->
            <div v-else class="bilingual-line-content">
              <div class="bilingual-text-container">
                <div class="original-line">
                  <span v-if="line.hasTimestamp" class="timestamp original">{{ extractTimestamp(line.text) }}</span>
                  <span class="text original">
                    {{ extractLyricText(line.text) }}
                  </span>
                </div>
                <div class="translation-line">
                  <span v-if="getTranslationLineData(index).hasTimestamp" class="timestamp translation">
                    {{ extractTimestamp(getTranslationLineData(index).text) }}
                  </span>
                  <span class="text translation">
                    {{ extractLyricText(getTranslationLineData(index).text) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部音频播放器 -->
    <div class="audio-player-section">
      <!-- 音频文件拖拽区域 -->
      <div
        v-if="!audioFile"
        class="audio-drop-zone"
        :class="{ 'drag-over': isDragOver }"
        @drop="handleAudioDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @click="selectAudioFile"
      >
        <p>拖拽音频文件或点击选择</p>
        <small>支持: MP3, WAV, OGG, M4A</small>
      </div>

      <!-- 音频播放控件 -->
      <div v-else class="audio-player">
        <audio
          ref="audioElement"
          :src="audioUrl"
          @loadedmetadata="handleAudioLoaded"
          @timeupdate="handleTimeUpdate"
          @ended="handleAudioEnded"
          preload="metadata"
        />

        <div class="player-container">
          <div class="audio-info">
            <div class="audio-name">{{ audioFile.name }}</div>
            <div class="audio-duration">{{ formatTime(audioDuration) }}</div>
          </div>

          <div class="player-controls">
            <button class="garrix-btn secondary small" @click="seekBackward">-5s</button>
            <button class="garrix-btn primary" @click="togglePlay">
              {{ isPlaying ? '暂停' : '播放' }}
            </button>
            <button class="garrix-btn secondary small" @click="seekForward">+5s</button>

            <div class="time-info">
              {{ formatTime(currentTime || 0) }} / {{ formatTime(audioDuration) }}
            </div>

            <div class="control-group">
              <label>速度:</label>
              <select v-model="playbackRate" @change="updatePlaybackRate">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            <div class="control-group">
              <label>音量:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                v-model="volume"
                @input="updateVolume"
                class="volume-slider"
              />
            </div>
          </div>

          <!-- 进度条 -->
          <div class="progress-container">
            <div class="progress-bar" @click="seekToPosition">
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{ width: progressPercentage + '%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="audioFileInput"
      type="file"
      accept="audio/*"
      @change="handleAudioFileSelect"
      style="display: none"
    />
  </div>
</template>



<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { API_BASE_URL } from '../config.js';
import {
  AudioUtils,
  FileUtils,
  KeyboardManager,
  LrcTimeUtils,
  StorageManager
} from '../utils/lrcUtils.js';
import AcmetoneInput from './acmetone/AcmetoneInput.vue';

// Props定义
const props = defineProps({
  // 外部传入的音频文件URL
  externalAudioUrl: {
    type: String,
    default: ''
  },
  // 外部传入的音频文件名
  externalAudioName: {
    type: String,
    default: ''
  }
});

// 响应式数据
const audioFile = ref(null);
const audioUrl = ref('');
const audioDuration = ref(0);
const currentTime = ref(null);
const isPlaying = ref(false);
const volume = ref(1);
const playbackRate = ref(1);
const isDragOver = ref(false);

// 打轴模式
const isTimingMode = ref(false);
const currentTimingLineIndex = ref(0); // 当前打轴行索引
const currentSelectedLineIndex = ref(null); // 用于跟踪已有时间戳的选中行


// 歌词文本
const lyricsText = ref('');
const translationLyricsText = ref(''); // 翻译歌词文本

// 双语模式
const isBilingualMode = ref(false); // 双语模式开关
const isAutoMode = ref(false); // 是否为自动模式（禁用手动切换）

// LRC数据
const lrcData = reactive({
  metadata: {
    ti: '', // 标题
    ar: '', // 艺术家
    al: '', // 专辑
    by: 'LRC Maker', // 制作者
  }
});

// 引用
const audioElement = ref(null);
const lyricsTextarea = ref(null);
const originalLyricsTextarea = ref(null);
const translationLyricsTextarea = ref(null);
const audioFileInput = ref(null);
const lyricsListRef = ref(null);

// 快捷键管理器
const keyboardManager = new KeyboardManager();

// 计算属性
const hasLyrics = computed(() => {
  const hasOriginal = lyricsText.value.trim().length > 0;
  if (!isBilingualMode.value) {
    return hasOriginal;
  }
  // 双语模式下，至少要有原文歌词
  return hasOriginal;
});

const progressPercentage = computed(() => {
  if (!audioDuration.value || currentTime.value === null) return 0;
  return (currentTime.value / audioDuration.value) * 100;
});

// 歌词行数组
const lyricsLines = computed(() => {
  return lyricsText.value.split('\n').map((line, index) => ({
    index,
    text: line,
    hasTimestamp: line.trim().match(/^\[\d{2}:\d{2}\.\d{2}\]/) !== null,
    isEmpty: line.trim() === ''
  }));
});

// 翻译歌词行数组
const translationLyricsLines = computed(() => {
  return translationLyricsText.value.split('\n').map((line, index) => ({
    index,
    text: line,
    hasTimestamp: line.trim().match(/^\[\d{2}:\d{2}\.\d{2}\]/) !== null,
    isEmpty: line.trim() === ''
  }));
});

// 所有非空行（用于打轴模式显示）
const allLyricsLines = computed(() => {
  return lyricsLines.value.filter(line => !line.isEmpty);
});

// 所有非空翻译行（用于双语打轴模式显示）
const allTranslationLyricsLines = computed(() => {
  return translationLyricsLines.value.filter(line => !line.isEmpty);
});

// 可打轴的行（非空且没有时间戳的行）
const timableLines = computed(() => {
  return lyricsLines.value.filter(line => !line.isEmpty && !line.hasTimestamp);
});

// 当前打轴行
const currentTimingLine = computed(() => {
  if (timableLines.value.length === 0) return null;
  const index = Math.min(currentTimingLineIndex.value, timableLines.value.length - 1);
  return timableLines.value[index];
});

// 方法
const formatTime = (seconds) => {
  return LrcTimeUtils.formatDisplayTime(seconds);
};

const handleLyricsInput = () => {
  // 歌词内容变化时保存
  saveToStorage();
};

const handleTranslationLyricsInput = () => {
  // 翻译歌词内容变化时保存
  saveToStorage();
};

// 双语模式切换
const toggleBilingualMode = () => {
  // 如果是自动模式，不允许手动切换
  if (isAutoMode.value) {
    return;
  }
  isBilingualMode.value = !isBilingualMode.value;
  saveToStorage();
};

// 获取翻译歌词文本（根据行索引）
const getTranslationText = (lineIndex) => {
  const translationLines = translationLyricsText.value.split('\n');
  return translationLines[lineIndex] || '';
};

// 获取翻译歌词行数据（根据行索引）
const getTranslationLineData = (lineIndex) => {
  const translationLines = translationLyricsText.value.split('\n');
  const line = translationLines[lineIndex] || '';
  return {
    text: line,
    hasTimestamp: line.trim().match(/^\[\d{2}:\d{2}\.\d{2}\]/) !== null,
    isEmpty: line.trim() === ''
  };
};

// 双语编辑框滚动同步 - 基于滚动百分比同步
let isScrollSyncing = false; // 防止循环同步

const handleOriginalScroll = (event) => {
  if (isScrollSyncing || !isBilingualMode.value) return;

  isScrollSyncing = true;
  const originalTextarea = event.target;

  // 获取翻译文本框的textarea元素
  const translationComponent = translationLyricsTextarea.value;
  const translationTextarea = translationComponent?.$el?.querySelector('textarea');

  if (translationTextarea && originalTextarea) {
    // 计算原文的滚动百分比
    const maxScrollTop = originalTextarea.scrollHeight - originalTextarea.clientHeight;
    const scrollPercentage = maxScrollTop > 0 ? originalTextarea.scrollTop / maxScrollTop : 0;

    // 应用相同的滚动百分比到翻译文本框
    const translationMaxScrollTop = translationTextarea.scrollHeight - translationTextarea.clientHeight;
    translationTextarea.scrollTop = scrollPercentage * translationMaxScrollTop;
  }

  // 使用nextTick确保DOM更新完成后再重置标志
  nextTick(() => {
    isScrollSyncing = false;
  });
};

const handleTranslationScroll = (event) => {
  if (isScrollSyncing || !isBilingualMode.value) return;

  isScrollSyncing = true;
  const translationTextarea = event.target;

  // 获取原文文本框的textarea元素
  const originalComponent = originalLyricsTextarea.value;
  const originalTextarea = originalComponent?.$el?.querySelector('textarea');

  if (originalTextarea && translationTextarea) {
    // 计算翻译的滚动百分比
    const maxScrollTop = translationTextarea.scrollHeight - translationTextarea.clientHeight;
    const scrollPercentage = maxScrollTop > 0 ? translationTextarea.scrollTop / maxScrollTop : 0;

    // 应用相同的滚动百分比到原文文本框
    const originalMaxScrollTop = originalTextarea.scrollHeight - originalTextarea.clientHeight;
    originalTextarea.scrollTop = scrollPercentage * originalMaxScrollTop;
  }

  // 使用nextTick确保DOM更新完成后再重置标志
  nextTick(() => {
    isScrollSyncing = false;
  });
};

const handleKeyDown = (event) => {
  // 在打轴模式下，阻止所有键盘输入
  if (isTimingMode.value) {
    event.preventDefault();
    return;
  }

  // 处理快捷键
  if (event.code === 'Space' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    insertTimestamp();
  }
};

const toggleMode = () => {
  isTimingMode.value = !isTimingMode.value;

  if (isTimingMode.value) {
    // 进入打轴模式时，重置状态
    currentTimingLineIndex.value = 0;
    currentSelectedLineIndex.value = null; // 清除特殊选中状态

    // 如果有歌词，自动选择第一个非空行
    if (allLyricsLines.value.length > 0) {
      setCurrentLineByOriginalIndex(allLyricsLines.value[0].index);
      // 自动滚动到第一行
      nextTick(() => {
        scrollToCurrentLine();
      });
    }

    // 如果音频没有播放，自动播放
    if (audioElement.value && !isPlaying.value) {
      togglePlay();
    }
  }
};

// 打轴行导航方法 - 现在可以导航到所有非空行（包括已打轴的）
const previousTimingLine = () => {
  // 找到当前行在所有歌词行中的位置
  const currentLineIndex = getCurrentLineIndexInAllLines();

  if (currentLineIndex > 0) {
    // 向上查找前一个非空行
    for (let i = currentLineIndex - 1; i >= 0; i--) {
      const line = allLyricsLines.value[i];
      if (!line.isEmpty) {
        setCurrentLineByOriginalIndex(line.index);
        scrollToCurrentLine(); // 自动滚动
        break;
      }
    }
  }
};

const nextTimingLine = () => {
  // 找到当前行在所有歌词行中的位置
  const currentLineIndex = getCurrentLineIndexInAllLines();

  if (currentLineIndex < allLyricsLines.value.length - 1) {
    // 向下查找下一个非空行
    for (let i = currentLineIndex + 1; i < allLyricsLines.value.length; i++) {
      const line = allLyricsLines.value[i];
      if (!line.isEmpty) {
        setCurrentLineByOriginalIndex(line.index);
        scrollToCurrentLine(); // 自动滚动
        break;
      }
    }
  }
};

const setCurrentTimingLine = (index) => {
  currentTimingLineIndex.value = index;
};

// 获取当前行在所有歌词行中的索引位置
const getCurrentLineIndexInAllLines = () => {
  // 如果有特殊选中的行（已有时间戳的行），优先使用它
  if (currentSelectedLineIndex.value !== null) {
    return allLyricsLines.value.findIndex(line => line.index === currentSelectedLineIndex.value);
  }

  // 否则使用当前打轴行
  if (currentTimingLine.value) {
    return allLyricsLines.value.findIndex(line => line.index === currentTimingLine.value.index);
  }

  // 如果都没有，返回第一个非空行
  return allLyricsLines.value.findIndex(line => !line.isEmpty);
};

// 根据原始行索引设置当前行
const setCurrentLineByOriginalIndex = (originalIndex) => {
  // 如果该行已有时间戳，我们仍然可以选择它进行重新打轴
  const lineInAllLines = allLyricsLines.value.find(line => line.index === originalIndex);

  if (lineInAllLines) {
    if (lineInAllLines.hasTimestamp) {
      // 对于已有时间戳的行，我们需要特殊处理
      // 创建一个临时的当前行状态
      currentSelectedLineIndex.value = originalIndex;
      currentTimingLineIndex.value = 0; // 重置普通索引
    } else {
      // 对于没有时间戳的行，正常设置到timableLines中的索引
      const timableIndex = timableLines.value.findIndex(line => line.index === originalIndex);
      if (timableIndex !== -1) {
        currentTimingLineIndex.value = timableIndex;
        currentSelectedLineIndex.value = null; // 清除特殊状态
      }
    }
  }
};

// 判断是否为当前打轴行
const isCurrentTimingLine = (line) => {
  // 如果有特殊选中的行（已有时间戳的行），检查是否匹配
  if (currentSelectedLineIndex.value !== null) {
    return line.index === currentSelectedLineIndex.value;
  }

  // 否则检查是否为当前打轴行
  if (!currentTimingLine.value) return false;
  return line.index === currentTimingLine.value.index;
};

// 选择打轴行
const selectTimingLine = (line) => {
  setCurrentLineByOriginalIndex(line.index);
  scrollToCurrentLine(); // 自动滚动
};

// 提取时间戳
const extractTimestamp = (text) => {
  const match = text.match(/^\[\d{2}:\d{2}\.\d{2}\]/);
  return match ? match[0] : '';
};

// 提取歌词文本
const extractLyricText = (text) => {
  return text.replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
};

// 获取当前行显示信息
const getCurrentLineDisplayInfo = () => {
  const currentIndex = getCurrentLineIndexInAllLines();
  if (currentIndex === -1) return '无选中行';

  const lineNumber = currentIndex + 1;
  const totalLines = allLyricsLines.value.length;

  if (currentSelectedLineIndex.value !== null) {
    return `第${lineNumber}/${totalLines}行 (已打轴)`;
  } else {
    const remainingLines = timableLines.value.length;
    return `第${lineNumber}/${totalLines}行 (剩余${remainingLines}行)`;
  }
};

// 自动滚动到当前行
const scrollToCurrentLine = () => {
  if (!lyricsListRef.value || !isTimingMode.value) return;

  nextTick(() => {
    const currentIndex = getCurrentLineIndexInAllLines();
    if (currentIndex === -1) return;

    const listElement = lyricsListRef.value;
    const allItems = listElement.querySelectorAll('.lyric-item');
    const currentItem = allItems[currentIndex];

    if (currentItem && listElement) {
      // 计算当前行相对于列表容器的位置
      const itemTop = currentItem.offsetTop;
      const itemHeight = currentItem.offsetHeight;
      const listHeight = listElement.clientHeight;
      const scrollTop = listElement.scrollTop;

      // 如果当前行不在可视区域内，则滚动到合适位置
      const itemBottom = itemTop + itemHeight;
      const visibleTop = scrollTop;
      const visibleBottom = scrollTop + listHeight;

      if (itemTop < visibleTop) {
        // 当前行在可视区域上方，滚动到顶部
        listElement.scrollTop = itemTop - 20; // 留一点边距
      } else if (itemBottom > visibleBottom) {
        // 当前行在可视区域下方，滚动到底部
        listElement.scrollTop = itemBottom - listHeight + 20; // 留一点边距
      }
      // 如果当前行已经在可视区域内，则不需要滚动
    }
  });
};

const insertTimestamp = () => {
  if (currentTime.value === null) return;

  // 在打轴模式下，自动找到当前应该插入时间戳的行
  if (isTimingMode.value) {
    insertTimestampInTimingMode();
  } else {
    insertTimestampAtCursor();
  }
};

const insertTimestampAtCursor = () => {
  if (!lyricsTextarea.value) return;

  const textarea = lyricsTextarea.value.$el.querySelector('textarea');
  if (!textarea) return;

  const cursorPosition = textarea.selectionStart;
  const textBefore = lyricsText.value.substring(0, cursorPosition);
  const textAfter = lyricsText.value.substring(cursorPosition);

  // 检查光标是否在行首
  const lastNewlineIndex = textBefore.lastIndexOf('\n');
  const lineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
  const beforeCursor = textBefore.substring(lineStart);

  // 如果行首已经有时间戳，则不插入
  if (beforeCursor.match(/^\[\d{2}:\d{2}\.\d{2}\]/)) {
    return;
  }

  const timeTag = LrcTimeUtils.secondsToLrcTime(currentTime.value);
  const newText = textBefore.substring(0, lineStart) + timeTag + beforeCursor + textAfter;

  lyricsText.value = newText;

  // 恢复光标位置
  nextTick(() => {
    const newCursorPosition = cursorPosition + timeTag.length;
    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    textarea.focus();
  });

  saveToStorage();
};

const insertTimestampInTimingMode = () => {
  const timeTag = LrcTimeUtils.secondsToLrcTime(currentTime.value);
  let targetLineIndex;

  // 确定目标行索引
  if (currentSelectedLineIndex.value !== null) {
    // 如果选中的是已有时间戳的行，覆盖它
    targetLineIndex = currentSelectedLineIndex.value;
  } else if (currentTimingLine.value) {
    // 否则使用当前打轴行
    targetLineIndex = currentTimingLine.value.index;
  } else {
    return; // 没有可操作的行
  }

  // 记录下一个应该打轴的行的原始索引（仅在添加新时间戳时）
  const nextTargetIndex = currentSelectedLineIndex.value === null ?
    findNextTimableLineIndex(targetLineIndex) : null;

  // 给原文歌词加时间戳
  const originalLines = lyricsText.value.split('\n');
  const originalLine = originalLines[targetLineIndex];
  const originalLineText = originalLine.replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
  originalLines[targetLineIndex] = timeTag + originalLineText;
  lyricsText.value = originalLines.join('\n');

  // 如果是双语模式，同时给翻译歌词加时间戳
  if (isBilingualMode.value) {
    const translationLines = translationLyricsText.value.split('\n');

    // 确保翻译歌词有足够的行数
    while (translationLines.length <= targetLineIndex) {
      translationLines.push('');
    }

    // 给翻译歌词加相同的时间戳
    const translationLine = translationLines[targetLineIndex] || '';
    const translationLineText = translationLine.replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
    translationLines[targetLineIndex] = timeTag + translationLineText;
    translationLyricsText.value = translationLines.join('\n');
  }

  // 等待下一个tick，让计算属性更新
  nextTick(() => {
    if (currentSelectedLineIndex.value !== null) {
      // 如果是覆盖已有时间戳的行，保持在当前行
      currentSelectedLineIndex.value = null; // 清除特殊状态
      // 重新设置到正确的位置
      setCurrentLineByOriginalIndex(targetLineIndex);
    } else if (nextTargetIndex !== -1) {
      // 如果有下一个可打轴的行，移动到它
      const newTimableIndex = timableLines.value.findIndex(line => line.index === nextTargetIndex);
      if (newTimableIndex !== -1) {
        currentTimingLineIndex.value = newTimableIndex;
      }
    }
    // 自动滚动到当前行
    scrollToCurrentLine();
  });

  saveToStorage();
};

// 查找下一个可打轴行的原始索引
const findNextTimableLineIndex = (currentIndex) => {
  const lines = lyricsText.value.split('\n');
  for (let i = currentIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const isEmpty = line.trim() === '';
    const hasTimestamp = line.trim().match(/^\[\d{2}:\d{2}\.\d{2}\]/) !== null;
    if (!isEmpty && !hasTimestamp) {
      return i;
    }
  }
  return -1; // 没有找到下一个可打轴的行
};

// 音频相关方法
const selectAudioFile = () => {
  audioFileInput.value?.click();
};

const handleAudioFileSelect = async (event) => {
  const file = event.target.files[0];
  if (file) {
    await loadAudioFile(file);
  }
};

const handleAudioDrop = async (event) => {
  event.preventDefault();
  isDragOver.value = false;
  
  const files = Array.from(event.dataTransfer.files);
  const audioFile = files.find(file => file.type.startsWith('audio/'));
  
  if (audioFile) {
    await loadAudioFile(audioFile);
  }
};

const loadAudioFile = async (file) => {
    audioFile.value = file;
    audioUrl.value = await AudioUtils.loadAudioFile(file);
};

const handleAudioLoaded = () => {
  if (audioElement.value) {
    audioDuration.value = audioElement.value.duration;
  }
};

const handleTimeUpdate = () => {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime;
    updateCurrentLyric();
  }
};

const handleAudioEnded = () => {
  isPlaying.value = false;
  currentLyricIndex.value = -1;
};

const togglePlay = () => {
  if (!audioElement.value) return;
  
  if (isPlaying.value) {
    audioElement.value.pause();
  } else {
    audioElement.value.play();
  }
  
  isPlaying.value = !isPlaying.value;
};

const seekBackward = () => {
  if (audioElement.value) {
    audioElement.value.currentTime = Math.max(0, audioElement.value.currentTime - 5);
  }
};

const seekForward = () => {
  if (audioElement.value) {
    audioElement.value.currentTime = Math.min(audioDuration.value, audioElement.value.currentTime + 5);
  }
};

const seekToPosition = (event) => {
  if (!audioElement.value) return;
  
  const rect = event.currentTarget.getBoundingClientRect();
  const percentage = (event.clientX - rect.left) / rect.width;
  audioElement.value.currentTime = percentage * audioDuration.value;
};

const updateVolume = () => {
  if (audioElement.value) {
    audioElement.value.volume = volume.value;
  }
  // 更新滑块的视觉效果
  const volumeSlider = document.querySelector('.volume-slider');
  if (volumeSlider) {
    const percentage = (volume.value * 100) + '%';
    volumeSlider.style.setProperty('--volume-percent', percentage);
  }
};

const updatePlaybackRate = () => {
  if (audioElement.value) {
    audioElement.value.playbackRate = parseFloat(playbackRate.value);
  }
};

const updateCurrentLyric = () => {
  if (currentTime.value === null || !lrcData.lyrics) return;

  const lyricsWithTime = lrcData.lyrics.filter(l => l && l.time !== null);
  let newCurrentIndex = -1;

  for (let i = 0; i < lyricsWithTime.length; i++) {
    if (lyricsWithTime[i] && lyricsWithTime[i].time <= currentTime.value) {
      newCurrentIndex = lrcData.lyrics.indexOf(lyricsWithTime[i]);
    } else {
      break;
    }
  }

  currentLyricIndex.value = newCurrentIndex;
};

// 文件操作
const exportLrcFile = () => {
  // 解析歌词文本生成LRC内容
  const lines = lyricsText.value.split('\n');
  const lrcLines = [];

  // 添加元数据
  if (lrcData.metadata.ti) lrcLines.push(`[ti:${lrcData.metadata.ti}]`);
  if (lrcData.metadata.ar) lrcLines.push(`[ar:${lrcData.metadata.ar}]`);
  if (lrcData.metadata.al) lrcLines.push(`[al:${lrcData.metadata.al}]`);
  if (lrcData.metadata.by) lrcLines.push(`[by:${lrcData.metadata.by}]`);

  if (lrcLines.length > 0) lrcLines.push(''); // 空行分隔

  // 添加歌词行
  lines.forEach(line => {
    if (line.trim()) {
      lrcLines.push(line);
    }
  });

  const content = lrcLines.join('\n');
  const filename = lrcData.metadata.ti ? `${lrcData.metadata.ti}.lrc` : 'lyrics.lrc';
  FileUtils.downloadFile(content, filename, 'text/plain');
};

// 获取LRC内容（供外部调用）
const getLrcContent = () => {
  if (!isBilingualMode.value) {
    // 单语模式：返回原文LRC
    const lines = lyricsText.value.split('\n');
    const lrcLines = [];

    // 添加元数据
    if (lrcData.metadata.ti) lrcLines.push(`[ti:${lrcData.metadata.ti}]`);
    if (lrcData.metadata.ar) lrcLines.push(`[ar:${lrcData.metadata.ar}]`);
    if (lrcData.metadata.al) lrcLines.push(`[al:${lrcData.metadata.al}]`);
    if (lrcData.metadata.by) lrcLines.push(`[by:${lrcData.metadata.by}]`);

    if (lrcLines.length > 0) lrcLines.push(''); // 空行分隔

    // 添加歌词行
    lines.forEach(line => {
      if (line.trim()) {
        lrcLines.push(line);
      }
    });

    return lrcLines.join('\n');
  } else {
    // 双语模式：返回包含原文和翻译的对象
    const originalLines = lyricsText.value.split('\n');
    const translationLines = translationLyricsText.value.split('\n');

    const originalLrcLines = [];
    const translationLrcLines = [];

    // 添加元数据到原文
    if (lrcData.metadata.ti) originalLrcLines.push(`[ti:${lrcData.metadata.ti}]`);
    if (lrcData.metadata.ar) originalLrcLines.push(`[ar:${lrcData.metadata.ar}]`);
    if (lrcData.metadata.al) originalLrcLines.push(`[al:${lrcData.metadata.al}]`);
    if (lrcData.metadata.by) originalLrcLines.push(`[by:${lrcData.metadata.by}]`);

    // 添加元数据到翻译（标记为翻译版本）
    if (lrcData.metadata.ti) translationLrcLines.push(`[ti:${lrcData.metadata.ti} (翻译)]`);
    if (lrcData.metadata.ar) translationLrcLines.push(`[ar:${lrcData.metadata.ar}]`);
    if (lrcData.metadata.al) translationLrcLines.push(`[al:${lrcData.metadata.al}]`);
    if (lrcData.metadata.by) translationLrcLines.push(`[by:${lrcData.metadata.by}]`);

    if (originalLrcLines.length > 0) originalLrcLines.push(''); // 空行分隔
    if (translationLrcLines.length > 0) translationLrcLines.push(''); // 空行分隔

    // 添加歌词行
    originalLines.forEach(line => {
      if (line.trim()) {
        originalLrcLines.push(line);
      }
    });

    translationLines.forEach(line => {
      if (line.trim()) {
        translationLrcLines.push(line);
      }
    });

    return {
      original: originalLrcLines.join('\n'),
      translation: translationLrcLines.join('\n')
    };
  }
};

// 设置双语模式（供外部调用）
const setBilingualMode = (enabled) => {
  isBilingualMode.value = enabled;
  isAutoMode.value = true; // 标记为自动模式，禁用手动切换
  saveToStorage();
};

// 从服务器加载歌词
const loadLyricsFromServer = async (songData) => {
  try {
    console.log('开始加载歌词:', songData);

    // 设置歌曲元数据
    if (songData.title) lrcData.metadata.ti = songData.title;
    if (songData.Album?.performer) lrcData.metadata.ar = songData.Album.performer;
    if (songData.Album?.title) lrcData.metadata.al = songData.Album.title;

    let hasMainLyrics = false;
    let hasTranslationLyrics = false;

    // 加载主歌词
    if (songData.lyricsFile) {
      try {
        const mainLyricsContent = await fetchLyricsContent(songData.lyricsFile);
        if (mainLyricsContent) {
          lyricsText.value = mainLyricsContent;
          hasMainLyrics = true;
          console.log('主歌词加载成功');
        }
      } catch (error) {
        console.error('加载主歌词失败:', error);
      }
    }

    // 加载翻译歌词
    if (songData.translationLyricsFile) {
      try {
        const translationLyricsContent = await fetchLyricsContent(songData.translationLyricsFile);
        if (translationLyricsContent) {
          translationLyricsText.value = translationLyricsContent;
          hasTranslationLyrics = true;
          console.log('翻译歌词加载成功');
        }
      } catch (error) {
        console.error('加载翻译歌词失败:', error);
      }
    }

    // 根据加载的歌词情况设置模式
    if (hasMainLyrics && hasTranslationLyrics) {
      // 有主歌词和翻译歌词，启用双语模式
      isBilingualMode.value = true;
      isAutoMode.value = true;
      console.log('启用双语模式');
    } else if (hasMainLyrics || hasTranslationLyrics) {
      // 只有一种歌词，使用单语模式
      isBilingualMode.value = false;
      isAutoMode.value = false;
      console.log('使用单语模式');
    }

    // 保存到本地存储
    saveToStorage();

    return {
      hasMainLyrics,
      hasTranslationLyrics,
      mode: isBilingualMode.value ? 'bilingual' : 'single'
    };

  } catch (error) {
    console.error('加载歌词失败:', error);
    throw error;
  }
};

// 从服务器获取歌词内容
const fetchLyricsContent = async (lyricsFilePath) => {
  try {
    const apiUrl = `${API_BASE_URL}/lyrics?path=${encodeURIComponent(lyricsFilePath)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`获取歌词失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.content) {
      throw new Error('服务器返回了空的歌词内容');
    }

    return data.content;

  } catch (error) {
    console.error('获取歌词内容失败:', error);
    throw error;
  }
};

// 暴露方法给父组件
defineExpose({
  getLrcContent,
  exportLrcFile,
  hasLyrics: computed(() => hasLyrics.value),
  setBilingualMode,
  loadLyricsFromServer
});

const clearAll = () => {
  if (confirm('确定要清空所有内容吗？')) {
    Object.keys(lrcData.metadata).forEach(key => {
      if (key !== 'by') { // 保留制作者信息
        lrcData.metadata[key] = '';
      }
    });
    lyricsText.value = '';
    translationLyricsText.value = '';
    isBilingualMode.value = false;
    isAutoMode.value = false; // 重置自动模式
    StorageManager.clearLrcData();
  }
};

// 存储相关
const saveToStorage = () => {
  StorageManager.saveLrcData({
    metadata: lrcData.metadata,
    lyricsText: lyricsText.value,
    translationLyricsText: translationLyricsText.value,
    isBilingualMode: isBilingualMode.value,
    isAutoMode: isAutoMode.value
  });
};

const loadFromStorage = () => {
  const saved = StorageManager.loadLrcData();
  if (saved) {
    Object.assign(lrcData.metadata, saved.metadata || {});
    if (saved.lyricsText) {
      lyricsText.value = saved.lyricsText;
    }
    if (saved.translationLyricsText) {
      translationLyricsText.value = saved.translationLyricsText;
    }
    if (saved.isBilingualMode !== undefined) {
      isBilingualMode.value = saved.isBilingualMode;
    }
    if (saved.isAutoMode !== undefined) {
      isAutoMode.value = saved.isAutoMode;
    }
  }
};

// 监听外部音频文件变化
watch(() => props.externalAudioUrl, (newUrl) => {
  if (newUrl) {
    // 使用外部传入的音频文件
    audioUrl.value = newUrl;
    audioFile.value = {
      name: props.externalAudioName || '歌曲音频',
      size: 0 // 外部文件大小未知
    };
  }
}, { immediate: true });

// 生命周期
onMounted(() => {
  // 注册快捷键
  keyboardManager.register('space', (event) => {
    // 在打轴模式下，总是响应空格键
    if (isTimingMode.value) {
      insertTimestamp();
    } else if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
      // 非打轴模式下，只在非输入框时响应空格键
      insertTimestamp();
    }
  });

  keyboardManager.register('ctrl+enter', togglePlay);
  keyboardManager.register('arrowleft', seekBackward);
  keyboardManager.register('arrowright', seekForward);

  // 打轴模式下的上下箭头导航
  keyboardManager.register('arrowup', () => {
    if (isTimingMode.value) {
      previousTimingLine();
    }
  });

  keyboardManager.register('arrowdown', () => {
    if (isTimingMode.value) {
      nextTimingLine();
    }
  });

  // 绑定键盘事件
  document.addEventListener('keydown', keyboardManager.handleKeyDown.bind(keyboardManager));

  // 加载保存的数据
  loadFromStorage();

  // 初始化音量滑块样式
  nextTick(() => {
    updateVolume();
  });

  // 防止页面拖拽
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());
});

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('keydown', keyboardManager.handleKeyDown.bind(keyboardManager));
  keyboardManager.clear();



  // 清理音频URL
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }

  // 保存数据
  saveToStorage();
});


</script>

<style scoped>
/* 模仿UserDynamicCovers的样式 - 精确适配页面高度减80px */
.lrc-maker-container {
  width: 100%;
  max-width: none; /* 移除最大宽度限制，让它占满抽屉宽度 */
  margin: 0;
  padding: 24px;
  font-family: sans-serif;
  background-color: var(--garrix-white, #ffffff);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0; /* 确保flex子元素可以收缩 */
}

/* 顶部工具栏 - 模仿page-header */
.lrc-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--garrix-black, #000000);
  padding-bottom: 20px;
  margin-bottom: 30px;
  flex-shrink: 0;
}

.toolbar-left h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--garrix-black, #000000);
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-badge.editing {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.mode-badge.timing {
  background: #4CAF50;
  color: var(--garrix-white, #ffffff);
}

.timing-info {
  font-size: 12px;
  color: var(--garrix-grey, #666666);
  font-weight: 500;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 中间内容区域 - 自适应剩余高度 */
.lrc-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
}

/* 隐藏中间内容区域的滚动条 */
.lrc-content::-webkit-scrollbar {
  display: none;
}

.lrc-content {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* 底部音频播放器 */
.audio-player-section {
  background: var(--garrix-light-grey, #f8f9fa);
  border: 1px solid var(--garrix-border, #dddddd);
  border-radius: 8px;
  padding: 16px;
  flex-shrink: 0;
  max-height: 200px;
  overflow-y: auto;
}

/* 隐藏音频播放器的滚动条 */
.audio-player-section::-webkit-scrollbar {
  display: none;
}

.audio-player-section {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Garrix按钮样式 */
.garrix-btn {
  padding: 8px 16px;
  border: 2px solid var(--garrix-black, #000000);
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-black, #000000);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0;
}

.garrix-btn:hover:not(:disabled) {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.garrix-btn.primary {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.garrix-btn.primary:hover:not(:disabled) {
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-black, #000000);
}

.garrix-btn.secondary {
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-black, #000000);
}

.garrix-btn.danger {
  border-color: #dc2626;
  color: #dc2626;
}

.garrix-btn.danger:hover:not(:disabled) {
  background: #dc2626;
  color: var(--garrix-white, #ffffff);
}

.garrix-btn.small {
  padding: 6px 12px;
  font-size: 11px;
}

.garrix-btn.active {
  background: var(--garrix-black, #000000);
  color: var(--garrix-white, #ffffff);
}

.garrix-btn:disabled {
  background: var(--garrix-light-grey, #f8f9fa) !important;
  color: var(--garrix-grey, #999999) !important;
  border-color: var(--garrix-border, #dddddd) !important;
  cursor: not-allowed !important;
  opacity: 0.6;
}

.garrix-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}



/* 编辑模式 */
.editor-mode {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 大文本框样式 - 自适应高度 */
.large-textarea {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.large-textarea :deep(.acmetone-input) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.large-textarea :deep(textarea) {
  flex: 1 !important;
  min-height: 0 !important;
  height: auto !important;
  font-size: 14px;
  line-height: 1.6;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  resize: none;
}

/* 隐藏文本框的滚动条 */
.large-textarea :deep(textarea)::-webkit-scrollbar {
  display: none;
}

.large-textarea :deep(textarea) {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* 双语编辑模式 */
.bilingual-editor {
  display: flex;
  gap: 20px;
  width: 100%;
  flex: 1;
  height: 400px;
  min-height: 400px;
}

.editor-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.column-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--garrix-black, #1d1d1f);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--garrix-black, #000000);
}

.single-language-editor {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 400px;
  min-height: 400px;
}

/* 全高度编辑框 */
.full-height {
  flex: 1 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.full-height :deep(.acmetone-input-wrapper) {
  flex: 1 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.full-height :deep(.acmetone-input-wrapper .input-container) {
  flex: 1 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.full-height :deep(textarea) {
  flex: 1 !important;
  height: 100% !important;
  min-height: 300px !important;
  resize: none !important;
  box-sizing: border-box !important;
}

/* 打轴模式 */
.timing-mode {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.timing-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--garrix-light-grey, #f8f9fa);
  border: 1px solid var(--garrix-border, #dddddd);
  flex-shrink: 0;
}

.timing-hint {
  font-size: 12px;
  color: var(--garrix-grey, #666666);
  margin-left: auto;
}

.lyrics-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--garrix-border, #dddddd);
  min-height: 0;
}

/* 隐藏歌词列表的滚动条 */
.lyrics-list::-webkit-scrollbar {
  display: none;
}

.lyrics-list {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.lyric-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--garrix-border, #dddddd);
  cursor: pointer;
  transition: all 0.2s ease;
}

.lyric-item:last-child {
  border-bottom: none;
}

.lyric-item:hover {
  background: var(--garrix-light-grey, #f8f9fa);
}

.lyric-item.current {
  background: var(--garrix-black, #000000) !important;
  color: var(--garrix-white, #ffffff) !important;
}

.lyric-item.has-timestamp {
  background: rgba(128, 128, 128, 0.1); /* 浅灰色背景 */
  cursor: pointer; /* 现在已有时间戳的行也可以点击 */
}

.lyric-item.has-timestamp:hover {
  background: rgba(128, 128, 128, 0.2); /* 悬停时稍深的灰色 */
}

/* 确保选中状态优先级最高 */
.lyric-item.has-timestamp.current {
  background: var(--garrix-black, #000000) !important;
  color: var(--garrix-white, #ffffff) !important;
}

.lyric-item .line-number {
  font-size: 12px;
  font-weight: 600;
  min-width: 32px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--garrix-light-grey, #f8f9fa);
  color: var(--garrix-black, #000000);
  border-radius: 0; /* 直角，不要圆角 */
}

.lyric-item.current .line-number {
  background: var(--garrix-white, #ffffff) !important;
  color: var(--garrix-black, #000000) !important;
}

.lyric-item.has-timestamp .line-number {
  background: var(--garrix-black, #000000); /* 黑色背景 */
  color: var(--garrix-white, #ffffff); /* 白色文字 */
}

/* 确保选中的已打轴行的行号也是白色背景 */
.lyric-item.has-timestamp.current .line-number {
  background: var(--garrix-white, #ffffff) !important;
  color: var(--garrix-black, #000000) !important;
}

.lyric-item .line-content {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lyric-item .timestamp {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--garrix-grey, #666666); /* 使用主题灰色 */
  font-weight: 600;
  background: transparent; /* 透明背景 */
  padding: 2px 6px;
  border-radius: 4px;
}

/* 选中状态下的时间戳样式 */
.lyric-item.current .timestamp {
  color: rgba(255, 255, 255, 0.8) !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.lyric-item .text {
  flex: 1;
}

/* 双语打轴模式样式 */
.bilingual-line-content {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bilingual-text-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.original-line,
.translation-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.original-line {
  background: transparent;
  border-left: none;
}

.translation-line {
  background: transparent;
  border-left: none;
}

.timestamp.original {
  background: transparent;
  color: var(--garrix-grey, #666666);
}

.timestamp.translation {
  background: transparent;
  color: var(--garrix-grey, #666666);
}

.bilingual-text-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.original-text {
  font-weight: 600;
  color: inherit;
}

.translation-text {
  font-size: 12px;
  font-style: italic;
  color: var(--garrix-grey, #666666);
  opacity: 0.8;
}

.lyric-item.current .translation-text {
  color: rgba(255, 255, 255, 0.7) !important;
}

/* 音频拖拽区域 */
.audio-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  border: 2px dashed var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  padding: 20px;
}

.audio-drop-zone:hover,
.audio-drop-zone.drag-over {
  border-color: var(--garrix-black, #000000);
  background: rgba(0, 0, 0, 0.05);
}

.audio-drop-zone p {
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  margin: 0 0 4px 0;
}

.audio-drop-zone small {
  font-size: 12px;
  color: var(--garrix-grey, #666666);
}

/* 音频播放器 */
.audio-player {
  width: 100%;
}

.player-container {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.audio-info {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.audio-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  margin-bottom: 4px;
  word-break: break-all;
}

.audio-duration {
  font-size: 12px;
  color: var(--garrix-grey, #666666);
  font-family: 'Courier New', monospace;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-info {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: var(--garrix-grey, #666666);
  min-width: 120px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--garrix-black, #000000);
  min-width: 40px;
}

.control-group select {
  padding: 4px 8px;
  border: 1px solid var(--garrix-border, #dddddd);
  background: var(--garrix-white, #ffffff);
  color: var(--garrix-black, #000000);
  font-size: 12px;
}

.volume-slider {
  width: 80px;
  height: 4px;
  background: linear-gradient(to right,
    var(--garrix-black, #000000) 0%,
    var(--garrix-black, #000000) var(--volume-percent, 100%),
    var(--garrix-border, #dddddd) var(--volume-percent, 100%),
    var(--garrix-border, #dddddd) 100%);
  outline: none;
  cursor: pointer;
  border-radius: 2px;
  -webkit-appearance: none;
  appearance: none;
}

/* WebKit browsers (Chrome, Safari, Edge) */
.volume-slider::-webkit-slider-track {
  width: 100%;
  height: 4px;
  background: transparent;
  border-radius: 2px;
  border: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--garrix-black, #000000);
  cursor: pointer;
  border-radius: 50%;
  border: none;
}

/* Firefox */
.volume-slider::-moz-range-track {
  width: 100%;
  height: 4px;
  background: transparent;
  border-radius: 2px;
  border: none;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--garrix-black, #000000);
  cursor: pointer;
  border-radius: 50%;
  border: none;
}

/* 进度条 */
.progress-container {
  width: 100%;
  margin-top: 12px;
}

.progress-bar {
  cursor: pointer;
  padding: 8px 0;
}

.progress-track {
  height: 6px;
  background: var(--garrix-border, #dddddd);
  position: relative;
}

.progress-fill {
  height: 100%;
  background: var(--garrix-black, #000000);
  transition: width 0.1s ease;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .player-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .lrc-maker-container {
    padding: 16px;
  }

  .lrc-toolbar {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }



  .player-container {
    flex-direction: column;
    align-items: flex-start;
  }

  .player-controls {
    flex-wrap: wrap;
    gap: 8px;
  }

  .audio-player-section {
    padding: 12px;
    max-height: 180px;
  }
}

@media (max-width: 480px) {
  .lrc-maker-container {
    padding: 12px;
  }

  .lrc-toolbar {
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .toolbar-left h1 {
    font-size: 1.5rem;
  }

  .audio-player-section {
    padding: 8px;
    max-height: 160px;
  }
}


</style>
