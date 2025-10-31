<template>
  <div class="template-editor-container" ref="editorContainerRef" @click="deselectLayer">
    <!-- Global Controls -->
    <div class="global-controls" @click.stop>
      <el-select 
        v-model="currentTemplateId" 
        placeholder="选择一个模板" 
        class="template-selector"
        @change="handleTemplateSelectionChange"
        filterable
        :teleported="false"
      >
        <el-option
          v-for="template in templates"
          :key="template.id"
          :label="template.name"
          :value="template.id"
        />
      </el-select>

      <el-input
        v-if="currentTemplate"
        v-model="currentTemplate.name"
        placeholder="模板名称"
        class="template-name-input"
      />
      
      <div class="global-actions">
        <el-button :icon="MagicStick" @click="openAiGenerator" circle title="AI 生成模板"></el-button>
        <el-button :icon="Plus" @click="createNewTemplate" circle title="新建模板"></el-button>
        <el-button type="primary" @click="saveTemplate" :loading="isSaving" :disabled="!currentTemplate">保存</el-button>
        <el-popconfirm
            title="确定删除当前模板吗？"
            @confirm="deleteCurrentTemplate"
            :disabled="!currentTemplate"
        >
            <template #reference>
                <el-button type="danger" :icon="Delete" circle :disabled="!currentTemplate" title="删除模板"></el-button>
            </template>
        </el-popconfirm>
      </div>
    </div>

    <div class="editor-layout" :class="{ 'is-disabled': !currentTemplate }" @click="deselectLayer">
      <!-- Layers Column -->
       <div class="layers-column" @click.stop>
          <div class="column-header">
            <h2>图层</h2>
             <el-dropdown @command="handleAddLayer" placement="bottom-end" :disabled="!currentTemplate">
                <el-button type="primary" :icon="Plus" circle size="small"></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="text">文本</el-dropdown-item>
                    <el-dropdown-item command="rectangle">矩形</el-dropdown-item>
                    <el-dropdown-item command="effect-area">效果区域</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
          </div>
          <!-- Layer Quick Controls -->
          <div class="layer-quick-controls" v-if="activeLayer && (activeLayer.type === 'text' || (activeLayer.type === 'shape' && activeLayer.shapeType === 'rectangle'))">
              <div class="control-group">
                <label>混合</label>
                <el-select v-model="activeLayer.blendMode" size="small" class="blend-mode-select" placeholder="混合模式">
                    <el-option v-for="mode in blendModeOptions" :key="mode.value" :label="mode.label" :value="mode.value" />
                </el-select>
              </div>
              <div class="control-group">
                <label>不透明度</label>
                <el-slider v-model="activeLayer.opacity" :min="0" :max="1" :step="0.01" size="small" />
              </div>
          </div>
          <el-scrollbar class="layers-list">
              <div 
                v-if="currentTemplate"
                v-for="(layer, index) in currentTemplate.definition.layers" 
                :key="layer.id"
                class="layer-item"
                :class="{ 'active': activeLayerIndex === index, 'drag-over': index === dragOverIndex, 'is-hidden': !layer.visible }"
                @click="selectLayer(index)"
                draggable="true"
                @dragstart="handleDragStart(index)"
                @dragover.prevent="handleDragOver(index)"
                @drop="handleDrop(index)"
                @dragleave="handleDragLeave()"
                @contextmenu.prevent="handleLayerContextMenu($event, index)"
              >
                  <template v-if="editingLayerIndex === index">
                    <input
                      type="text"
                      class="rename-input"
                      v-model="layer.name"
                      @blur="finishRename"
                      @keyup.enter="finishRename"
                      @click.stop
                    />
                  </template>
                  <template v-else>
                    <span class="layer-name">{{ getLayerPreviewText(layer) }}</span>
                  </template>
                  <div class="layer-actions">
                      <el-button
                        :icon="layer.visible ? View : Hide"
                        circle
                        plain
                        text
                        size="small"
                        @click.stop="toggleLayerVisibility(layer)"
                        :title="layer.visible ? '隐藏图层' : '显示图层'"
                      />
                      <el-button type="danger" plain @click.stop="removeLayer(index)" size="small" :icon="Delete" circle></el-button>
                  </div>
              </div>
              <el-empty v-if="!currentTemplate || !currentTemplate.definition.layers.length" description="暂无图层"></el-empty>
          </el-scrollbar>
       </div>


      <!-- Middle Column: Canvas -->
      <div class="preview-column" @click.stop>
         <div class="column-header">
          <h2>画布</h2>
        </div>
        <div class="preview-area" ref="previewAreaRef" v-loading="isPreviewLoading" element-loading-text="生成预览中...">
          <canvas ref="previewCanvasRef"></canvas>
        </div>
      </div>

      <!-- Right Column: Inspector -->
      <div class="inspector-column" v-if="currentTemplate && activeLayer" @click.stop>
         <div class="column-header">
          <h2>属性检查器</h2>
        </div>
        <el-scrollbar class="inspector-content">
          <el-form :model="activeLayer" label-position="top">
             <div v-if="activeLayer.type === 'text'">
                <el-form-item label="占位符">
                    <el-select v-model="activeLayer.placeholder" placeholder="选择占位符" style="width:100%">
                        <el-option label="专辑标题" value="title"></el-option>
                        <el-option label="表演者" value="performers"></el-option>
                        <el-option label="版权信息" value="displayInfo"></el-option>
                        <el-option label="自定义文本" value="custom"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item v-if="['performers', 'displayInfo'].includes(activeLayer.placeholder)" label="分词选择 (0为全部)">
                  <el-input-number v-model="activeLayer.splitIndex" controls-position="right" placeholder="0=全部, 1=第1个, -1=倒数第1个" style="width: 100%;" />
                </el-form-item>
                <el-form-item label="字体">
                    <el-select 
                      :model-value="activeLayerFontValue" 
                      @change="handleFontChange"
                      placeholder="选择字体" 
                      style="width:100%"
                    >
                        <el-option-group
                          v-for="group in fontOptions"
                          :key="group.label"
                          :label="group.label">
                          <el-option
                            v-for="font in group.options"
                            :key="font.value"
                            :label="font.label"
                            :value="font.value"
                            :style="{ fontFamily: font.family, fontWeight: font.weight }">
                             <span :style="{ fontFamily: font.family, fontWeight: font.weight }">{{ font.label }}</span>
                          </el-option>
                        </el-option-group>
                    </el-select>
                </el-form-item>
                <el-form-item v-if="activeLayer.placeholder === 'custom'" label="自定义文本">
                  <el-input v-model="activeLayer.text" placeholder="请输入自定义文本"></el-input>
                </el-form-item>
                <el-form-item v-else label="预览文本 (可选)">
                  <el-input v-model="activeLayer.text" placeholder="留空则使用占位符默认文本"></el-input>
                </el-form-item>
                <el-form-item label="字体大小 (px)">
                  <div class="slider-input-group">
                      <el-slider v-model="activeLayer.fontSize" :min="10" :max="500" :step="1" />
                      <el-input-number v-model="activeLayer.fontSize" :min="10" :max="500" size="small" controls-position="right" />
                  </div>
                </el-form-item>
                <el-form-item label="字重 (Font Weight)">
                   <div class="slider-input-group">
                      <el-slider v-model="activeLayer.fontWeight" :min="100" :max="900" :step="100" />
                      <el-input-number v-model="activeLayer.fontWeight" :min="100" :max="900" :step="100" size="small" controls-position="right" />
                  </div>
               </el-form-item>
                <el-form-item label="文本对齐 (Text Align)">
                  <el-radio-group v-model="activeLayer.textAlign">
                    <el-radio-button value="left">左</el-radio-button>
                    <el-radio-button value="center">中</el-radio-button>
                    <el-radio-button value="right">右</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="字间距 (Letter Spacing)">
                  <div class="slider-input-group">
                    <el-slider v-model="activeLayer.letterSpacing" :min="-10" :max="50" :step="1" />
                    <el-input-number v-model="activeLayer.letterSpacing" :min="-10" :max="50" size="small" controls-position="right" />
                  </div>
                </el-form-item>
                <el-form-item label="行间距 (Line Height)">
                  <div class="slider-input-group">
                    <el-slider v-model="activeLayer.lineHeight" :min="0.8" :max="3" :step="0.1" :precision="2"/>
                    <el-input-number v-model="activeLayer.lineHeight" :min="0.8" :max="3" :step="0.1" :precision="2" size="small" controls-position="right" />
                  </div>
                </el-form-item>
                <el-form-item label="文本转换">
                  <el-select v-model="activeLayer.textTransform" placeholder="无" style="width:100%">
                      <el-option label="无" value="none"></el-option>
                      <el-option label="强制大写" value="uppercase"></el-option>
                  </el-select>
                </el-form-item>
                <el-form-item label="排列方向">
                  <el-radio-group v-model="activeLayer.orientation" size="small">
                    <el-radio-button value="horizontal">水平</el-radio-button>
                    <el-radio-button value="vertical">垂直</el-radio-button>
                  </el-radio-group>
                </el-form-item>
             </div>

             <div v-if="activeLayer.type === 'shape' && activeLayer.shapeType === 'rectangle'">
                <el-form-item label="宽度 (px)">
                  <el-input-number v-model="activeLayer.width" :min="1" :max="6000" style="width:100%"/>
                </el-form-item>
                <el-form-item label="高度 (px)">
                  <el-input-number v-model="activeLayer.height" :min="1" :max="6000" style="width:100%"/>
                </el-form-item>
             </div>
            
             <!-- Effect Area Properties -->
             <div v-if="activeLayer.type === 'effect-area'">
               <el-divider>效果设置</el-divider>
               <el-form-item label="效果类型">
                  <el-input v-model="activeLayer.effect" disabled />
               </el-form-item>
               <el-form-item label="模糊半径 (Radius)">
                 <div class="slider-input-group">
                   <el-slider v-model="activeLayer.radius" :min="0" :max="100" :step="1" />
                   <el-input-number v-model="activeLayer.radius" :min="0" :max="100" size="small" controls-position="right" />
                 </div>
               </el-form-item>
             </div>
            
             <!-- Common Geometry Properties -->
             <div v-if="(activeLayer.type === 'shape' && activeLayer.shapeType === 'rectangle') || activeLayer.type === 'effect-area'">
               <el-divider>尺寸</el-divider>
               <el-form-item label="宽度 (Width)">
                 <div class="slider-input-group">
                   <el-slider v-model="activeLayer.width" :min="0" :max="3000" :step="10" />
                   <el-input-number v-model="activeLayer.width" :min="0" :max="3000" size="small" controls-position="right"/>
                 </div>
               </el-form-item>
               <el-form-item label="高度 (Height)">
                  <div class="slider-input-group">
                   <el-slider v-model="activeLayer.height" :min="0" :max="3000" :step="10" />
                   <el-input-number v-model="activeLayer.height" :min="0" :max="3000" size="small" controls-position="right"/>
                 </div>
               </el-form-item>
             </div>

             <el-divider>通用</el-divider>
              <el-form-item label="颜色" v-if="activeLayer.type !== 'effect-area'">
                  <el-color-picker v-model="activeLayer.color" show-alpha></el-color-picker>
              </el-form-item>
              <el-form-item label="旋转 (Rotation)">
                  <div class="slider-input-group">
                    <el-slider v-model="activeLayer.rotation" :min="0" :max="360" :step="1" />
                    <el-input-number v-model="activeLayer.rotation" :min="0" :max="360" size="small" controls-position="right" />
                  </div>
              </el-form-item>
              <el-form-item label="旋转中心 X (%)">
                <div class="slider-input-group">
                  <el-slider v-model="activeLayer.rotationOrigin.x" :min="-100" :max="100" :step="1" />
                  <el-input-number v-model="activeLayer.rotationOrigin.x" :min="-100" :max="100" size="small" controls-position="right" />
                </div>
              </el-form-item>
              <el-form-item label="旋转中心 Y (%)">
                <div class="slider-input-group">
                  <el-slider v-model="activeLayer.rotationOrigin.y" :min="-100" :max="100" :step="1" />
                  <el-input-number v-model="activeLayer.rotationOrigin.y" :min="-100" :max="100" size="small" controls-position="right" />
                </div>
              </el-form-item>
              <el-form-item label="定位 (Gravity)">
                  <el-select v-model="activeLayer.gravity" placeholder="选择位置" style="width:100%">
                    <el-option v-for="g in gravityOptions" :key="g" :label="g" :value="g"></el-option>
                  </el-select>
              </el-form-item>
              <el-form-item label="水平偏移 (X)">
                  <div class="slider-input-group">
                    <el-slider v-model="activeLayer.offsetX" :min="-4000" :max="4000" :step="1" />
                    <el-input-number v-model="activeLayer.offsetX" :min="-4000" :max="4000" size="small" controls-position="right" />
                  </div>
              </el-form-item>
              <el-form-item label="垂直偏移 (Y)">
                  <div class="slider-input-group">
                    <el-slider v-model="activeLayer.offsetY" :min="-4000" :max="4000" :step="1" />
                    <el-input-number v-model="activeLayer.offsetY" :min="-4000" :max="4000" size="small" controls-position="right" />
                  </div>
              </el-form-item>
          </el-form>
        </el-scrollbar>
      </div>
       <div class="inspector-column" v-else-if="currentTemplate">
           <div class="column-header">
                <h2>属性检查器</h2>
           </div>
           <div class="editor-placeholder">
               <p>选择一个图层以编辑其属性</p>
           </div>
       </div>

    </div>

    <!-- Status Bar -->
    <div class="editor-status-bar" @click.stop>
      <div class="status-bar-left">
        <el-popover placement="top-start" title="背景设置" :width="250" trigger="click" :teleported="false">
          <template #reference>
            <el-button size="small" text>背景</el-button>
          </template>
          <div class="background-controls" v-if="currentTemplate">
            <el-radio-group v-model="currentTemplate.definition.background.type" size="small">
              <el-radio-button value="image">图片</el-radio-button>
              <el-radio-button value="color">纯色</el-radio-button>
            </el-radio-group>
            <div class="background-control-value">
              <el-input 
                v-if="currentTemplate.definition.background.type === 'image'"
                v-model="currentTemplate.definition.background.value" 
                placeholder="输入图片 URL"
                size="small"
              >
                <template #append>
                    <el-button @click="openAiBgGenerator" :icon="MagicStick" title="AI 生成背景"></el-button>
                </template>
              </el-input>
              <el-color-picker 
                v-else
                v-model="currentTemplate.definition.background.value"
                show-alpha
                size="small"
              />
            </div>
          </div>
        </el-popover>
        <el-popover placement="top-start" title="网格设置" :width="200" trigger="click">
          <template #reference>
            <el-button size="small" text>网格</el-button>
          </template>
          <div class="grid-controls">
            <el-form-item label="显示网格">
              <el-switch v-model="gridOptions.visible" />
            </el-form-item>
            <el-form-item label="对齐网格">
              <el-switch v-model="gridOptions.snapping" />
            </el-form-item>
            <el-form-item label="网格大小">
              <el-input-number v-model="gridOptions.size" :min="10" :max="1000" :step="10" size="small" />
            </el-form-item>
          </div>
        </el-popover>
        <el-button @click="toggleFullscreen" size="small" text>全屏</el-button>
      </div>

      <div class="status-bar-right">
        <span>Zoom: {{ (viewTransform.scale * 100).toFixed(1) }}%</span>
        <span>X: {{ viewTransform.panOffset.x.toFixed(0) }}</span>
        <span>Y: {{ viewTransform.panOffset.y.toFixed(0) }}</span>
      </div>
    </div>

    <!-- AI Generator Dialog -->
    <el-dialog v-model="aiGeneratorDialogVisible" title="AI 辅助生成模板" width="500px">
      <p>输入您的设计想法，AI 将为您创建一个模板作为起点。</p>
      <el-input
        v-model="aiPrompt"
        :rows="4"
        type="textarea"
        placeholder="例如：一个简约的，适合民谣专辑的封面模板，包含手写体风格的标题和表演者信息。"
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="aiGeneratorDialogVisible = false">取消</el-button>
          <el-button @click="handleAiHelpWrite" :loading="isAiHelpingWrite">AI 帮写</el-button>
          <el-button type="primary" @click="handleAiGenerate" :loading="isAiGenerating">
            生成
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- AI Background Generator Dialog -->
    <el-dialog v-model="aiBgGeneratorDialogVisible" title="AI 生成背景" width="500px">
      <p>输入您的背景设计想法，AI 将为您生成一张图片。</p>
      <el-input
        v-model="aiBgPrompt"
        :rows="4"
        type="textarea"
        placeholder="例如：一片宁静的星空，带有柔和的星云"
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="aiBgGeneratorDialogVisible = false">取消</el-button>
          <el-button @click="handleAiHelpWriteBg" :loading="isAiBgHelpingWrite">AI 帮写</el-button>
          <el-button type="primary" @click="handleAiGenerateBg" :loading="isAiBgGenerating">
            生成
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Context Menu -->
    <div ref="contextMenuRef" v-if="contextMenu.show" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @click.stop>
        <ul>
            <li @click="copyLayer">复制图层</li>
            <li @click="startRename">重命名图层</li>
            <li @click="deleteLayer">删除图层</li>
        </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick, watch, reactive } from 'vue';
