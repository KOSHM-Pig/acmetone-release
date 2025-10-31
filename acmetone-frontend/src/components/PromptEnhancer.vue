<template>
  <div class="prompt-enhancer">
    <!-- 提示词标签页 -->
    <div class="enhancer-header">
      <div class="tabs">
        <button
          v-for="(category, index) in categories"
          :key="index"
          @click="activeTab = index"
          :class="{ active: activeTab === index }"
          class="tab-button"
        >
          {{ category.name[language] }}
        </button>
      </div>
    </div>
    <div class="scrollable-content">
      <div class="enhancer-content">
        <div
          v-for="(category, index) in categories"
          :key="index"
          v-show="activeTab === index"
          class="tab-panel"
        >
          <div
            v-for="subcategory in category.subcategories"
            :key="subcategory.name.en"
            class="subcategory"
          >
            <h4 class="subcategory-title">{{ subcategory.name[language] }}</h4>
            <div class="keywords">
              <span
                v-for="keyword in subcategory.keywords"
                :key="keyword.en"
                class="keyword-tag"
                @click="addKeyword(keyword[language])"
              >
                {{ keyword[language] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { promptCategories } from '@/services/promptKeywords.js';

const props = defineProps({
  language: {
    type: String,
    default: 'zh',
  },
});

const emit = defineEmits(['add-keyword']);

const categories = ref(promptCategories);
const activeTab = ref(0);

const addKeyword = (keyword) => {
  emit('add-keyword', keyword);
};
</script>

<style scoped>
/* Main container with white theme */
.prompt-enhancer {
  border: 2px solid #000;
  padding: 20px;
  background-color: #fff;
  color: #000;
  margin-top: 20px;
}

.enhancer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
  margin-bottom: 10px;
}

.tabs {
  display: flex;
  gap: 20px;
}

.tab-button {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 5px 0;
  font-size: 16px;
  font-weight: 600;
  position: relative;
  transition: color 0.3s;
  text-transform: uppercase;
}

.tab-button.active {
  color: #000;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -17px; /* Position it on the border */
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #000;
}

.subcategory {
  margin-bottom: 25px;
}

.subcategory-title {
  color: #888;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.keyword-tag {
  background-color: #f0f0f0;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.keyword-tag:hover {
  background-color: #000;
  color: #fff;
  transform: translateY(-2px);
}

.scrollable-content {
  max-height: 220px; /* Set a max height */
  overflow-y: auto; /* Enable vertical scroll */
  padding-right: 10px;
  margin-right: -10px;
}
.scrollable-content::-webkit-scrollbar {
  width: 4px;
}
.scrollable-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.scrollable-content::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: #888;
}
</style> 