<template>
  <div class="authorization-tool-container">
    <el-card class="authorization-tool-card box-card">
      <template #header>
        <div class="card-header">
          <h2>授权书生成工具</h2>
          <p class="description">此工具可以为任意用户生成授权书，管理员专用</p>
        </div>
      </template>
      
      <el-form :model="formData" ref="formRef" :rules="rules" label-position="top">
        <!-- 基本信息部分 -->
        <h3 class="section-title">授权人信息</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="授权人姓名" prop="realName">
              <el-input v-model="formData.realName" placeholder="请输入授权人姓名"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号码" prop="idNumber">
              <el-input v-model="formData.idNumber" placeholder="请输入身份证号码"></el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 选择专辑或手动输入 -->
        <h3 class="section-title">授权作品信息</h3>
        <el-form-item label="选择授权信息来源">
          <el-radio-group v-model="formData.sourceType" @change="handleSourceTypeChange">
            <el-radio label="existing">从现有专辑选择</el-radio>
            <el-radio label="manual">手动填写信息</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 从现有专辑选择 -->
        <template v-if="formData.sourceType === 'existing'">
          <el-form-item label="选择专辑" prop="albumId">
            <el-select 
              v-model="formData.albumId" 
              filterable 
              placeholder="请选择专辑"
              @change="handleAlbumSelect"
            >
              <el-option 
                v-for="album in albums" 
                :key="album.id" 
                :label="album.title" 
                :value="album.id"
              ></el-option>
            </el-select>
          </el-form-item>
        </template>

        <!-- 手动填写信息 -->
        <template v-else>
          <el-form-item label="专辑名称" prop="albumName">
            <el-input v-model="formData.albumName" placeholder="请输入专辑名称"></el-input>
          </el-form-item>
          
          <!-- 动态添加歌曲 -->
          <div class="songs-section">
            <div class="songs-header">
              <h4 class="song-group-title">歌曲信息</h4>
              <el-button type="primary" size="small" @click="addSong">添加歌曲</el-button>
            </div>
            
            <el-empty v-if="formData.songs.length === 0" description="请添加歌曲"></el-empty>
            
            <div v-for="(song, index) in formData.songs" :key="index" class="song-item">
              <div class="song-header">
                <h4 class="song-item-title">歌曲 {{ index + 1 }}</h4>
                <el-button type="danger" size="small" circle @click="removeSong(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item :label="'歌曲名称'" :prop="'songs.' + index + '.title'">
                    <el-input v-model="song.title" placeholder="请输入歌曲名称"></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="'表演者名称'" :prop="'songs.' + index + '.artists'">
                    <el-input v-model="song.artists" placeholder="请输入表演者名称，多个用、分隔"></el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item :label="'词作者'" :prop="'songs.' + index + '.lyricists'">
                    <el-input v-model="song.lyricists" placeholder="请输入词作者，多个用、分隔"></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="'曲作者'" :prop="'songs.' + index + '.composers'">
                    <el-input v-model="song.composers" placeholder="请输入曲作者，多个用、分隔"></el-input>
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>
        </template>

        <!-- 生成按钮 -->
        <div class="form-actions">
          <el-button type="primary" @click="generateAuthorization" :loading="generating">
            生成授权书
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { generateTempAuthorizationFile, generateAdminAuthorization } from '@/utils/authorizationService';

// 表单数据
const formData = reactive({
  realName: '',
  idNumber: '',
  sourceType: 'existing', // existing 或 manual
  albumId: '',
  albumName: '',
  songs: []
});

// 表单验证规则
const rules = {
  realName: [
    { required: true, message: '请输入授权人姓名', trigger: 'blur' }
  ],
  idNumber: [
    { required: true, message: '请输入身份证号码', trigger: 'blur' },
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号码', trigger: 'blur' }
  ],
  albumId: [
    { required: true, message: '请选择专辑', trigger: 'change' }
  ],
  albumName: [
    { required: true, message: '请输入专辑名称', trigger: 'blur' }
  ]
};

// 引用表单
const formRef = ref(null);
// 专辑列表
const albums = ref([]);
// 加载状态
const loading = ref(false);
// 生成状态
const generating = ref(false);

// 生命周期钩子
onMounted(() => {
  fetchAllAlbums();
});