import { coverTemplateService } from '@/services/coverTemplateService';
import { ElMessage, ElMessageBox, ElPopconfirm } from 'element-plus';
import { Plus, Delete, ArrowDown, MagicStick, View, Hide } from '@element-plus/icons-vue';
import '@/assets/css/coverTemplateEditor.css';
import axios from 'axios';
import { canvasRGBA } from 'stackblur-canvas';

const editorContainerRef = ref(null);
const contextMenuRef = ref(null); // Ref for the context menu element
const templates = ref([]);
const currentTemplate = ref(null);
const currentTemplateId = ref(null);
const isSaving = ref(false);
const isPreviewLoading = ref(false);
const editingLayerIndex = ref(null);

// AI Generator State
const aiGeneratorDialogVisible = ref(false);
const aiPrompt = ref('');
const isAiGenerating = ref(false);
const isAiHelpingWrite = ref(false);

// AI BG Generator State
const aiBgGeneratorDialogVisible = ref(false);
const aiBgPrompt = ref('');
const isAiBgGenerating = ref(false);
const isAiBgHelpingWrite = ref(false);

let bgCache = {
    url: null,
    image: null,
    status: 'empty' // empty, loading, loaded, error
};

const draggedLayerIndex = ref(null);
const dragOverIndex = ref(null);

