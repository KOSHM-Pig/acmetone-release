<template>
  <div class="badge-container" :class="{ 'is-collapsed': isCollapsed }">
    <slot></slot>
    <span v-if="value > 0" class="badge" :class="{ 'is-dot': isDot }">
      {{ displayValue }}
    </span>
  </div>
</template>

<script>
export default {
  name: 'BadgeWithMax',
  props: {
    value: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 99
    },
    isDot: {
      type: Boolean,
      default: false
    },
    isCollapsed: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    displayValue() {
      if (this.isDot) return '';
      return this.value > this.max ? `${this.max}+` : this.value;
    }
  }
}
</script>

<style scoped>
.badge-container {
  position: relative;
  display: inline-block;
}

.badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
  font-size: 12px;
  text-align: center;
  background-color: #f56c6c;
  border-radius: 10px;
  color: #fff;
  white-space: nowrap;
  transform: translateY(-50%);
  transform-origin: center;
  z-index: 10;
}

.badge.is-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  right: -4px;
  top: -4px;
}

/* 折叠状态样式调整 */
.is-collapsed .badge {
  top: 0;
  right: 0;
}
</style> 