// 获取所有专辑
const fetchAllAlbums = async () => {
  try {
    loading.value = true;
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/admin/all-albums`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    albums.value = response.data.albums || [];
  } catch (error) {
    console.error('获取专辑列表失败:', error);
    ElMessage.error('获取专辑列表失败');
  } finally {
    loading.value = false;
  }
};

// 添加歌曲
const addSong = () => {
  formData.songs.push({
    title: '',
    artists: '',
    lyricists: '',
    composers: ''
  });
};

// 移除歌曲
const removeSong = (index) => {
  formData.songs.splice(index, 1);
};

// 改变来源类型
const handleSourceTypeChange = (type) => {
  if (type === 'existing') {
    formData.albumName = '';
    formData.songs = [];
  } else {
    formData.albumId = '';
  }
};

// 处理专辑选择
const handleAlbumSelect = async (albumId) => {
  if (!albumId) return;
  
  try {
    const loadingInstance = ElLoading.service({
      target: '.authorization-tool-card',
      text: '加载专辑信息...'
    });
    
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/albums/${albumId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const album = response.data;
    console.log('获取到专辑信息:', album);
    
    loadingInstance.close();
  } catch (error) {
    console.error('获取专辑详情失败:', error);
    ElMessage.error('获取专辑详情失败');
  }
};

// 生成授权书
const generateAuthorization = async () => {
  // 先进行表单验证
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    
    generating.value = true;
    ElMessage.info('正在生成授权书，请稍候...');

    // 根据不同的来源类型准备数据
    let albumData = {};
    
    if (formData.sourceType === 'existing') {
      if (!formData.albumId) {
        ElMessage.error('请选择专辑');
        generating.value = false;
        return;
      }
      
      albumData = {
        id: formData.albumId,
        userInfo: {
          realName: formData.realName,
          idNumber: formData.idNumber
        }
      };
      
      // 调用现有API生成授权书
      await generateTempAuthorizationFile(formData.albumId, {
        idNumber: formData.idNumber,
        realName: formData.realName
      });
      
    } else {
      // 手动输入模式
      if (formData.songs.length === 0) {
        ElMessage.error('请添加至少一首歌曲');
        generating.value = false;
        return;
      }
      
      // 准备手动输入的数据
      const manualSongs = formData.songs.map((song, index) => {
        const artistArray = song.artists.split('、').map(name => ({ name, realName: name }));
        return {
          title: song.title,
          Artists: artistArray,
          lyricists: song.lyricists.split('、'),
          composers: song.composers.split('、')
        };
      });
      
      // 自定义生成授权书的函数调用
      const albumInfo = {
        title: formData.albumName,
        songs: manualSongs
      };
      
      // 调用生成服务
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_BASE_URL}/admin/generate-authorization`,
          {
            userInfo: {
              realName: formData.realName,
              idNumber: formData.idNumber
            },
            albumInfo
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        // 如果后端返回文件流
        if (response.data.fileUrl) {
          window.open(response.data.fileUrl, '_blank');
        }
      } catch (error) {
        console.error('生成授权书失败:', error);
        
        // 如果后端API不存在，则使用前端生成方式
        ElMessage.warning('使用前端方式生成授权书');
        
        // 使用前端方式生成（调用自定义函数）
        await generateManualAuthorization(formData.realName, formData.idNumber, albumInfo);
      }
    }
    
    ElMessage.success('授权书生成成功');
  } catch (error) {
    console.error('生成授权书失败:', error);
    ElMessage.error(error.message || '生成授权书失败，请检查表单信息');
  } finally {
    generating.value = false;
  }
};

// 自定义生成授权书函数
const generateManualAuthorization = async (realName, idNumber, albumInfo) => {
  try {
    const userInfo = {
      realName,
      idNumber
    };
    
    ElMessage.info('正在生成授权书，请稍候...');
    
    // 调用新增的管理员授权书生成函数
    const result = await generateAdminAuthorization(userInfo, albumInfo);
    
    return result;
  } catch (error) {
    console.error('生成授权书失败:', error);
    throw error;
  }
};
</script>

<style scoped>
.authorization-tool-container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: 100vh;
}

.box-card {
  border: 2px solid #000;
  border-radius: 0;
  box-shadow: 5px 5px 0px 0px #000;
}

:deep(.el-card__header) {
  border-bottom: 2px solid #000;
  padding: 20px;
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.card-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    text-transform: uppercase;
}

.description {
  color: #666;
  font-size: 14px;
  margin-top: 5px;
}

.section-title {
  margin-top: 20px;
  margin-bottom: 15px;
  font-weight: 700;
  font-size: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #000;
  text-transform: uppercase;
}

:deep(.el-form-item__label) {
    font-weight: bold;
    text-transform: uppercase;
    color: #000;
}

:deep(.el-input__wrapper), :deep(.el-select__wrapper) {
  border-radius: 0;
  border: 2px solid #000 !important;
  box-shadow: none !important;
}

:deep(.el-radio-group) {
    display: flex;
    gap: 10px;
}

:deep(.el-radio) {
    border: 2px solid #000;
    padding: 10px 15px;
    border-radius: 0;
    background-color: #fff;
    margin-right: 0;
}

:deep(.el-radio.is-checked) {
    background-color: #000;
}

:deep(.el-radio__input.is-checked .el-radio__inner) {
    border-color: #fff;
    background: #fff;
}
:deep(.el-radio__input.is-checked .el-radio__inner::after) {
    background-color: #000;
    transform: translate(-50%,-50%) scale(1);
}

:deep(.el-radio__label) {
    font-weight: bold;
    text-transform: uppercase;
    color: #000;
}
:deep(.el-radio.is-checked .el-radio__label) {
    color: #fff;
}


.songs-section {
  margin-top: 20px;
  border: 2px solid #000;
  padding: 15px;
  background-color: #f5f7fa;
}

.songs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #000;
}

.song-group-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
}

.song-item {
  background-color: white;
  border-radius: 0;
  padding: 15px;
  margin-bottom: 15px;
  border: 2px solid #000;
}

.song-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: none;
  padding-bottom: 0;
}

.song-item-title {
  margin: 0;
  font-size: 14px;
  color: #000;
  font-weight: bold;
  text-transform: uppercase;
}

.form-actions {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

:deep(.el-button) {
  border-radius: 0;
  border: 2px solid #000;
  background-color: #000;
  color: #fff;
  font-weight: bold;
  text-transform: uppercase;
}
:deep(.el-button:hover:not(.is-disabled)) {
  background-color: #333;
  border-color: #000;
}

:deep(.el-button--primary) {
  background-color: #000;
  color: #fff;
}

:deep(.el-button--danger) {
  background-color: #F56C6C;
  border-color: #000;
  color: #fff;
}
:deep(.el-button--danger:hover:not(.is-disabled)) {
    background-color: #f78989;
    border-color: #000;
}

:deep(.el-select) {
    width: 100%;
}
</style> 