// --- Unique ID Generation ---
let layerIdCounter = 0;
const generateUniqueLayerId = () => {
  return `layer-${Date.now()}-${layerIdCounter++}`;
};
// --- End Unique ID Generation ---

const activeLayerIndex = ref(-1); // -1 means no layer selected
const activeLayer = computed(() => {
  if (currentTemplate.value && activeLayerIndex.value !== -1 && currentTemplate.value.definition.layers[activeLayerIndex.value]) {
    return currentTemplate.value.definition.layers[activeLayerIndex.value];
  }
  return null;
});

const previewCanvasRef = ref(null);
const previewAreaRef = ref(null);
const gravityOptions = ['northwest', 'north', 'northeast', 'west', 'center', 'east', 'southwest', 'south', 'southeast'];
const fontOptions = [
    // System Fonts
    { label: 'System', options: [
      { value: 'Arial-400', label: 'Arial', family: 'Arial', weight: '400' },
      { value: 'Verdana-400', label: 'Verdana', family: 'Verdana', weight: '400' },
      { value: 'Georgia-400', label: 'Georgia', family: 'Georgia', weight: '400' },
      { value: 'Times New Roman-400', label: 'Times New Roman', family: 'Times New Roman', weight: '400' },
    ]},
    // Aemstel Family
    { label: 'Aemstel', options: [
      { value: 'Aemstel-400', label: 'Regular', family: 'Aemstel', weight: '400' },
      { value: 'Aemstel LineHorizontal-400', label: 'LineHorizontal', family: 'Aemstel LineHorizontal', weight: '400' },
      { value: 'Aemstel LineInside-400', label: 'LineInside', family: 'Aemstel LineInside', weight: '400' },
      { value: 'Aemstel LineOutside-400', label: 'LineOutside', family: 'Aemstel LineOutside', weight: '400' },
      { value: 'Aemstel Shadow-400', label: 'Shadow', family: 'Aemstel Shadow', weight: '400' },
    ]},
    // AiDeep Family
    { label: 'AiDeep', options: [
      { value: 'AiDeep-400', label: 'Regular', family: 'AiDeep', weight: '400' },
    ]},
    // Coliner Family
    { label: 'Coliner', options: [
      { value: 'Coliner-300', label: 'Light', family: 'Coliner', weight: '300' },
      { value: 'Coliner-400', label: 'Regular', family: 'Coliner', weight: '400' },
      { value: 'Coliner-500', label: 'Medium', family: 'Coliner', weight: '500' },
      { value: 'Coliner-600', label: 'SemiBold', family: 'Coliner', weight: '600' },
      { value: 'Coliner-700', label: 'Bold', family: 'Coliner', weight: '700' },
      { value: 'Coliner-800', label: 'ExtraBold', family: 'Coliner', weight: '800' },
    ]},
    // HarmonyOS Sans SC Family
    { label: 'HarmonyOS Sans SC', options: [
      { value: 'HarmonyOS Sans SC-100', label: 'Thin', family: 'HarmonyOS Sans SC', weight: '100' },
      { value: 'HarmonyOS Sans SC-300', label: 'Light', family: 'HarmonyOS Sans SC', weight: '300' },
      { value: 'HarmonyOS Sans SC-500', label: 'Medium', family: 'HarmonyOS Sans SC', weight: '500' },
      { value: 'HarmonyOS Sans SC-700', label: 'Bold', family: 'HarmonyOS Sans SC', weight: '700' },
      { value: 'HarmonyOS Sans SC-900', label: 'Black', family: 'HarmonyOS Sans SC', weight: '900' },
    ]},
    // Other Custom Fonts
    { label: 'Custom', options: [
      { value: 'Monoline-400', label: 'Monoline', family: 'Monoline', weight: '400' },
      { value: 'Roline-400', label: 'Roline', family: 'Roline', weight: '400' },
      { value: 'Serenity-400', label: 'Serenity', family: 'Serenity', weight: '400' },
    ]}
];

// Computed property to get the combined value for the font selector
const activeLayerFontValue = computed({
  get() {
    if (!activeLayer.value) return null;
    return `${activeLayer.value.fontFamily}-${activeLayer.value.fontWeight}`;
  },
  set(newValue) {
    // This is handled by the @change event handler
  }
});

const handleFontChange = (value) => {
    if (!activeLayer.value || !value) return;
    
    // Find the selected font object from the nested options
    let selectedFont = null;
    for (const group of fontOptions) {
        const found = group.options.find(font => font.value === value);
        if (found) {
            selectedFont = found;
            break;
        }
    }

    if (selectedFont) {
        activeLayer.value.fontFamily = selectedFont.family;
        activeLayer.value.fontWeight = selectedFont.weight;
    }
};

const DESIGN_WIDTH = 3000; // The reference width for scaling

// --- Viewport State ---
const viewTransform = reactive({
  scale: 0.21,
  panOffset: { x: 1100, y: 1100 },
});
// --- End Viewport State ---

let resizeObserver = null;
let fontLinkElement = null;
let debounceTimer = null;

const PLACEHOLDER_BG_URL = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&q=80';
const PLACEHOLDER_DATA = {
    title: '专辑标题',
    performers: '表演者名称',
    displayInfo: '© 2024 Your Label',
};

let placeholderImage = null;
let isSpacebarDown = false;
const isPanning = ref(false);
let lastPanPoint = { x: 0, y: 0 };

