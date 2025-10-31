# AlbumCalendar 专辑日历组件

一个功能丰富的专辑发行日历组件，支持专辑封面显示、轮播、自定义样式等功能。

## 功能特性

- 📅 **完整日历视图** - 支持月份导航和日期选择
- 🎵 **专辑封面显示** - 在对应日期显示专辑封面
- 🔄 **自动轮播** - 多个专辑自动轮播切换
- 🎨 **高度可定制** - 支持多种配置选项和自定义样式
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 🌍 **国际化支持** - 支持多语言配置

## 基础用法

```vue
<template>
  <AlbumCalendar
    :albums="albums"
    :selected-date="selectedDate"
    @date-selected="handleDateSelected"
    @album-selected="handleAlbumSelected"
    @month-changed="handleMonthChanged"
  />
</template>

<script>
import AlbumCalendar from './components/AlbumCalendar.vue'

export default {
  components: {
    AlbumCalendar
  },
  data() {
    return {
      selectedDate: new Date(),
      albums: [
        {
          id: 1,
          name: "专辑名称",
          artist: "艺术家",
          cover: "https://example.com/cover.jpg",
          releaseDate: "2025-08-15"
        }
        // ... 更多专辑
      ]
    }
  },
  methods: {
    handleDateSelected(date) {
      this.selectedDate = date
      console.log('选中日期:', date)
    },
    handleAlbumSelected(album) {
      console.log('选中专辑:', album)
    },
    handleMonthChanged(date) {
      console.log('月份变更:', date)
    }
  }
}
</script>
```

## Props 配置

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `albums` | Array | `[]` | 专辑数据数组 |
| `selectedDate` | Date | `new Date()` | 当前选中的日期 |
| `initialDate` | Date | `new Date()` | 初始显示的月份 |
| `showHeader` | Boolean | `true` | 是否显示头部 |
| `showNavigation` | Boolean | `true` | 是否显示导航按钮 |
| `allowNavigation` | Boolean | `true` | 是否允许月份导航 |
| `showWeekdays` | Boolean | `true` | 是否显示星期标题 |
| `showDateLabels` | Boolean | `true` | 是否显示日期标签 |
| `showAlbumCount` | Boolean | `true` | 是否显示专辑数量指示器 |
| `weekdays` | Array | `['周一', '周二', ...]` | 星期标签数组 |
| `cellSize` | Number | `80` | 日期格子大小(px) |
| `cellGap` | Number | `4` | 格子间距(px) |
| `carouselInterval` | Number | `2500` | 轮播间隔(毫秒) |
| `calendarClass` | String | `''` | 自定义样式类名 |
| `locale` | String | `'zh-CN'` | 语言设置 |

## 专辑数据格式

```javascript
{
  id: 1,                    // 唯一标识
  name: "专辑名称",          // 专辑名称
  artist: "艺术家",         // 艺术家名称
  cover: "封面图片URL",      // 封面图片地址
  releaseDate: "2025-08-15" // 发行日期 (YYYY-MM-DD)
}
```

## 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `date-selected` | `date: Date` | 日期被选中时触发 |
| `album-selected` | `album: Object` | 专辑被选中时触发 |
| `month-changed` | `date: Date` | 月份切换时触发 |

## 自定义样式

组件使用CSS变量，可以通过覆盖这些变量来自定义样式：

```css
.album-calendar {
  --color-white: #ffffff;
  --color-black: #000000;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-red-300: #fca5a5;
  --color-red-500: #ef4444;
}
```

## 高级用法

### 紧凑模式
```vue
<AlbumCalendar
  :albums="albums"
  :cell-size="60"
  :cell-gap="2"
  :show-date-labels="false"
  :show-album-count="false"
/>
```

### 只读模式
```vue
<AlbumCalendar
  :albums="albums"
  :allow-navigation="false"
  :show-navigation="false"
/>
```

### 自定义星期标签
```vue
<AlbumCalendar
  :albums="albums"
  :weekdays="['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
  locale="en-US"
/>
```

## 注意事项

1. 专辑的 `releaseDate` 必须是 `YYYY-MM-DD` 格式
2. 封面图片建议使用正方形比例，组件会自动裁剪适配
3. 轮播功能会在组件销毁时自动清理定时器
4. 组件使用 `scoped` 样式，不会影响全局样式

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

支持现代浏览器的CSS Grid和Flexbox特性。
