# AudioPlayerDrawer 音频播放抽屉组件

## 概述

AudioPlayerDrawer 是一个现代化的音频播放抽屉组件，用于替换专辑详情页中的原生音频播放器。它提供了更好的用户体验和视觉效果。

## 功能特性

- 🎵 **现代化播放界面** - 仿照流行音乐应用的设计风格
- 🎨 **专辑封面展示** - 带有旋转动画效果的专辑封面
- 🎛️ **完整播放控制** - 播放/暂停、上一首/下一首、进度条、音量控制
- 📱 **响应式设计** - 适配桌面端和移动端
- 🎼 **播放列表支持** - 显示完整的专辑歌曲列表
- ⚡ **自动播放下一首** - 歌曲结束后自动播放下一首
- 🔄 **智能音频加载** - 通过API动态获取音频URL
- 🎯 **Garrix主题风格** - 与项目整体设计风格保持一致

## 组件属性 (Props)

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `visible` | Boolean | `false` | 控制抽屉的显示/隐藏 |
| `currentSong` | Object | `null` | 当前播放的歌曲对象 |
| `playlist` | Array | `[]` | 播放列表（歌曲数组） |
| `albumCover` | String | `'/placeholder-album.png'` | 专辑封面图片URL |
| `albumId` | String/Number | `null` | 专辑ID，用于API请求 |

## 事件 (Events)

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `close` | - | 关闭抽屉时触发 |
| `song-change` | `song` | 切换歌曲时触发，参数为新的歌曲对象 |

## 使用示例

### 基本用法

```vue
<template>
  <div>
    <!-- 播放按钮 -->
    <button @click="playSong(song)">
      <el-icon><VideoPlay /></el-icon>
    </button>

    <!-- 音频播放抽屉 -->
    <AudioPlayerDrawer
      :visible="audioDrawerVisible"
      :current-song="currentPlayingSong"
      :playlist="playlistSongs"
      :album-cover="albumCoverUrl"
      :album-id="albumId"
      @close="closeAudioDrawer"
      @song-change="handleSongChange"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import AudioPlayerDrawer from '@/components/AudioPlayerDrawer.vue';
import { VideoPlay } from '@element-plus/icons-vue';

// 响应式数据
const audioDrawerVisible = ref(false);
const currentPlayingSong = ref(null);
const playlistSongs = computed(() => album.value?.songs || []);

// 播放歌曲
const playSong = (song) => {
  currentPlayingSong.value = song;
  audioDrawerVisible.value = true;
};

// 关闭播放抽屉
const closeAudioDrawer = () => {
  audioDrawerVisible.value = false;
};

// 切换歌曲
const handleSongChange = (song) => {
  currentPlayingSong.value = song;
};
</script>
```

### 歌曲对象结构

```javascript
const song = {
  id: 1,
  title: "歌曲标题",
  duration: 180, // 时长（秒）
  wavFile: "/path/to/audio.wav", // 音频文件路径
  Artists: [
    {
      id: 1,
      name: "艺人名称"
    }
  ]
};
```

## 样式定制

组件使用CSS变量来支持主题定制：

```css
:root {
  --garrix-black: #000000;
  --garrix-white: #ffffff;
  --garrix-gray: #f5f5f5;
  --garrix-dark-gray: #e0e0e0;
  --garrix-border: #dddddd;
  --garrix-text: #000000;
  --garrix-text-secondary: #666666;
}
```

## 技术实现

### 音频加载机制

组件通过以下API端点获取音频：
```
GET /albums/{albumId}/songs/{songId}/audio
```

### 播放控制

- 使用HTML5 Audio API进行音频播放控制
- 支持进度条拖拽和音量调节
- 自动播放下一首歌曲

### 响应式设计

- 桌面端：450px宽度的右侧抽屉
- 移动端：全屏显示
- 专辑封面在移动端会适当缩小

## 注意事项

1. **音频格式支持**：组件依赖浏览器的音频支持，建议使用MP3格式
2. **API依赖**：需要后端提供音频URL获取接口
3. **权限控制**：需要有效的JWT token进行API访问
4. **性能优化**：音频文件采用懒加载机制，只在需要时才加载

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的音频播放功能
- 实现抽屉式界面
- 集成Garrix主题风格