// Grid & Snapping State
const gridOptions = reactive({
  visible: false,
  snapping: true,
  size: 100,
});

const blendModeOptions = ref([
  { label: '正常', value: 'source-over' },
  { label: '正片叠底', value: 'multiply' },
  { label: '滤色', value: 'screen' },
  { label: '叠加', value: 'overlay' },
  { label: '变暗', value: 'darken' },
  { label: '变亮', value: 'lighten' },
  { label: '颜色减淡', value: 'color-dodge' },
  { label: '颜色加深', value: 'color-burn' },
  { label: '强光', value: 'hard-light' },
  { label: '柔光', value: 'soft-light' },
  { label: '差值', value: 'difference' },
  { label: '排除', value: 'exclusion' },
]);

watch(currentTemplate, (newTemplate) => {
    if (!newTemplate) {
        return;
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        updatePreview(newTemplate);
    }, 200); // Shorten debounce for better responsiveness
}, { deep: true });

const fetchTemplates = async (selectId = null) => {
  try {
    const rawTemplates = await coverTemplateService.getAll();
    templates.value = rawTemplates.map(t => {
      // Ensure definition is an object
      if (typeof t.definition === 'string') {
        try {
          t.definition = JSON.parse(t.definition);
        } catch (e) {
          console.error(`Failed to parse definition for template ${t.id}:`, e);
          t.definition = { width: 3000, height: 3000, layers: [] }; // Provide a default structure
        }
      }
      
      // Ensure definition and layers array exist
      if (!t.definition) {
          t.definition = { width: 3000, height: 3000, layers: [] };
      }
      if (!Array.isArray(t.definition.layers)) {
        t.definition.layers = [];
      }

      // Ensure background object exists
      if (!t.definition.background) {
        t.definition.background = { type: 'image', value: PLACEHOLDER_BG_URL };
      }

      // Assign unique ID to each layer for v-for key and DnD
      t.definition.layers.forEach(layer => {
        if (!layer.id) {
          layer.id = generateUniqueLayerId();
        }
        if (layer.type === 'text') {
           if (!layer.textTransform) {
              layer.textTransform = 'none';
           }
        }
        if (layer.type === 'text' || layer.type === 'shape' || layer.type === 'rectangle') {
            if (!layer.blendMode) {
                layer.blendMode = 'source-over';
            }
            if (layer.opacity === undefined) {
                layer.opacity = 1;
            }
            if (!layer.orientation) layer.orientation = 'horizontal';
        }
        if (layer.rotation === undefined) {
            layer.rotation = 0;
        }
        if (layer.rotationOrigin === undefined) {
            layer.rotationOrigin = { x: 0, y: 0 };
        }
        if (layer.visible === undefined) {
            layer.visible = true;
        }
      });
      return t;
    });

    if (selectId) {
      currentTemplateId.value = selectId;
      handleTemplateSelectionChange(selectId);
    } else if (templates.value.length > 0) {
      currentTemplateId.value = templates.value[0].id;
      handleTemplateSelectionChange(currentTemplateId.value);
    } else {
      currentTemplate.value = null;
      currentTemplateId.value = null;
    }
  } catch (error) {
    ElMessage.error(error.message || '获取模板列表失败');
  }
};

onMounted(() => {
  fetchTemplates();
  if (previewAreaRef.value) {
    resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        viewTransform.scale = width / DESIGN_WIDTH;
      }
    });
    resizeObserver.observe(previewAreaRef.value);
  }

  // Pre-load placeholder image
  placeholderImage = new Image();
  placeholderImage.crossOrigin = "Anonymous"; // Handle CORS
  placeholderImage.src = PLACEHOLDER_BG_URL;
  placeholderImage.onload = () => {
      // Trigger a preview render once the image is loaded and a template is selected
      if(currentTemplate.value) {
          updatePreview(currentTemplate.value);
      }
  };

  // --- Add Event Listeners ---
  if (previewAreaRef.value) {
    previewAreaRef.value.addEventListener('wheel', handleWheel, { passive: false });
    previewAreaRef.value.addEventListener('mousedown', handleMouseDown);
  }
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('keyup', handleKeyUp);
  // --- End Event Listeners ---
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  if (previewAreaRef.value) {
    previewAreaRef.value.removeEventListener('wheel', handleWheel);
    previewAreaRef.value.removeEventListener('mousedown', handleMouseDown);
  }
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('keyup', handleKeyUp);
});

const ensureTemplateStructure = (template) => {
  if (!template.definition) {
    template.definition = {};
  }
  if (!Array.isArray(template.definition.layers)) {
    template.definition.layers = [];
  }
  return template;
};

const createNewTemplate = async () => {
  const newTemplateData = {
    name: "未命名模板",
    definition: {
      width: 3000,
      height: 3000,
      layers: [],
      background: {
        type: 'image',
        value: PLACEHOLDER_BG_URL
      }
    },
  };
  try {
    const savedTemplate = await coverTemplateService.create(newTemplateData);
    await fetchTemplates(savedTemplate.id);
    ElMessage.success('新模板已创建');
  } catch(error) {
    ElMessage.error('创建新模板失败');
  }
};

const selectTemplate = (template) => {
  if (!template) {
    currentTemplate.value = null;
    currentTemplateId.value = null;
    return;
  }
  currentTemplateId.value = template.id;
  currentTemplate.value = JSON.parse(JSON.stringify(template)); // Deep copy
  activeLayerIndex.value = currentTemplate.value.definition.layers.length > 0 ? 0 : -1;
  nextTick(() => {
    redrawCanvas();
  });
};

const handleAddLayer = (type) => {
  if (!currentTemplate.value) return;

  let newLayer;
  if (type === 'text') {
    newLayer = {
      id: generateUniqueLayerId(), 
      name: '文本',
      type: 'text',
      placeholder: 'title',
      text: '', // User override for preview
      fontFamily: 'Coliner',
      fontWeight: '400',
      fontSize: 80,
      color: 'rgba(255, 255, 255, 1)',
      textAlign: 'center',
      gravity: 'center',
      offsetX: 0,
      offsetY: 0,
      letterSpacing: 0,
      lineHeight: 1.2,
      textTransform: 'none',
      orientation: 'horizontal',
      blendMode: 'source-over',
      opacity: 1,
      visible: true,
      rotation: 0,
      rotationOrigin: { x: 0, y: 0 },
      splitIndex: 0,
    };
  } else if (type === 'rectangle') {
    newLayer = {
      id: generateUniqueLayerId(), 
      name: '矩形',
      type: 'shape',
      shapeType: 'rectangle',
      width: 500,
      height: 100,
      color: 'rgba(0, 0, 0, 0.5)',
      gravity: 'center',
      offsetX: 0,
      offsetY: 0,
      blendMode: 'source-over',
      opacity: 1,
      visible: true,
      rotation: 0,
      rotationOrigin: { x: 0, y: 0 },
    };
  } else if (type === 'effect-area') {
    newLayer = {
      id: generateUniqueLayerId(),
      name: '高斯模糊',
      type: 'effect-area',
      effect: 'gaussian-blur',
      radius: 20,
      width: 800,
      height: 800,
      gravity: 'center',
      offsetX: 0,
      offsetY: 0,
      visible: true,
      rotation: 0,
      rotationOrigin: { x: 0, y: 0 },
    };
  }
  
  if (newLayer) {
      currentTemplate.value.definition.layers.unshift(newLayer);
      // Select the newly added layer
      activeLayerIndex.value = 0;
  }
};

const removeLayer = (index) => {
  if (!currentTemplate.value) return;
  currentTemplate.value.definition.layers.splice(index, 1);
  
  // Adjust active layer index
  if (activeLayerIndex.value === index) {
      // If the deleted layer was the active one, select the previous one, or the new one at the same index, or none.
      if (currentTemplate.value.definition.layers.length === 0) {
          activeLayerIndex.value = -1;
      } else if (index >= currentTemplate.value.definition.layers.length) {
          // If the last item was deleted, select the new last item.
          activeLayerIndex.value = currentTemplate.value.definition.layers.length - 1;
      } else {
          // An item in the middle was deleted, the index can remain the same to select the next item.
          activeLayerIndex.value = index; 
      }
  } else if (activeLayerIndex.value > index) {
      // If a layer before the active one was deleted, decrement the index.
      activeLayerIndex.value--;
  }

};

const handleDragStart = (index) => {
  draggedLayerIndex.value = index;
};

const handleDragOver = (index) => {
  if (draggedLayerIndex.value !== null) {
    dragOverIndex.value = index;
  }
};

const handleDragLeave = () => {
  dragOverIndex.value = null;
};

const handleDrop = (targetIndex) => {
  if (draggedLayerIndex.value === null || draggedLayerIndex.value === targetIndex) {
    draggedLayerIndex.value = null;
    dragOverIndex.value = null;
    return;
  }
  
  const layers = currentTemplate.value.definition.layers;
  const draggedLayer = layers.splice(draggedLayerIndex.value, 1)[0];
  layers.splice(targetIndex, 0, draggedLayer);

  activeLayerIndex.value = targetIndex;
  draggedLayerIndex.value = null;
  dragOverIndex.value = null;
};

const openAiGenerator = () => {
  aiPrompt.value = '';
  aiGeneratorDialogVisible.value = true;
};

const handleAiHelpWrite = async () => {
  if (!aiPrompt.value) {
    ElMessage.warning('请先输入一些关键词');
    return;
  }
  isAiHelpingWrite.value = true;
  try {
    const newPrompt = await coverTemplateService.generateTemplatePromptWithAi(aiPrompt.value);
    aiPrompt.value = newPrompt;
    ElMessage.success('已根据您的关键词生成新想法！');
  } catch (error) {
    ElMessage.error(error.message || 'AI 帮写失败');
  } finally {
    isAiHelpingWrite.value = false;
  }
};

const handleAiGenerate = async () => {
  if (!aiPrompt.value) {
    ElMessage.warning('请输入您的设计想法');
    return;
  }
  isAiGenerating.value = true;
  try {
    // 1. Get template from AI
    const generatedTemplate = await coverTemplateService.generateTemplateWithAi(aiPrompt.value);
    
    // 2. Save the new template to DB to get an ID
    const savedTemplate = await coverTemplateService.create(generatedTemplate);
    
    ElMessage.success('AI 模板创建成功！');
    aiGeneratorDialogVisible.value = false;
    
    // 3. Refresh list and select the new template
    await fetchTemplates(savedTemplate.id);
    selectTemplate(savedTemplate);

  } catch (error) {
    ElMessage.error(error.message || 'AI 生成失败，请稍后再试');
  } finally {
    isAiGenerating.value = false;
  }
};

const openAiBgGenerator = () => {
    aiBgPrompt.value = '';
    aiBgGeneratorDialogVisible.value = true;
};

const handleAiGenerateBg = async () => {
    if (!aiBgPrompt.value) {
        ElMessage.warning('请输入您的设计想法');
        return;
    }
    isAiBgGenerating.value = true;
    try {
        const response = await axios.post('/ai/generate-cover', {
            prompt: aiBgPrompt.value,
            style: 'photorealistic'
        });

        if (response.data && response.data.url) {
            currentTemplate.value.definition.background.value = response.data.url;
            ElMessage.success('AI 背景生成成功！');
            aiBgGeneratorDialogVisible.value = false;
        } else {
            throw new Error('AI service did not return a valid URL.');
        }

    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'AI 背景生成失败';
        ElMessage.error(errorMessage);
    } finally {
        isAiBgGenerating.value = false;
    }
};

const handleAiHelpWriteBg = async () => {
    isAiBgHelpingWrite.value = true;
    try {
        const response = await axios.post('/ai-chat/generate-creative-prompt', {
            keywords: aiBgPrompt.value,
        });

        if (response.data && response.data.success && response.data.prompt) {
            aiBgPrompt.value = response.data.prompt;
            ElMessage.success('AI 已为您生成新想法！');
        } else {
            throw new Error(response.data.message || 'AI did not return a valid prompt.');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'AI 帮写失败';
        ElMessage.error(errorMessage);
    } finally {
        isAiBgHelpingWrite.value = false;
    }
};

const saveTemplate = async () => {
  if (!currentTemplate.value) return;
  isSaving.value = true;
  try {
    const dataToSave = {
      name: currentTemplate.value.name,
      definition: currentTemplate.value.definition
    };

    let savedTemplate;
    if (currentTemplate.value.id) {
      savedTemplate = await coverTemplateService.update(currentTemplate.value.id, dataToSave);
    } else {
      savedTemplate = await coverTemplateService.create(dataToSave);
    }
    await fetchTemplates(savedTemplate.id);
    ElMessage.success('模板已保存');
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    isSaving.value = false;
  }
};

const deleteCurrentTemplate = async () => {
    if (!currentTemplate.value || !currentTemplate.value.id) return;
    try {
        await coverTemplateService.delete(currentTemplate.value.id);
        ElMessage.success('模板删除成功');
        // Reset selection
        currentTemplate.value = null;
        currentTemplateId.value = null;
        await fetchTemplates();
    } catch(err) {
        ElMessage.error('删除失败');
    }
}

const getLayerPreviewText = (layer) => {
  if (layer.name && layer.name.trim()) {
    return layer.name;
  }

  if (layer.type === 'text') {
    let previewText = layer.text || (layer.placeholder ? (PLACEHOLDER_DATA[layer.placeholder] || '未命名文本') : '未命名文本');
    
    // Handle splitIndex logic
    if (layer.placeholder !== 'custom' && layer.splitIndex && typeof previewText === 'string') {
      const parts = previewText.split(' ');
      const index = parseInt(layer.splitIndex, 10);
      if (index > 0 && index <= parts.length) {
        previewText = parts[index - 1];
      } else if (index < 0 && Math.abs(index) <= parts.length) {
        previewText = parts[parts.length + index];
      }
      // If index is out of bounds for preview, we just show the full text
    }

    if (layer.textTransform === 'uppercase') {
      previewText = previewText.toUpperCase();
    }

    return previewText.length > 25 ? previewText.substring(0, 25) + '...' : previewText;
  }
  if (layer.type === 'shape' && layer.shapeType === 'rectangle') {
    return `矩形`;
  }
  if (layer.type === 'effect-area') {
    return layer.name || '效果区域';
  }
  return '未知图层';
};

function getTextHorizontalAlign(gravity) {
    if (gravity.includes('west')) return 'left';
    if (gravity.includes('east')) return 'right';
    return 'center';
}

function getTextVerticalAlign(gravity) {
    if (gravity.includes('north')) return 'top';
    if (gravity.includes('south')) return 'bottom';
    return 'middle';
}

const calculateBasePosition = (layer) => {
  const width = DESIGN_WIDTH;
  const height = DESIGN_WIDTH;
  let baseX = width / 2;
  if ((layer.gravity || 'center').includes('west')) baseX = 0;
  if ((layer.gravity || 'center').includes('east')) baseX = width;
  let baseY = height / 2;
  if ((layer.gravity || 'center').includes('north')) baseY = 0;
  if ((layer.gravity || 'center').includes('south')) baseY = height;
  return { finalX: baseX + (layer.offsetX || 0), finalY: baseY + (layer.offsetY || 0) };
};

const calculateRectTopLeft = (finalX, finalY, layer) => {
    let rectX = finalX;
    let rectY = finalY;
    if ((layer.gravity || 'center').includes('east')) rectX -= layer.width;
    else if (!(layer.gravity || 'center').includes('west')) rectX -= layer.width / 2;
    if ((layer.gravity || 'center').includes('south')) rectY -= layer.height;
    else if (!(layer.gravity || 'center').includes('north')) rectY -= layer.height / 2;
    return { rectX, rectY };
};

const getLayerBounds = (layer) => {
    if (!previewCanvasRef.value) return null;
    const { finalX, finalY } = calculateBasePosition(layer);

    if (layer.type === 'text') {
      const canvas = previewCanvasRef.value;
      const ctx = canvas.getContext('2d');
      // Temporarily set font to measure text
      ctx.font = `${layer.fontWeight || 'normal'} ${layer.fontSize || 80}px "${layer.fontFamily || 'Arial'}"`;
      ctx.letterSpacing = `${layer.letterSpacing || 0}px`;
      
      const textToMeasure = layer.text || (layer.placeholder ? (PLACEHOLDER_DATA[layer.placeholder] || '') : '');
      const lines = layer.orientation === 'vertical' ? textToMeasure.split('') : textToMeasure.split('\\n');
      const lineHeight = (layer.lineHeight || 1.2) * (layer.fontSize || 80);

      let maxWidth = 0;
      if (layer.orientation === 'vertical') {
        // For vertical text, max width is roughly the font size.
        // A more precise measure would be `ctx.measureText('M').width`, but this is a good approximation.
        maxWidth = layer.fontSize || 80;
      } else {
        if (lines.length > 0) {
          maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        }
      }

      const totalHeight = lines.length > 0 ? lines.length * lineHeight : 0;
      
      let x = finalX - maxWidth / 2;
      let y = finalY - totalHeight / 2;

      // This part is simplified and might not perfectly align with all textAlign settings.
      // It assumes 'center' alignment for bounding box calculation.
      return { x, y, width: maxWidth, height: totalHeight };
    } else if ((layer.type === 'shape' && layer.shapeType === 'rectangle') || layer.type === 'effect-area') {
      const { rectX, rectY } = calculateRectTopLeft(finalX, finalY, layer);
      return { x: rectX, y: rectY, width: layer.width, height: layer.height };
    }
    return null;
};

const drawOverlays = (ctx, template) => {
    const reversedLayers = [...template.definition.layers].reverse();
    const contentLayers = reversedLayers.filter(l => l.type !== 'effect-area');
    const effectLayers = reversedLayers.filter(l => l.type === 'effect-area');

    // --- Pass 1: Draw all content layers (text, shapes) ---
    contentLayers.forEach(layer => {
        if (!layer.visible) return;
        ctx.save();
        ctx.globalCompositeOperation = layer.blendMode || 'source-over';
        ctx.globalAlpha = layer.opacity === undefined ? 1 : layer.opacity;

        const { finalX, finalY } = calculateBasePosition(layer);
        
        const bounds = getLayerBounds(layer);
        if (bounds) {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            const originOffsetX = (layer.rotationOrigin.x / 100) * bounds.width / 2;
            const originOffsetY = (layer.rotationOrigin.y / 100) * bounds.height / 2;
            const rotationPointX = centerX + originOffsetX;
            const rotationPointY = centerY + originOffsetY;

            ctx.translate(rotationPointX, rotationPointY);
            ctx.rotate(layer.rotation * Math.PI / 180);
            ctx.translate(-rotationPointX, -rotationPointY);
        }

        if (layer.type === 'text') {
            let textToRender = layer.text || (layer.placeholder ? PLACEHOLDER_DATA[layer.placeholder] : '') || '';
            if (layer.textTransform === 'uppercase') {
              textToRender = textToRender.toUpperCase();
            }
            if (textToRender) {
                ctx.font = `${layer.fontWeight || 'normal'} ${layer.fontSize || 80}px "${layer.fontFamily || 'Arial'}"`;
                ctx.fillStyle = layer.color || '#FFFFFF';
                ctx.textAlign = layer.textAlign || 'center';
                ctx.textBaseline = 'middle';
                ctx.letterSpacing = `${layer.letterSpacing || 0}px`;

                const lines = layer.orientation === 'vertical' ? textToRender.split('') : textToRender.split('\\n');
                const lineHeight = (layer.lineHeight || 1.2) * (layer.fontSize || 80);
                const totalHeight = lines.length * lineHeight;
                let startY = finalY - totalHeight / 2 + lineHeight / 2;
                
                lines.forEach((line, index) => {
                    ctx.fillText(line, finalX, startY + (index * lineHeight));
                });
            }
        } else if (layer.type === 'shape' && layer.shapeType === 'rectangle') {
            ctx.fillStyle = layer.color || '#FFFFFF';
            const { rectX, rectY } = calculateRectTopLeft(finalX, finalY, layer);
            ctx.fillRect(rectX, rectY, layer.width, layer.height);
        }
        ctx.restore();
    });

    // --- Pass 2: Apply all effect layers using a robust clip-masking technique ---
    effectLayers.forEach(layer => {
        if (!layer.visible) return;
        
        if (layer.type === 'effect-area' && layer.effect === 'gaussian-blur' && layer.radius > 0) {
            const bounds = getLayerBounds(layer);
            if (bounds && bounds.width > 0 && bounds.height > 0) {
                // This is the most robust method, mirroring professional graphics software.
                
                // 1. Create a fully blurred clone of the entire canvas.
                const blurredCanvas = document.createElement('canvas');
                const blurredCtx = blurredCanvas.getContext('2d');
                blurredCanvas.width = ctx.canvas.width;
                blurredCanvas.height = ctx.canvas.height;
                
                // Copy the current state (with all content) to the new canvas.
                blurredCtx.drawImage(ctx.canvas, 0, 0);
                
                // Apply blur to the ENTIRE cloned canvas.
                canvasRGBA(blurredCanvas, 0, 0, blurredCanvas.width, blurredCanvas.height, layer.radius);
                
                // 2. Use a clipping mask on the main canvas to paste the blurred region.
                ctx.save();
                ctx.beginPath();
                ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
                ctx.clip();
                
                // 3. Draw the blurred canvas onto the main canvas. The clip ensures only the selected region is affected.
                ctx.drawImage(blurredCanvas, 0, 0);
                
                // 4. Restore the context to remove the clipping mask.
                ctx.restore();
            }
        }
    });


    // --- Final Pass: Draw UI Overlays (Grid and Selection) ---
    if (gridOptions.visible) {
      drawGrid(ctx);
    }

    // 5. Draw selection highlight for the active layer
    if (activeLayer.value) {
      const bounds = getLayerBounds(activeLayer.value);
      if (bounds) {
        ctx.save();
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const originOffsetX = (activeLayer.value.rotationOrigin.x / 100) * bounds.width / 2;
        const originOffsetY = (activeLayer.value.rotationOrigin.y / 100) * bounds.height / 2;
        const rotationPointX = centerX + originOffsetX;
        const rotationPointY = centerY + originOffsetY;

        // Rotate context for both the visualizer and the box
        ctx.save();
        ctx.translate(rotationPointX, rotationPointY);
        ctx.rotate(activeLayer.value.rotation * Math.PI / 180);
        ctx.translate(-rotationPointX, -rotationPointY);
        
        // Draw selection box
        ctx.lineWidth = 4 / viewTransform.scale; // Reduced from 6
        if (activeLayer.value.type === 'effect-area') {
          ctx.strokeStyle = 'rgba(255, 100, 255, 0.9)'; // Magenta for effects
          ctx.setLineDash([10 / viewTransform.scale, 10 / viewTransform.scale]); // Reduced from 15
        } else {
          ctx.strokeStyle = 'rgba(0, 128, 255, 0.9)'; // Blue for objects
          ctx.setLineDash([]); // Ensure solid line for non-effect areas
        }
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        ctx.restore(); // Restore from rotation

        // Draw the origin point visualizer on top (not rotated)
        ctx.beginPath();
        ctx.arc(rotationPointX, rotationPointY, 6 / viewTransform.scale, 0, 2 * Math.PI); // Reduced from 8
        ctx.fillStyle = 'rgba(0, 128, 255, 0.9)';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1 / viewTransform.scale; // Reduced from 1.5
        ctx.stroke();

        ctx.restore(); // Restore from the initial save
      }
    }
}

/**
 * Renders the complete template at full 3000x3000 resolution onto an offscreen canvas.
 * This function encapsulates all drawing logic (content and effects).
 * @param {Object} template - The template definition.
 * @returns {HTMLCanvasElement} A canvas element with the fully rendered template.
 */
const renderFinalImage = (template) => {
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = DESIGN_WIDTH;
    renderCanvas.height = DESIGN_WIDTH;
    const renderCtx = renderCanvas.getContext('2d');

    // --- Pass 1: Draw the background ---
    const bg = template.definition.background || { type: 'image', value: PLACEHOLDER_BG_URL };
    if (bg.type === 'color') {
        renderCtx.fillStyle = bg.value || '#CCCCCC';
        renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
    } else {
        if (bgCache.status === 'loaded') {
            renderCtx.drawImage(bgCache.image, 0, 0, renderCanvas.width, renderCanvas.height);
        } else {
            // Draw a fallback background if the image isn't ready
            renderCtx.fillStyle = '#CCCCCC';
            renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
        }
    }

    const reversedLayers = [...template.definition.layers].reverse();

    // --- Single-Pass, Layer-by-Layer Rendering ---
    reversedLayers.forEach(layer => {
        if (!layer.visible) return;

        // Handle effect layers
        if (layer.type === 'effect-area' && layer.effect === 'gaussian-blur' && layer.radius > 0) {
            const bounds = getLayerBounds(layer);
            if (bounds && bounds.width > 0 && bounds.height > 0) {
                // 1. Create a blurred snapshot of what's currently on the canvas
                const blurredSnapshot = document.createElement('canvas');
                const blurredSnapshotCtx = blurredSnapshot.getContext('2d');
                blurredSnapshot.width = renderCanvas.width;
                blurredSnapshot.height = renderCanvas.height;
                // Important: Draw the *current* state of the main canvas to the snapshot
                blurredSnapshotCtx.drawImage(renderCanvas, 0, 0); 
                canvasRGBA(blurredSnapshot, 0, 0, blurredSnapshot.width, blurredSnapshot.height, layer.radius);
                
                // 2. Use a clipping mask to draw the blurred snapshot back onto the main canvas
                renderCtx.save();
                renderCtx.beginPath();
                renderCtx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
                renderCtx.clip();
                renderCtx.drawImage(blurredSnapshot, 0, 0); // This draws the blurred content only within the clip area
                renderCtx.restore();
            }
        } 
        // Handle content layers (text, shapes)
        else {
            renderCtx.save();
            renderCtx.globalCompositeOperation = layer.blendMode || 'source-over';
            renderCtx.globalAlpha = layer.opacity === undefined ? 1 : layer.opacity;

            const { finalX, finalY } = calculateBasePosition(layer);
            
            const bounds = getLayerBounds(layer);
            if (bounds) {
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;
                const originOffsetX = (layer.rotationOrigin.x / 100) * bounds.width / 2;
                const originOffsetY = (layer.rotationOrigin.y / 100) * bounds.height / 2;
                const rotationPointX = centerX + originOffsetX;
                const rotationPointY = centerY + originOffsetY;

                renderCtx.translate(rotationPointX, rotationPointY);
                renderCtx.rotate(layer.rotation * Math.PI / 180);
                renderCtx.translate(-rotationPointX, -rotationPointY);
            }

            if (layer.type === 'text') {
                let textToRender = layer.text || (layer.placeholder ? PLACEHOLDER_DATA[layer.placeholder] : '') || '';
                if (layer.textTransform === 'uppercase') {
                  textToRender = textToRender.toUpperCase();
                }
                if (textToRender) {
                    renderCtx.font = `${layer.fontWeight || 'normal'} ${layer.fontSize || 80}px "${layer.fontFamily || 'Arial'}"`;
                    renderCtx.fillStyle = layer.color || '#FFFFFF';
                    renderCtx.textAlign = layer.textAlign || 'center';
                    renderCtx.textBaseline = 'middle';
                    renderCtx.letterSpacing = `${layer.letterSpacing || 0}px`;
                    const lines = layer.orientation === 'vertical' ? textToRender.split('') : textToRender.split('\\n');
                    const lineHeight = (layer.lineHeight || 1.2) * (layer.fontSize || 80);
                    const totalHeight = lines.length * lineHeight;
                    let startY = finalY - totalHeight / 2 + lineHeight / 2;
                    lines.forEach((line, index) => renderCtx.fillText(line, finalX, startY + (index * lineHeight)));
                }
            } else if (layer.type === 'shape' && layer.shapeType === 'rectangle') {
                renderCtx.fillStyle = layer.color || '#FFFFFF';
                const { rectX, rectY } = calculateRectTopLeft(finalX, finalY, layer);
                renderCtx.fillRect(rectX, rectY, layer.width, layer.height);
            }
            renderCtx.restore();
        }
    });

    return renderCanvas;
};

/**
 * Draws UI overlays like the grid and selection handles onto the visible canvas.
 * This is done after the main rendering and view transform.
 * @param {CanvasRenderingContext2D} ctx - The context of the visible canvas.
 */
const drawUiOverlays = (ctx) => {
    // Draw grid if visible
    if (gridOptions.visible) {
      drawGrid(ctx);
    }

    // Draw selection highlight for the active layer
    if (activeLayer.value) {
      const bounds = getLayerBounds(activeLayer.value);
      if (bounds) {
        ctx.save();
        
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const originOffsetX = (activeLayer.value.rotationOrigin.x / 100) * bounds.width / 2;
        const originOffsetY = (activeLayer.value.rotationOrigin.y / 100) * bounds.height / 2;
        const rotationPointX = centerX + originOffsetX;
        const rotationPointY = centerY + originOffsetY;

        ctx.save();
        ctx.translate(rotationPointX, rotationPointY);
        ctx.rotate(activeLayer.value.rotation * Math.PI / 180);
        ctx.translate(-rotationPointX, -rotationPointY);
        
        ctx.lineWidth = 4 / viewTransform.scale;
        if (activeLayer.value.type === 'effect-area') {
          ctx.strokeStyle = 'rgba(255, 100, 255, 0.9)';
          ctx.setLineDash([10 / viewTransform.scale, 10 / viewTransform.scale]);
        } else {
          ctx.strokeStyle = 'rgba(0, 128, 255, 0.9)';
          ctx.setLineDash([]);
        }
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(rotationPointX, rotationPointY, 6 / viewTransform.scale, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 128, 255, 0.9)';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1 / viewTransform.scale;
        ctx.stroke();

        ctx.restore();
      }
    }
}

const updatePreview = async (template) => {
    if (!template || !previewCanvasRef.value) {
        return;
    }

    const viewCanvas = previewCanvasRef.value;
    const viewCtx = viewCanvas.getContext('2d');
    viewCanvas.width = DESIGN_WIDTH;
    viewCanvas.height = DESIGN_WIDTH;

    // Orchestration logic
    const bg = template.definition.background || { type: 'image', value: PLACEHOLDER_BG_URL };
    const imageUrl = bg.type === 'image' ? (bg.value || PLACEHOLDER_BG_URL) : '__COLOR__';

    const drawFinal = () => {
        const finalRenderedCanvas = renderFinalImage(template);
        viewCtx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);
        viewCtx.save();
        viewCtx.translate(viewTransform.panOffset.x, viewTransform.panOffset.y);
        viewCtx.scale(viewTransform.scale, viewTransform.scale);
        viewCtx.drawImage(finalRenderedCanvas, 0, 0);
        drawUiOverlays(viewCtx);
        viewCtx.restore();
        isPreviewLoading.value = false;
    }

    if (bg.type === 'color') {
        drawFinal();
    } else { // image type
        if (bgCache.url !== imageUrl) {
            bgCache = { url: imageUrl, image: null, status: 'loading' };
            isPreviewLoading.value = true;
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                bgCache.image = img;
                bgCache.status = 'loaded';
                drawFinal();
            };
            img.onerror = () => {
                bgCache.status = 'error';
                drawFinal();
            };
            img.src = imageUrl;
        } else {
            drawFinal();
        }
    }
};

const drawGrid = (ctx) => {
  const width = DESIGN_WIDTH;
  const height = DESIGN_WIDTH;
  const size = gridOptions.size;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1 / viewTransform.scale; // Keep line width consistent when zoomed

  // Draw vertical lines
  for (let x = 0; x <= width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
};

// --- Event Handlers ---
const handleWheel = (e) => {
  if (!e.ctrlKey) return; // Zoom only with Ctrl key
  e.preventDefault();

  const zoomIntensity = 0.1;
  const oldScale = viewTransform.scale;
  
  // Get mouse position relative to the preview area
  const rect = previewAreaRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Determine zoom direction
  const delta = e.deltaY > 0 ? -1 : 1;
  const newScale = Math.max(0.05, Math.min(20, oldScale + delta * zoomIntensity * oldScale));
  
  // Calculate new pan offset to keep mouse position stable
  const worldX = (mouseX - viewTransform.panOffset.x) / oldScale;
  const worldY = (mouseY - viewTransform.panOffset.y) / oldScale;

  viewTransform.panOffset.x = mouseX - worldX * newScale;
  viewTransform.panOffset.y = mouseY - worldY * newScale;
  viewTransform.scale = newScale;

  // We need to redraw after transform change
  updatePreview(currentTemplate.value);
};

const handleMouseDown = (e) => {
  if (isSpacebarDown) {
    isPanning.value = true;
    lastPanPoint.x = e.clientX;
    lastPanPoint.y = e.clientY;
    previewAreaRef.value.style.cursor = 'grabbing';
  }
};

const handleMouseMove = (e) => {
  if (isPanning.value) {
    const dx = e.clientX - lastPanPoint.x;
    const dy = e.clientY - lastPanPoint.y;
    viewTransform.panOffset.x += dx;
    viewTransform.panOffset.y += dy;
    lastPanPoint.x = e.clientX;
    lastPanPoint.y = e.clientY;
    updatePreview(currentTemplate.value);
  }
};

const handleMouseUp = (e) => {
  isPanning.value = false;
  previewAreaRef.value.style.cursor = isSpacebarDown ? 'grab' : 'default';
};

const handleGlobalKeydown = (e) => {
  // Handle ESC key to exit custom fullscreen
  if (e.key === 'Escape' && editorContainerRef.value?.classList.contains('editor-fullscreen')) {
    editorContainerRef.value.classList.remove('editor-fullscreen');
  }

  // Handle Spacebar for panning
  const target = e.target;
  const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

  if (e.code === 'Space' && !isInputFocused) {
    if (!isSpacebarDown) {
      e.preventDefault();
      isSpacebarDown = true;
      if (previewAreaRef.value) {
        previewAreaRef.value.style.cursor = 'grab';
      }
    }
  }

  // Arrow key navigation for selected layer
  if (activeLayer.value && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    
    if (gridOptions.snapping) {
      const size = gridOptions.size;
      const { offsetX, offsetY } = activeLayer.value;

      switch (e.key) {
        case 'ArrowUp':
          activeLayer.value.offsetY = Math.floor((offsetY - 1) / size) * size;
          break;
        case 'ArrowDown':
          activeLayer.value.offsetY = Math.ceil((offsetY + 1) / size) * size;
          break;
        case 'ArrowLeft':
          activeLayer.value.offsetX = Math.floor((offsetX - 1) / size) * size;
          break;
        case 'ArrowRight':
          activeLayer.value.offsetX = Math.ceil((offsetX + 1) / size) * size;
          break;
      }
    } else {
      // If not snapping, move by 1 pixel
      const moveStep = 1;
      switch (e.key) {
        case 'ArrowUp':
          activeLayer.value.offsetY -= moveStep;
          break;
        case 'ArrowDown':
          activeLayer.value.offsetY += moveStep;
          break;
        case 'ArrowLeft':
          activeLayer.value.offsetX -= moveStep;
          break;
        case 'ArrowRight':
          activeLayer.value.offsetX += moveStep;
          break;
      }
    }
    updatePreview(currentTemplate.value);
  }
};

const handleKeyUp = (e) => {
  if (e.code === 'Space') {
    isSpacebarDown = false;
    previewAreaRef.value.style.cursor = 'default';
    if(isPanning.value) {
        isPanning.value = false;
    }
  }
};

const toggleFullscreen = () => {
  if (!editorContainerRef.value) return;
  
  if (editorContainerRef.value.classList.contains('editor-fullscreen')) {
    editorContainerRef.value.classList.remove('editor-fullscreen');
  } else {
    editorContainerRef.value.classList.add('editor-fullscreen');
  }
};

const selectLayer = (index) => {
  if (activeLayerIndex.value === index) {
    // If the clicked layer is already active, deselect it.
    activeLayerIndex.value = -1;
  } else {
    // Otherwise, select the new layer.
    activeLayerIndex.value = index;
  }
};

const deselectLayer = () => {
  activeLayerIndex.value = -1;
};

const redrawCanvas = () => {
  updatePreview(currentTemplate.value);
};

// Watch for changes in the active layer and redraw the canvas
watch(activeLayerIndex, () => {
    redrawCanvas();
});

watch(() => currentTemplate.value?.id, () => {
    // New template selected, reset cache
    bgCache = { url: null, image: null, status: 'empty' };
});

const handleTemplateSelectionChange = (id) => {
  const selected = templates.value.find(t => t.id === id);
  if (selected) {
    selectTemplate(selected);
  }
};

const resetView = () => {
  viewTransform.scale = 0.21;
  viewTransform.panOffset.x = 1100;
  viewTransform.panOffset.y = 1100;
};

const toggleLayerVisibility = (layer) => {
  layer.visible = !layer.visible;
};

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  layerIndex: null
});

const handleLayerContextMenu = (event, index) => {
  event.preventDefault();
  contextMenu.value.show = true;
  contextMenu.value.x = event.clientX;
  contextMenu.value.y = event.clientY;
  contextMenu.value.layerIndex = index;
};

const hideContextMenu = () => {
  contextMenu.value.show = false;
};

// This function will be called on clicks outside the menu
const handleClickOutside = (event) => {
    if (contextMenuRef.value && !contextMenuRef.value.contains(event.target)) {
        hideContextMenu();
    }
};

// Watch the visibility of the context menu to add/remove the global click listener
watch(() => contextMenu.value.show, (isVisible) => {
    if (isVisible) {
        // Use mousedown as it's more reliable for this kind of interaction
        document.addEventListener('mousedown', handleClickOutside);
    } else {
        document.removeEventListener('mousedown', handleClickOutside);
    }
});

// Clean up the listener when the component is unmounted
onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
});

const copyLayer = () => {
  if (contextMenu.value.layerIndex !== null) {
    const layerToCopy = JSON.parse(JSON.stringify(currentTemplate.value.definition.layers[contextMenu.value.layerIndex]));
    // Assign a new unique ID to the copied layer
    layerToCopy.id = generateUniqueLayerId();
    layerToCopy.name = `${layerToCopy.name} (副本)`;
    currentTemplate.value.definition.layers.splice(contextMenu.value.layerIndex + 1, 0, layerToCopy);
    hideContextMenu();
  }
};

const deleteLayer = () => {
  if (contextMenu.value.layerIndex !== null) {
    currentTemplate.value.definition.layers.splice(contextMenu.value.layerIndex, 1);
    hideContextMenu();
  }
};

const startRename = () => {
  if (contextMenu.value.layerIndex !== null) {
    editingLayerIndex.value = contextMenu.value.layerIndex;
    hideContextMenu();
    nextTick(() => {
      const input = document.querySelector('.rename-input');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }
};

const finishRename = () => {
  if (editingLayerIndex.value === null) return;
  const layer = currentTemplate.value.definition.layers[editingLayerIndex.value];
  if (layer && layer.name) {
    layer.name = layer.name.trim();
  }
  editingLayerIndex.value = null;
};
</script> 

<style scoped>
/* ... existing styles ... */

.context-menu {
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    box-shadow: 2px 2px 6px rgba(0,0,0,0.2);
    z-index: 1000;
    padding: 8px 0;
}

.context-menu ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.context-menu ul li {
    padding: 8px 16px;
    cursor: pointer;
}

.context-menu ul li:hover {
    background-color: #f0f0f0;
}

.rename-input {
  flex-grow: 1;
  background-color: #4f4f4f;
  color: white;
  border: 1px solid #686868;
  padding: 4px 6px;
  border-radius: 3px;
  margin-right: 10px;
}
</style> 
