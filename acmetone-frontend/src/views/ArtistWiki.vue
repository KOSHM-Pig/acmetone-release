<template>
  <div class="artist-wiki">
    <el-card class="page-header-card">
      <div class="page-header">
        <div class="header-left">
          <h2 class="page-title">歌手信息库</h2>
          <p class="page-subtitle">查看和管理所有歌手信息</p>
        </div>
        <div class="header-right">
          <div class="view-toggle">
            <span class="view-label">视图:</span>
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="card">
                <el-icon><Grid /></el-icon>
                卡片
              </el-radio-button>
              <el-radio-button label="list">
                <el-icon><List /></el-icon>
                列表
              </el-radio-button>
            </el-radio-group>
            <el-button 
              v-if="isAdmin" 
              type="primary" 
              size="small" 
              class="link-check-button" 
              @click="goToLinkChecker"
            >
              <el-icon><Search /></el-icon>
              检查链接格式
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 搜索框和添加歌手按钮 -->
    <div class="search-container">
      <div class="search-row">
        <el-input
          v-model="searchQuery"
          placeholder="搜索歌手名称"
          clearable
          prefix-icon="Search"
          @input="handleSearch"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch"></el-button>
          </template>
        </el-input>
        
        <div class="action-buttons">
              <el-button 
        v-if="isAdmin" 
        type="success" 
        size="small"
        :loading="batchFetchingInfo" 
        @click="fetchAllNeteaseSingerInfo" 
        class="batch-fetch-button"
      >
        <el-icon><Download /></el-icon>
        批量获取网易云信息
      </el-button>
          
          <el-dropdown @command="handleAddArtistCommand" trigger="click">
            <el-button type="primary" class="add-artist-button">
          <el-icon><Plus /></el-icon>
          添加歌手
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="existingArtist">添加已有歌手</el-dropdown-item>
                <el-dropdown-item command="fullNewArtist">新建全新歌手</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <div v-if="!isAdmin" class="user-artist-note">
        <div class="garrix-info-box">
          <div class="garrix-info-header">
            <el-icon class="info-icon"><InfoFilled /></el-icon>
            <h3>歌手管理提示</h3>
          </div>
          <div class="garrix-info-content">
            <div class="info-item">
              <span class="item-number">01</span>
              <p>您创建的歌手只有您自己和管理员可见</p>
            </div>
            <div class="info-item">
              <span class="item-number">02</span>
              <p>创建歌手后，您可以在添加歌曲时选择这些歌手</p>
            </div>
            <div class="info-item">
              <span class="item-number">03</span>
              <p>如需修改已有歌手信息，请提交修改申请</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="list-view">
      <el-table :data="filteredArtists" style="width: 100%" v-loading="loading">
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <div class="list-avatar">
              <img v-if="row.canonicalArtist && row.canonicalArtist.avatarUrl || row.avatarUrl" 
                   :src="row.canonicalArtist ? row.canonicalArtist.avatarUrl || row.avatarUrl : row.avatarUrl" 
                   :alt="row.name" />
              <div v-else class="no-avatar-list">无</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="艺名" min-width="120">
          <template #default="{ row }">
            <div class="artist-name-cell">
              {{ row.name }}
              <el-tag v-if="row.isNewArtist" size="small" type="danger" effect="dark" class="new-tag">NEW</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="实名" min-width="120">
          <template #default="{ row }">
            <span>{{ row.canonicalArtist ? row.canonicalArtist.realName || row.realName : row.realName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建者" min-width="120" v-if="isAdmin">
          <template #default="{ row }">
            <span v-if="row.createdBy">{{ row.createdBy.username }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="isAdmin" 
          prop="id_number" 
          label="身份证号码" 
          min-width="180"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span>{{ row.id_number ? maskIdNumber(row.id_number) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="平台链接" min-width="300">
        <template #default="{ row }">
          <div class="platform-links">
              <!-- 网易云音乐 -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.netease) || row.platforms.netease" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.netease || row.platforms.netease : row.platforms.netease" 
                 target="_blank" title="网易云音乐">
                <img src="/网易云.svg" alt="网易云音乐" class="platform-icon" />
              </a>
              
              <!-- QQ音乐 -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.qq) || row.platforms.qq" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.qq || row.platforms.qq : row.platforms.qq" 
                 target="_blank" title="QQ音乐">
                <img src="/QQ音乐.svg" alt="QQ音乐" class="platform-icon" />
              </a>
              
              <!-- 酷狗音乐 -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.kugou) || row.platforms.kugou" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.kugou || row.platforms.kugou : row.platforms.kugou" 
                 target="_blank" title="酷狗音乐">
                <img src="/酷狗音乐.svg" alt="酷狗音乐" class="platform-icon" />
              </a>
              
              <!-- 酷我音乐 -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.kuwo) || row.platforms.kuwo" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.kuwo || row.platforms.kuwo : row.platforms.kuwo" 
                 target="_blank" title="酷我音乐">
                <img src="/酷我音乐.svg" alt="酷我音乐" class="platform-icon" />
              </a>
              
              <!-- 汽水音乐 -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.qishui) || row.platforms.qishui" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.qishui || row.platforms.qishui : row.platforms.qishui" 
                 target="_blank" title="汽水音乐">
                <img src="/汽水音乐.svg" alt="汽水音乐" class="platform-icon" />
              </a>
              
              <!-- Spotify -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.spotify) || row.platforms.spotify" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.spotify || row.platforms.spotify : row.platforms.spotify" 
                 target="_blank" title="Spotify">
                <img src="/Spotify.svg" alt="Spotify" class="platform-icon" />
              </a>
              
              <!-- YouTube -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.youtube) || row.platforms.youtube" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.youtube || row.platforms.youtube : row.platforms.youtube" 
                 target="_blank" title="YouTube">
                <img src="/youtube.svg" alt="YouTube" class="platform-icon" />
              </a>
              
              <!-- Apple Music -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.appleMusic) || row.platforms.appleMusic" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.appleMusic || row.platforms.appleMusic : row.platforms.appleMusic" 
                 target="_blank" title="Apple Music">
                <img src="/applemusic.svg" alt="Apple Music" class="platform-icon" />
              </a>
              
              <!-- SoundCloud -->
              <a v-if="(row.canonicalArtist && row.canonicalArtist.platforms && row.canonicalArtist.platforms.soundCloud) || row.platforms.soundCloud" 
                 :href="row.canonicalArtist && row.canonicalArtist.platforms ? row.canonicalArtist.platforms.soundCloud || row.platforms.soundCloud : row.platforms.soundCloud" 
                 target="_blank" title="SoundCloud">
                <img src="/soundcloud.svg" alt="SoundCloud" class="platform-icon" />
              </a>
          </div>
        </template>
      </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
            <el-button v-if="isAdmin" type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-button 
              v-if="isAdmin && row.isNewArtist" 
              type="success" 
              size="small" 
              @click="handleConvertArtist(row)"
            >
              <el-icon><Link /></el-icon> 转为链接歌手
            </el-button>
            <el-button v-if="!isAdmin" type="success" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon> 申请修改
            </el-button>
            <el-button 
              v-if="isAdmin || row.createdById === userStore.user?.id" 
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
            >
              <el-icon><Delete /></el-icon> 删除
            </el-button>
        </template>
      </el-table-column>
    </el-table>
    </div>

    <!-- 卡片视图 -->
    <div v-else class="card-view">
      <el-row :gutter="24" v-loading="loading">
        <el-col v-for="artist in filteredArtists" :key="artist.id" :xs="24" :sm="24" :md="12" :lg="8" :xl="8">
          <div class="artist-card">
            <!-- 添加NEW标签 -->
            <div v-if="artist.isNewArtist" class="new-artist-badge">
              NEW
            </div>
            <!-- 复制按钮：有平台链接时显示 -->
             <!-- 创建者信息 -->
             <div v-if="artist.createdBy" class="artist-creator">
                <span class="creator-label">创建者：</span>
                <span class="creator-name">{{ artist.createdBy.username }}</span>
              </div>
            <el-tooltip v-if="hasAnyPlatformLink(artist)" content="复制艺人主页信息" placement="left">
              <el-button class="copy-artist-info-btn" circle size="small" @click.stop="copyArtistInfo(artist)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </el-tooltip>
            <div class="artist-card-content">
              <div class="artist-header" :class="{'has-avatar': artist.avatarUrl || (artist.canonicalArtist && artist.canonicalArtist.avatarUrl)}">
                <!-- 优先显示主歌手的头像 -->
                <div v-if="artist.canonicalArtist && artist.canonicalArtist.avatarUrl || artist.avatarUrl" class="artist-avatar">
                  <img :src="artist.canonicalArtist ? artist.canonicalArtist.avatarUrl || artist.avatarUrl : artist.avatarUrl" :alt="artist.name" />
                </div>
                <div class="artist-names">
                  <h3 class="artist-name">{{ artist.name }}</h3>
                  <span v-if="artist.realName" class="artist-realname">{{ artist.realName }}</span>
                  <span v-if="isAdmin && artist.id_number" class="artist-idnumber">
                    身份证号：{{ maskIdNumber(artist.id_number) }}
                  </span>
                  
                  <!-- 不显示关联歌手标签，只在内部处理数据 -->
                  <!-- 关联歌手不显示特殊标签 -->
                  
                  <div class="artist-type" v-if="(artist.canonicalArtist && artist.canonicalArtist.artistType) || artist.artistType">
                    <el-tag size="small" :type="(artist.canonicalArtist ? artist.canonicalArtist.artistType || artist.artistType : artist.artistType) === 'independent' ? 'success' : 'primary'">
                      {{ (artist.canonicalArtist ? artist.canonicalArtist.artistType || artist.artistType : artist.artistType) === 'independent' ? '独立音乐人' : '歌手' }}
                    </el-tag>
                  </div>
                </div>
              </div>
              
              <div class="artist-description" v-if="artist.canonicalArtist && artist.canonicalArtist.description || artist.description">
                <p>{{ truncateText(artist.canonicalArtist ? artist.canonicalArtist.description || artist.description : artist.description, 20) }}</p>
              </div>
              
              <!-- 平台链接 - 优先显示主歌手的平台链接 -->
              <div class="platform-container">
                <div class="platform-links">
                  <!-- 网易云音乐 -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.netease) || artist.platforms.netease" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.netease || artist.platforms.netease : artist.platforms.netease" 
                     target="_blank" class="platform-icon-link" title="网易云音乐">
                    <img src="/网易云.svg" alt="网易云音乐" />
                  </a>
                  
                  <!-- QQ音乐 -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.qq) || artist.platforms.qq" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.qq || artist.platforms.qq : artist.platforms.qq" 
                     target="_blank" class="platform-icon-link" title="QQ音乐">
                    <img src="/QQ音乐.svg" alt="QQ音乐" />
                  </a>
                  
                  <!-- 酷狗音乐 -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.kugou) || artist.platforms.kugou" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.kugou || artist.platforms.kugou : artist.platforms.kugou" 
                     target="_blank" class="platform-icon-link" title="酷狗音乐">
                    <img src="/酷狗音乐.svg" alt="酷狗音乐" />
                  </a>
                  
                  <!-- 酷我音乐 -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.kuwo) || artist.platforms.kuwo" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.kuwo || artist.platforms.kuwo : artist.platforms.kuwo" 
                     target="_blank" class="platform-icon-link" title="酷我音乐">
                    <img src="/酷我音乐.svg" alt="酷我音乐" />
                  </a>
                  
                  <!-- 汽水音乐 -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.qishui) || artist.platforms.qishui" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.qishui || artist.platforms.qishui : artist.platforms.qishui" 
                     target="_blank" class="platform-icon-link" title="汽水音乐">
                    <img src="/汽水音乐.svg" alt="汽水音乐" />
                  </a>
                </div>
              </div>
              
              <div class="platform-container second-row">
                <div class="platform-links">
                  <!-- Spotify -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.spotify) || artist.platforms.spotify" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.spotify || artist.platforms.spotify : artist.platforms.spotify" 
                     target="_blank" class="platform-icon-link" title="Spotify">
                    <img src="/Spotify.svg" alt="Spotify" />
                  </a>
                  
                  <!-- YouTube -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.youtube) || artist.platforms.youtube" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.youtube || artist.platforms.youtube : artist.platforms.youtube" 
                     target="_blank" class="platform-icon-link" title="YouTube">
                    <img src="/youtube.svg" alt="YouTube" />
                  </a>
                  
                  <!-- Apple Music -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.appleMusic) || artist.platforms.appleMusic" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.appleMusic || artist.platforms.appleMusic : artist.platforms.appleMusic" 
                     target="_blank" class="platform-icon-link" title="Apple Music">
                    <img src="/applemusic.svg" alt="Apple Music" />
                  </a>
                  
                  <!-- SoundCloud -->
                  <a v-if="(artist.canonicalArtist && artist.canonicalArtist.platforms.soundCloud) || artist.platforms.soundCloud" 
                     :href="artist.canonicalArtist ? artist.canonicalArtist.platforms.soundCloud || artist.platforms.soundCloud : artist.platforms.soundCloud" 
                     target="_blank" class="platform-icon-link" title="SoundCloud">
                    <img src="/soundcloud.svg" alt="SoundCloud" />
                  </a>
                </div>
              </div>
              
              
              
              <div class="artist-actions">
                
                <div class="button-wrapper">
                  <el-button 
                    v-if="isAdmin" 
                    type="primary" 
                    size="default" 
                    @click="handleEdit(artist)" 
                    class="action-button"
                  >
                    <el-icon><Edit /></el-icon> 编辑
                  </el-button>
                  <el-button 
                    v-if="isAdmin && artist.isNewArtist" 
                    type="success" 
                    size="default" 
                    @click="handleConvertArtist(artist)" 
                    class="action-button"
                  >
                    <el-icon><Link /></el-icon> 转为链接歌手
                  </el-button>
                  <el-button 
                    v-if="!isAdmin" 
                    type="success" 
                    size="default" 
                    @click="handleEdit(artist)" 
                    class="action-button"
                  >
                    <el-icon><Edit /></el-icon> 申请修改
                  </el-button>
                  <el-button 
                    v-if="isAdmin || artist.createdById === userStore.user?.id" 
                    type="danger" 
                    size="default" 
                    @click="handleDelete(artist)" 
                    class="action-button delete-button"
                  >
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="getDialogTitle()"
      width="95%"
      class="artist-edit-dialog wide-dialog"
      custom-class="wide-custom-dialog"
      :style="{
        width: '95%', 
        minWidth: isMobileView ? '300px' : '900px', 
        maxWidth: '1400px'
      }"
    >
      <!-- 添加歌手状态提示 -->
      <div v-if="!editForm.isNew && !editForm.isExistingArtist" class="artist-status-tip">
        <el-alert
          :type="editForm.isNewArtist ? 'success' : 'warning'"
          :title="editForm.isNewArtist ? '全新歌手' : '已有平台链接歌手'"
          :description="editForm.isNewArtist ? 
            '这是一个全新歌手，您可以修改所有信息。' : 
            '这是一个已有平台链接的歌手，您只能修改艺名、实名、身份证号和平台链接信息。'"
          :closable="false"
          show-icon
        />
      </div>
      
      <div class="edit-dialog-content" :class="{'mobile-layout': isMobileView}">
        <!-- 左侧表单区域 -->
        <div class="edit-form-container">
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
            :label-width="isMobileView ? '80px' : '120px'"
      >
        <!-- 基本信息字段，根据isExistingArtist模式显示或隐藏 -->
        <template v-if="!editForm.isExistingArtist">
        <el-form-item label="艺名" prop="name">
              <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="实名" prop="realName">
              <el-input v-model="editForm.realName" />
        </el-form-item>
        
        <!-- 全新歌手模式不显示匹配组件 -->
        
        <el-form-item label="身份证号码" prop="id_number">
          <el-input 
            v-model="editForm.id_number" 
            :show-password="!isAdmin"
            maxlength="18"
            placeholder="请输入18位身份证号码"
            :disabled="editForm.canonicalArtistId"
          />
          <div class="form-item-tip" v-if="!isAdmin && !editForm.canonicalArtistId">
            为保护隐私，身份证号码将加密显示
          </div>
          <div class="form-item-tip" v-if="editForm.canonicalArtistId">
            关联歌手使用主歌手的身份信息，无需填写
          </div>
        </el-form-item>
          
          <!-- 新增字段 - 仅对全新歌手或管理员显示 -->
          <template v-if="editForm.isNewArtist || isAdmin">
            <!-- 只在全新歌手模式或管理员编辑时显示地区设置 -->
            <el-form-item label="所在地区" prop="region" v-if="editForm.isNewArtist">
              <el-cascader
                v-model="editForm.region"
                :options="regionOptions"
                :props="{ expandTrigger: 'hover' }"
                placeholder="请选择所在地区"
                :disabled="!editForm.isNewArtist && !isAdmin"
              />
              <div class="form-item-tip" v-if="!editForm.isNewArtist && !isAdmin">
                已有平台链接的歌手不能修改所在地区
              </div>
            </el-form-item>
            
            <!-- 只在全新歌手模式或管理员编辑时显示歌手类型 -->
            <el-form-item label="歌手类型" prop="artistType" v-if="editForm.isNewArtist ">
              <el-select v-model="editForm.artistType" placeholder="请选择歌手类型" :disabled="!editForm.isNewArtist && !isAdmin">
                <el-option label="独立音乐人" value="independent" />
                <el-option label="歌手" value="singer" />
              </el-select>
              <div class="form-item-tip" v-if="!editForm.isNewArtist && !isAdmin">
                已有平台链接的歌手不能修改歌手类型
              </div>
            </el-form-item>
            
            <!-- 只在全新歌手模式或管理员编辑时显示艺人介绍 -->
            <el-form-item label="艺人介绍" prop="description" v-if="editForm.isNewArtist">
              <el-input 
                v-model="editForm.description" 
                type="textarea" 
                :rows="4"
                placeholder="请输入艺人介绍，简要描述艺人的音乐风格、经历等"
                :disabled="!editForm.isNewArtist && !isAdmin"
              />
              <div class="form-item-tip" v-if="!editForm.isNewArtist && !isAdmin">
                已有平台链接的歌手不能修改艺人介绍
              </div>
            </el-form-item>
            
            <!-- 只在全新歌手模式或管理员编辑时显示艺人头像 -->
            <el-form-item label="艺人头像" prop="avatar" v-if="editForm.isNewArtist">
              <div class="avatar-upload-container">
                <el-upload
                  class="avatar-uploader"
                  :action="''"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="handleAvatarChange"
                  :before-upload="beforeAvatarUpload"
                  :limit="1"
                >
                  <div v-if="avatarUrl" class="avatar-preview-wrapper">
                    <img :src="avatarUrl" class="avatar-preview" />
                    <div class="avatar-overlay">
                      <el-icon><Edit /></el-icon>
                    </div>
                  </div>
                  <div v-else class="avatar-placeholder">
                    <el-icon><Plus /></el-icon>
                  </div>
                </el-upload>
                <div class="avatar-tip">
                  <span v-if="avatarFile" class="success-tip">头像已选择</span>
                  <span v-else-if="avatarUrl" class="success-tip">当前头像</span>
                  <span v-else class="normal-tip">请上传JPG格式头像</span>
                </div>
              </div>
            </el-form-item>
          </template>
        </template>
        
            <!-- 基本信息字段 - 为已有歌手模式添加必要字段 -->
            <template v-if="editForm.isExistingArtist">
                        <div v-if="showArtistMatcher && matchedArtists.length > 0" class="artist-matcher-container">
          <!-- 添加艺人匹配组件 -->
          <SimilarArtistMatcher
            :name="editForm.name"
            :realName="editForm.realName"
            :matchedArtists="matchedArtists"
            @select="handleSelectMatchedArtist"
            @cancel="cancelArtistMatcher"
            @create-anyway="createArtistAnyway"
          />
        </div>
              <el-form-item label="艺名" prop="name">
                <el-input v-model="editForm.name" />
              </el-form-item>
              <el-form-item label="实名" prop="realName">
                <el-input v-model="editForm.realName" />
              </el-form-item>
              <el-form-item label="身份证号码" prop="id_number">
                <el-input 
                  v-model="editForm.id_number" 
                  :show-password="!isAdmin"
                  maxlength="18"
                  placeholder="请输入18位身份证号码"
                />
                <div class="form-item-tip" v-if="!isAdmin">
                  为保护隐私，身份证号码将加密显示
                </div>
              </el-form-item>
            </template>
            
            <!-- 全新歌手提示 -->
            <div v-if="isFullNewArtist" class="full-new-artist-tip">
              <el-alert
                type="info"
                title="全新歌手"
                description="您正在创建全新歌手，无需填写平台链接信息。"
                :closable="false"
                show-icon
              />
            </div>
            
            <!-- 添加已有歌手提示信息 -->
            <div v-if="editForm.isExistingArtist" class="existing-artist-tip">
              <el-alert
                type="warning"
                title="添加已有歌手"
                description="您正在添加已有歌手，请至少填写一个平台链接。"
                :closable="false"
                show-icon
              />
            </div>
            
            <el-divider v-if="!isFullNewArtist && (!editForm.isNewArtist || editForm.isExistingArtist)">平台链接</el-divider>
            
            <template v-if="!isFullNewArtist && (!editForm.isNewArtist || editForm.isExistingArtist)">
        <el-form-item label="网易云音乐" prop="platforms.netease">
          <div class="input-with-icon">
            <img src="/网易云.svg" alt="网易云音乐" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.netease" 
              placeholder="https://music.163.com/#/artist?id=xxxxx"
              @input="() => handleNeteaseUrlChange()"
              :status="!editForm.platformsValid.netease && editForm.platforms.netease ? 'error' : ''"
              :loading="fetchingNeteaseInfo"
            />
            <!-- 添加一键获取网易云信息按钮，仅管理员可见 -->
            <el-button 
              v-if="isAdmin && editForm.platformsValid.netease && editForm.platforms.netease" 
              type="primary" 
              size="small" 
              @click="fetchAndFillNeteaseInfo"
              :loading="fetchingNeteaseInfo"
              class="fetch-button"
            >
              <el-icon><Download /></el-icon>
              检测
            </el-button>
          </div>
          <div v-if="!editForm.platformsValid.netease && editForm.platforms.netease" class="link-validation-tip">
            格式错误，正确格式: https://music.163.com/#/artist?id=12345
          </div>
          <div v-if="fetchingNeteaseInfo" class="netease-info-preview fetching">
            <el-skeleton :rows="2" animated />
          </div>
          <div v-else-if="neteaseInfoFound" class="netease-info-preview">
            <div class="preview-content">
              <div class="preview-avatar">
                <img :src="neteaseArtistInfo.avatarUrl" alt="歌手头像" />
              </div>
              <div class="preview-text">
                <p><strong>歌手名:</strong> {{ neteaseArtistInfo.name }}</p>
                <p v-if="neteaseArtistInfo.realName"><strong>别名:</strong> {{ neteaseArtistInfo.realName }}</p>
                <p v-if="neteaseArtistInfo.briefDesc"><strong>简介:</strong> {{ neteaseArtistInfo.briefDesc }}</p>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="QQ音乐" prop="platforms.qq">
          <div class="input-with-icon">
            <img src="/QQ音乐.svg" alt="QQ音乐" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.qq" 
              placeholder="https://y.qq.com/n/ryqq/singer/xxxxx"
              @input="() => handlePlatformUrlChange('qq')"
              :status="!editForm.platformsValid.qq && editForm.platforms.qq ? 'error' : ''"
            />
          </div>
          <div v-if="!editForm.platformsValid.qq && editForm.platforms.qq" class="link-validation-tip">
            格式错误，正确格式: https://y.qq.com/n/ryqq/singer/002J4UUk29y8BY
          </div>
        </el-form-item>
        <el-form-item label="酷狗音乐" prop="platforms.kugou">
          <div class="input-with-icon">
            <img src="/酷狗音乐.svg" alt="酷狗音乐" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.kugou" 
              placeholder="https://www.kugou.com/singer/info/xxxxx"
              @input="() => handlePlatformUrlChange('kugou')"
              :status="editForm.platforms.kugou ? (editForm.platformsValid.kugou ? 'success' : 'error') : ''"
            />
          </div>
          <div v-if="editForm.platforms.kugou" :class="[
            'link-validation-tip',
            { 'is-success': editForm.platformsValid.kugou }
          ]">
            {{ editForm.platformsValid.kugou ? '链接格式正确' : '格式错误，正确格式: https://www.kugou.com/singer/info/xxxxx' }}
          </div>
        </el-form-item>
        <el-form-item label="酷我音乐" prop="platforms.kuwo">
          <div class="input-with-icon">
            <img src="/酷我音乐.svg" alt="酷我音乐" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.kuwo" 
              placeholder="https://kuwo.cn/singer_detail/xxxxx"
              @input="() => handlePlatformUrlChange('kuwo')"
              :status="!editForm.platformsValid.kuwo && editForm.platforms.kuwo ? 'error' : ''"
            />
          </div>
          <div v-if="!editForm.platformsValid.kuwo && editForm.platforms.kuwo" class="link-validation-tip">
            格式错误，正确格式: https://kuwo.cn/singer_detail/12345
          </div>
        </el-form-item>
        <el-form-item label="汽水音乐" prop="platforms.qishui">
          <div class="input-with-icon">
            <img src="/汽水音乐.svg" alt="汽水音乐" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.qishui" 
              placeholder="https://qishui.douyin.com/s/xxxxx"
              @input="() => handlePlatformUrlChange('qishui')"
              :status="!editForm.platformsValid.qishui && editForm.platforms.qishui ? 'error' : ''"
            />
          </div>
          <div v-if="!editForm.platformsValid.qishui && editForm.platforms.qishui" class="link-validation-tip">
            格式错误，正确格式: https://qishui.douyin.com/s/abcde
          </div>
        </el-form-item>
        <el-form-item label="Spotify" prop="platforms.spotify">
          <div class="input-with-icon">
            <img src="/Spotify.svg" alt="Spotify" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.spotify" 
              placeholder="https://open.spotify.com/artist/xxxxx"
              @input="() => handlePlatformUrlChange('spotify')"
              :status="!editForm.platformsValid.spotify && editForm.platforms.spotify ? 'error' : ''"
            />
          </div>
          <div v-if="!editForm.platformsValid.spotify && editForm.platforms.spotify" class="link-validation-tip">
            格式错误，正确格式: https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF
          </div>
        </el-form-item>
        <el-form-item label="YouTube" prop="platforms.youtube">
          <div class="input-with-icon">
            <img src="/youtube.svg" alt="YouTube" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.youtube" 
              placeholder="https://music.youtube.com/channel/xxxxx"
              @input="() => handlePlatformUrlChange('youtube')"
              :status="!editForm.platformsValid.youtube && editForm.platforms.youtube ? 'error' : ''"
            />
          </div>
          <div v-if="!editForm.platformsValid.youtube && editForm.platforms.youtube" class="link-validation-tip">
            格式错误，正确格式: https://music.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ
          </div>
        </el-form-item>
        <el-form-item label="Apple Music" prop="platforms.appleMusic">
          <div class="input-with-icon">
            <img src="/applemusic.svg" alt="Apple Music" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.appleMusic" 
              placeholder="https://music.apple.com/cn/artist/xxxxx"
              @input="() => handlePlatformUrlChange('appleMusic')"
              :status="!editForm.platformsValid.appleMusic && editForm.platforms.appleMusic ? 'error' : ''"
            />
          </div>
          <div v-if="!editForm.platformsValid.appleMusic && editForm.platforms.appleMusic" class="link-validation-tip">
            格式错误，正确格式: https://music.apple.com/cn/artist/artist-name/12345
          </div>
        </el-form-item>
        <el-form-item label="SoundCloud" prop="platforms.soundCloud">
          <div class="input-with-icon">
            <img src="/soundcloud.svg" alt="SoundCloud" class="input-icon" />
            <el-input 
              v-model="editForm.platforms.soundCloud" 
              placeholder="https://soundcloud.com/xxxxx"
              @input="() => handlePlatformUrlChange('soundCloud')"
              :status="!editForm.platformsValid.soundCloud && editForm.platforms.soundCloud ? 'error' : ''"
            />
          </div>
          <div v-if="!editForm.platformsValid.soundCloud && editForm.platforms.soundCloud" class="link-validation-tip">
            格式错误，正确格式: https://soundcloud.com/artist-name
          </div>
        </el-form-item>
            </template>

        <!-- 基本信息字段 - 非管理员修改申请时显示 -->
        <template v-if="!isAdmin && !editForm.isNew && !editForm.isExistingArtist">
          <el-divider>基本信息</el-divider>
          
          <el-form-item label="艺名" prop="name">
            <el-input v-model="editForm.name" placeholder="请输入修改后的艺名" />
          </el-form-item>
          
          <el-input 
                v-model="editForm.realName" 
                :disabled="editForm.canonicalArtistId"
              />
              <div class="form-item-tip" v-if="editForm.canonicalArtistId">
                关联歌手使用主歌手的身份信息，无需填写
              </div>
          
          <el-form-item label="身份证号码" prop="id_number">
            <el-input 
              v-model="editForm.id_number" 
              :show-password="!isAdmin"
              maxlength="18"
              placeholder="请输入18位身份证号码"
              :disabled="editForm.canonicalArtistId"
            />
            <div class="form-item-tip" v-if="!isAdmin && !editForm.canonicalArtistId">
              为保护隐私，身份证号码将加密显示
            </div>
            <div class="form-item-tip" v-if="editForm.canonicalArtistId">
              关联歌手使用主歌手的身份信息，无需填写
            </div>
          </el-form-item>
          
          <el-divider>修改原因</el-divider>
          
          <el-form-item label="修改说明" prop="reason">
            <el-input
              v-model="editForm.reason"
              type="textarea"
              :rows="3"
              placeholder="请详细说明修改原因，以便管理员审核"
            />
          </el-form-item>
        </template>
      </el-form>
        </div>
        
        <!-- 右侧AI识别区域 -->
        <PlatformLinkRecognizer 
          v-if="editForm.isExistingArtist || (!editForm.isNewArtist && !editForm.isExistingArtist && !editForm.isNew)" 
          :current-platforms="editForm.platforms"
          @apply-link="handleApplyIdentifiedLink"
          @apply-all-links="handleApplyAllIdentifiedLinks"
        />
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitEdit">
            {{ getSubmitButtonText() }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="删除歌手确认"
      width="30%"
    >
      <div class="delete-confirmation">
        <el-alert
          title="警告"
          type="error"
          description="删除操作不可恢复，请谨慎操作！"
          :closable="false"
          show-icon
        />
        <p class="delete-warning">您确定要删除歌手 <strong>"{{ currentArtist?.name }}"</strong> 吗？</p>
        <p>只有没有关联已审核通过专辑中歌曲的歌手才能被删除。</p>
        <p v-if="currentArtist?.createdById === userStore.user?.id" class="user-created-note">
          <el-icon><InfoFilled /></el-icon> 这是您创建的歌手
        </p>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete" :loading="deleteLoading">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 批量获取网易云歌手信息对话框 -->
    <el-dialog
      v-model="batchInfoDialogVisible"
      title="批量获取网易云歌手信息"
      width="90%"
      class="netease-info-dialog"
      :modal-append-to-body="false"
      :append-to-body="true"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <div class="batch-info-content">
        <div class="batch-selection-controls">
          <el-button size="small" @click="selectAllNeteaseInfo(true)">全选</el-button>
          <el-button size="small" @click="selectAllNeteaseInfo(false)">取消全选</el-button>
          <span class="selected-count">已选择: {{ selectedArtistIds.length }} / {{ neteaseInfoList.length }}</span>
        </div>
        
        <el-table
          :data="neteaseInfoList"
          style="width: 100%"
          @selection-change="handleSelectionChange"
          class="netease-info-table"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="歌手头像" width="100">
            <template #default="{ row }">
              <div class="netease-avatar">
                <img :src="row.avatarUrl" :alt="row.name" v-if="row.avatarUrl" />
                <div class="no-avatar" v-else>无头像</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="网易云艺名" width="120" />
          <el-table-column prop="realName" label="网易云别名" width="120" />
          <el-table-column 
            prop="briefDesc" 
            label="简介" 
            min-width="500"
            show-overflow-tooltip
            :show-overflow-tooltip-props="{ popperClass: 'netease-tooltip', enterable: false }"
          >
            <template #default="{ row }">
              <el-tooltip 
                :content="row.briefDesc || '无简介'" 
                placement="top" 
                :show-after="200"
                class="netease-tooltip-wrapper"
              >
                <div class="brief-desc netease-brief-desc">{{ row.briefDesc ? truncateText(row.briefDesc, 20) : '无简介' }}</div>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchInfoDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="applySelectedNeteaseInfo" :loading="batchFetchingInfo">
            应用选中的网易云歌手信息
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加转换歌手对话框 -->
<el-dialog
  v-model="convertDialogVisible"
  :title="`将歌手 '${currentArtist?.name || ''}' 转换为已有链接歌手`"
  width="95%"
  class="artist-edit-dialog wide-dialog convert-artist-dialog"
  custom-class="wide-custom-dialog"
  :style="{
    width: '95%', 
    minWidth: isMobileView ? '300px' : '900px', 
    maxWidth: '1400px'
  }"
  destroy-on-close
>
  <div v-if="currentArtist" class="convert-dialog-content">

    
    <div class="edit-dialog-content" :class="{'mobile-layout': isMobileView}">
      <!-- 左侧表单区域 -->
      <div class="edit-form-container">
        <el-form
          ref="convertFormRef"
          :model="convertForm"
          :rules="convertRules"
          :label-width="isMobileView ? '80px' : '120px'"
          class="convert-form"
        >
          <div class="platform-header">
            <el-divider>平台链接</el-divider>
          </div>
          
          <div class="platform-links-grid">
            <el-form-item label="网易云音乐" prop="platforms.netease">
              <div class="input-with-icon">
                <img src="/网易云.svg" alt="网易云音乐" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.netease" 
                  placeholder="https://music.163.com/#/artist?id=xxxxx"
                  @input="() => handleConvertPlatformUrlChange('netease')"
                  :status="!convertForm.platformsValid.netease && convertForm.platforms.netease ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.netease && convertForm.platforms.netease" class="link-validation-tip">
                格式错误，正确格式: https://music.163.com/#/artist?id=12345
              </div>
            </el-form-item>
            
            <el-form-item label="QQ音乐" prop="platforms.qq">
              <div class="input-with-icon">
                <img src="/QQ音乐.svg" alt="QQ音乐" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.qq" 
                  placeholder="https://y.qq.com/n/ryqq/singer/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('qq')"
                  :status="!convertForm.platformsValid.qq && convertForm.platforms.qq ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.qq && convertForm.platforms.qq" class="link-validation-tip">
                格式错误，正确格式: https://y.qq.com/n/ryqq/singer/002J4UUk29y8BY
              </div>
            </el-form-item>
            
            <el-form-item label="酷狗音乐" prop="platforms.kugou">
              <div class="input-with-icon">
                <img src="/酷狗音乐.svg" alt="酷狗音乐" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.kugou" 
                  placeholder="https://www.kugou.com/singer/info/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('kugou')"
                  :status="convertForm.platforms.kugou ? (convertForm.platformsValid.kugou ? 'success' : 'error') : ''"
                />
              </div>
              <div v-if="convertForm.platforms.kugou" :class="[
                'link-validation-tip',
                { 'is-success': convertForm.platformsValid.kugou }
              ]">
                {{ convertForm.platformsValid.kugou ? '链接格式正确' : '格式错误，正确格式: https://www.kugou.com/singer/info/xxxxx' }}
              </div>
            </el-form-item>
            
            <el-form-item label="酷我音乐" prop="platforms.kuwo">
              <div class="input-with-icon">
                <img src="/酷我音乐.svg" alt="酷我音乐" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.kuwo" 
                  placeholder="https://kuwo.cn/singer_detail/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('kuwo')"
                  :status="!convertForm.platformsValid.kuwo && convertForm.platforms.kuwo ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.kuwo && convertForm.platforms.kuwo" class="link-validation-tip">
                格式错误，正确格式: https://kuwo.cn/singer_detail/12345
              </div>
            </el-form-item>
            
            <el-form-item label="汽水音乐" prop="platforms.qishui">
              <div class="input-with-icon">
                <img src="/汽水音乐.svg" alt="汽水音乐" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.qishui" 
                  placeholder="https://qishui.douyin.com/s/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('qishui')"
                  :status="!convertForm.platformsValid.qishui && convertForm.platforms.qishui ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.qishui && convertForm.platforms.qishui" class="link-validation-tip">
                格式错误，正确格式: https://qishui.douyin.com/s/abcde
              </div>
            </el-form-item>
            
            <el-form-item label="Spotify" prop="platforms.spotify">
              <div class="input-with-icon">
                <img src="/Spotify.svg" alt="Spotify" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.spotify" 
                  placeholder="https://open.spotify.com/artist/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('spotify')"
                  :status="!convertForm.platformsValid.spotify && convertForm.platforms.spotify ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.spotify && convertForm.platforms.spotify" class="link-validation-tip">
                格式错误，正确格式: https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF
              </div>
            </el-form-item>
            
            <el-form-item label="YouTube" prop="platforms.youtube">
              <div class="input-with-icon">
                <img src="/youtube.svg" alt="YouTube" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.youtube" 
                  placeholder="https://music.youtube.com/channel/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('youtube')"
                  :status="!convertForm.platformsValid.youtube && convertForm.platforms.youtube ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.youtube && convertForm.platforms.youtube" class="link-validation-tip">
                格式错误，正确格式: https://music.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ
              </div>
            </el-form-item>
            
            <el-form-item label="Apple Music" prop="platforms.appleMusic">
              <div class="input-with-icon">
                <img src="/applemusic.svg" alt="Apple Music" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.appleMusic" 
                  placeholder="https://music.apple.com/cn/artist/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('appleMusic')"
                  :status="!convertForm.platformsValid.appleMusic && convertForm.platforms.appleMusic ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.appleMusic && convertForm.platforms.appleMusic" class="link-validation-tip">
                格式错误，正确格式: https://music.apple.com/cn/artist/artist-name/12345
              </div>
            </el-form-item>
            
            <el-form-item label="SoundCloud" prop="platforms.soundCloud">
              <div class="input-with-icon">
                <img src="/soundcloud.svg" alt="SoundCloud" class="input-icon" />
                <el-input 
                  v-model="convertForm.platforms.soundCloud" 
                  placeholder="https://soundcloud.com/xxxxx"
                  @input="() => handleConvertPlatformUrlChange('soundCloud')"
                  :status="!convertForm.platformsValid.soundCloud && convertForm.platforms.soundCloud ? 'error' : ''"
                />
              </div>
              <div v-if="!convertForm.platformsValid.soundCloud && convertForm.platforms.soundCloud" class="link-validation-tip">
                格式错误，正确格式: https://soundcloud.com/artist-name
              </div>
            </el-form-item>
          </div>
        </el-form>
      </div>
      
      <!-- 右侧AI识别区域 -->
      <div class="ai-recognizer-container">
        <div class="ai-recognizer-header">
          
        </div>
        <PlatformLinkRecognizer 
          :current-platforms="convertForm.platforms"
          @apply-link="handleApplyConvertIdentifiedLink"
          @apply-all-links="handleApplyAllConvertIdentifiedLinks"
        />
      </div>
    </div>
  </div>
  
  <template #footer>
    <span class="dialog-footer">
      <acmetone-btn type="secondary" @click="convertDialogVisible = false">取消</acmetone-btn>
      <acmetone-btn type="primary" @click="confirmConvertArtist" :loading="convertLoading">
        确认转换
      </acmetone-btn>
    </span>
  </template>
</el-dialog>

    <!-- 待审核申请对话框 -->
    <el-dialog
      v-model="pendingRequestDialogVisible"
      :title="'歌手' + (currentArtist?.name || '') + '的修改申请'"
      width="800px"
      class="pending-request-dialog"
      destroy-on-close
      :append-to-body="true"
      :fullscreen="isMobileView"
    >
      <div v-if="pendingRequest" class="pending-request-content">
        <div class="dialog-status-header">
          <span class="status-badge status-pending">待审核</span>
          <span class="request-time">申请时间：{{ formatDate(pendingRequest.createdAt) }}</span>
        </div>
        
        <div class="dialog-layout" :class="{'mobile-layout': isMobileView}">
          <!-- 左侧：修改理由和操作按钮 -->
          <div class="details-column">
            <div class="notice-box reason-box">
              <h5>修改理由</h5>
              <p>{{ pendingRequest.reason || '无' }}</p>
            </div>
            
            <div class="notice-box info-box">
              <h5>申请说明</h5>
              <p>此歌手已有待审核的修改申请，请等待管理员审核或撤销当前申请。如需修改申请内容，请先撤销当前申请。</p>
            </div>
            
            <div v-if="canCancelRequest" class="action-buttons">
              <acmetone-btn type="danger" @click="cancelRequest" :loading="cancelLoading">
                撤销申请
              </acmetone-btn>
            </div>
          </div>
          
          <!-- 右侧：修改内容对比 -->
          <div class="comparison-column">
            <h4>修改内容对比</h4>
            
            <div class="changes-list">
              <!-- 基本信息修改 -->
              <div v-if="pendingRequest.newName" class="change-item">
                <div class="change-label">艺名</div>
                <div class="change-content">
                  <div class="change-old">{{ pendingRequest.Artist?.name }}</div>
                  <el-icon><ArrowRight /></el-icon>
                  <div class="change-new">{{ pendingRequest.newName }}</div>
                </div>
              </div>
              
              <div v-if="pendingRequest.newRealName" class="change-item">
                <div class="change-label">实名</div>
                <div class="change-content">
                  <div class="change-old">{{ pendingRequest.Artist?.realName }}</div>
                  <el-icon><ArrowRight /></el-icon>
                  <div class="change-new">{{ pendingRequest.newRealName }}</div>
                </div>
              </div>
              
              <div v-if="pendingRequest.new_id_number" class="change-item">
                <div class="change-label">身份证号</div>
                <div class="change-content">
                  <div class="change-old">{{ maskIdNumber(pendingRequest.Artist?.id_number) || '未设置' }}</div>
                  <el-icon><ArrowRight /></el-icon>
                  <div class="change-new">{{ maskIdNumber(pendingRequest.new_id_number) }}</div>
                </div>
              </div>
              
              <!-- 平台链接修改 -->
              <template v-for="platform in platformFields" :key="platform">
                <div v-if="pendingRequest['new' + platform.charAt(0).toUpperCase() + platform.slice(1)]" class="change-item">
                  <div class="change-label">{{ getPlatformLabel(platform) }}</div>
                  <div class="change-content">
                    <div class="change-old">{{ pendingRequest.Artist?.[platform] || '未设置' }}</div>
                    <el-icon><ArrowRight /></el-icon>
                    <div class="change-new">{{ pendingRequest['new' + platform.charAt(0).toUpperCase() + platform.slice(1)] }}</div>
                  </div>
                </div>
              </template>
              
              <!-- 无修改内容时显示提示 -->
              <div v-if="!hasAnyChanges" class="no-changes">
                未发现任何修改内容
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <acmetone-btn type="secondary" @click="pendingRequestDialogVisible = false">关闭</acmetone-btn>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch, shallowRef } from 'vue';
import { useUserStore } from '@/stores/user';
import { useArtistEditRequestStore } from '@/stores/artistEditRequest';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL,STATIC_BASE_URL } from '@/config';
import { Search, Grid, List, Edit, Delete, Plus, InfoFilled, ArrowDown, Download, Loading, Check, Upload, CopyDocument, Link, ArrowRight } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { idNumberRegex, validatePlatformUrl, platformRegex } from '@/utils/constants';
import { validatePlatformLink, getPlatformLinkExample } from '@/utils/platformLinkValidator';
import { regionData } from '@/utils/regionData';
import PlatformLinkRecognizer from '@/components/artist/PlatformLinkRecognizer.vue';
import AcmetoneBtn from '@/components/acmetone/AcmetoneBtn.vue';
import SimilarArtistMatcher from '@/components/artist/SimilarArtistMatcher.vue';

const userStore = useUserStore();
const artistEditRequestStore = useArtistEditRequestStore();
const router = useRouter();

// 计算属性
const isAdmin = computed(() => userStore.user?.role === 'admin');

// 响应式数据
const artists = ref([]);
const loading = ref(false);
const viewMode = ref('card'); // 'card' 或 'list'
const searchQuery = ref('');
const editDialogVisible = ref(false);
const editFormRef = ref(null);

// 移动设备检测
const isMobileView = ref(false);
const checkMobileView = () => {
  isMobileView.value = window.innerWidth < 768;
};

// 监听窗口大小变化
onMounted(() => {
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
});

// 组件卸载时移除事件监听
const onBeforeUnmount = () => {
  window.removeEventListener('resize', checkMobileView);
};

// 分页参数
const currentPage = ref(1);
const pageSize = ref(20);
const totalArtists = ref(0);

// 筛选参数
const filterRegion = ref('');
const filterArtistType = ref('');
const sortBy = ref('name');
const sortOrder = ref('asc');
const hasAvatar = ref(false);
const hasDescription = ref(false);
const filterOptions = ref({
  regions: [],
  artistTypes: [],
  sortOptions: [
    { value: 'name', label: '按名称' },
    { value: 'createdAt', label: '按创建时间' },
    { value: 'updatedAt', label: '按更新时间' },
    { value: 'region', label: '按地区' },
    { value: 'artistType', label: '按艺术家类型' }
  ]
});

// 添加头像相关变量
const avatarUrl = ref('');
const avatarFile = ref(null);

// 地区选项数据
const regionOptions = ref([
  {
    value: 'china',
    label: '中国',
    children: [
      { value: 'mainland', label: '大陆' },
      { value: 'beijing', label: '北京' },
      { value: 'shanghai', label: '上海' },
      { value: 'guangdong', label: '广东' },
      { value: 'zhejiang', label: '浙江' },
      { value: 'jiangsu', label: '江苏' },
      { value: 'sichuan', label: '四川' },
      // 其他省份...
    ]
  },
  {
    value: 'abroad',
    label: '国外',
    children: [
      { value: 'usa', label: '美国' },
      { value: 'japan', label: '日本' },
      { value: 'korea', label: '韩国' },
      { value: 'uk', label: '英国' },
      { value: 'canada', label: '加拿大' },
      // 其他国家...
    ]
  }
]);

// 修改表单初始值，增加新字段
const editForm = ref({
  id: null,
  name: '',
  realName: '',
  id_number: '',
  region: [],
  artistType: '',
  description: '',
  platforms: {
    netease: '',
    qq: '',
    kugou: '',
    kuwo: '',
    qishui: '',
    spotify: '',
    youtube: '',
    appleMusic: '',
    soundCloud: ''
  },
  platformsValid: {
    netease: true,
    qq: true,
    kugou: true,
    kuwo: true,
    qishui: true,
    spotify: true,
    youtube: true,
    appleMusic: true,
    soundCloud: true
  },
  reason: '',
  isNew: true, // 标记为新建歌手
  isExistingArtist: false, // 标记是否为添加已有歌手
  isNewArtist: true // 标记是否为全新歌手（无平台链接）
});

// 删除相关数据
const deleteDialogVisible = ref(false);
const deleteLoading = ref(false);
const currentArtist = ref(null);

// 链接格式验证函数
const validateUrl = validatePlatformUrl;

// 过滤后的艺术家列表
const filteredArtists = computed(() => {
  if (!searchQuery.value) return artists.value;
  
  const query = searchQuery.value.toLowerCase();
  return artists.value.filter(artist => 
    artist.name.toLowerCase().includes(query) || 
    (artist.realName && artist.realName.toLowerCase().includes(query))
  );
});

// 添加身份证号码验证规则
const validateIdNumber = (rule, value, callback) => {
  if (!value) {
    callback();
  } else {
    // 身份证号码验证规则：18位，最后一位可以是X
    if (idNumberRegex.test(value)) {
      callback();
    } else {
      callback(new Error('请输入正确的18位身份证号码'));
    }
  }
};

// 添加一个验证函数，检查是否至少填写了一个平台链接
const validatePlatformLinks = (rule, value, callback) => {
  // 只在添加已有歌手模式下验证
  if (editForm.value.isExistingArtist) {
    const hasAnyLink = Object.values(editForm.value.platforms).some(link => link && link.trim() !== '');
    if (!hasAnyLink) {
      callback(new Error('添加已有歌手时，至少需要填写一个平台链接'));
    } else {
      callback();
    }
  } else {
    // 全新歌手不需要验证平台链接
    callback();
  }
};

// 修改表单验证规则，添加平台链接验证
const editRules = {
  name: [{ 
    required: true, 
    message: '请输入艺名', 
    trigger: 'blur' 
  }],
  realName: [{ 
    required: true, 
    message: '请输入实名', 
    trigger: 'blur' 
  }],
  id_number: [
    { validator: validateIdNumber, trigger: 'blur' }
  ],
  region: [{ 
    required: form => !form.isExistingArtist, 
    message: '请选择所在地区', 
    trigger: 'change' 
  }],
  artistType: [{ 
    required: form => !form.isExistingArtist, 
    message: '请选择歌手类型', 
    trigger: 'change' 
  }],
  description: [{ 
    required: form => !form.isExistingArtist, 
    message: '请输入艺人介绍', 
    trigger: 'blur' 
  }],
    avatar: [{ 
    validator: (rule, value, callback) => {
      if (avatarFile.value || avatarUrl.value) {
        // 如果已经上传了头像文件或已有头像URL，直接通过验证
        callback();
      } else if (form.isNew && !form.isExistingArtist) {
        // 只有新建全新歌手才需要验证头像
        callback(new Error('请上传艺人头像'));
      } else {
        // 其他情况通过验证
        callback();
      }
    },
    trigger: 'change'
  }],
      // 添加平台链接验证
  'platforms.netease': [
    { validator: validatePlatformLinks, trigger: 'blur' },
    { 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'netease')) {
        callback(new Error('请输入正确的网易云音乐链接格式'));
      } else {
        callback();
      }
    }, 
      trigger: 'blur' 
    }
  ],
  reason: [{ 
    required: (form) => !form.isNew && !form.isExistingArtist, 
    message: '请输入修改说明', 
    trigger: 'blur' 
  }],
  // 平台链接验证规则 - 使用同步方式
  'platforms.qq': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'qq')) {
        callback(new Error('请输入正确的QQ音乐链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }],
  'platforms.kugou': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'kugou')) {
        callback(new Error('请输入正确的酷狗音乐链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }],
  'platforms.kuwo': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'kuwo')) {
        callback(new Error('请输入正确的酷我音乐链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }],
  'platforms.qishui': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'qishui')) {
        callback(new Error('请输入正确的汽水音乐链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }],
  'platforms.spotify': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'spotify')) {
        callback(new Error('请输入正确的Spotify链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }],
  'platforms.youtube': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'youtube')) {
        callback(new Error('请输入正确的YouTube链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }],
  'platforms.appleMusic': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'appleMusic')) {
        callback(new Error('请输入正确的Apple Music链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }],
  'platforms.soundCloud': [{ 
    validator: (rule, value, callback) => {
      if (!value) {
        callback();
        return;
      }
      if (!validateUrl(value, 'soundCloud')) {
        callback(new Error('请输入正确的SoundCloud链接格式'));
      } else {
        callback();
      }
    }, 
    trigger: 'blur' 
  }]
};

// 生命周期钩子
onMounted(async () => {
  await fetchArtists();
});

// 方法
const fetchArtists = async () => {
  loading.value = true;
  console.log('[调试] 开始获取歌手列表...');
  console.log('[调试] API_BASE_URL:', API_BASE_URL);
  console.log('[调试] STATIC_BASE_URL:', STATIC_BASE_URL);
  
  try {
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[调试] 未找到认证token');
      throw new Error('未登录');
    }
    
    // 检查API路径
    const apiPath = `${API_BASE_URL}/artists`;
    console.log('[调试] 发送获取歌手列表请求到:', apiPath);
    
    // 准备请求头
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // 发送请求
    const response = await axios.get(apiPath, { 
      params: { query: searchQuery.value },
      headers
    });
    
    console.log('[调试] 获取歌手列表成功，状态码:', response.status);
    console.log('[调试] 响应数据结构:', Object.keys(response.data));
    
    // 检查响应数据结构
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('[调试] 响应数据不是数组格式:', response.data);
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        console.log('[调试] 使用response.data.results作为歌手列表');
        response.data = response.data.results;
      } else {
        console.error('[调试] 无法解析响应数据为歌手列表');
        artists.value = [];
        return;
      }
    }
    
    console.log('[调试] 返回歌手数量:', response.data.length);
    
    // 处理艺术家数据
    const artistList = response.data.map(artist => {
      // 构建平台链接对象
      const platforms = {
        netease: artist.netease || null,
        qq: artist.qq || null,
        kugou: artist.kugou || null,
        kuwo: artist.kuwo || null,
        qishui: artist.qishui || null,
        spotify: artist.spotify || null,
        youtube: artist.youtube || null,
        appleMusic: artist.appleMusic || null,
        soundCloud: artist.soundCloud || null
      };
      
      // 处理头像URL
      let avatarUrl = null;
      if (artist.avatarUrl) {
        avatarUrl = artist.avatarUrl.startsWith('http') 
          ? artist.avatarUrl 
          : `${STATIC_BASE_URL}/uploads/images/${artist.avatarUrl}`;
      }
      
      // 标记是否由当前用户创建
      const isCreatedByCurrentUser = artist.createdById === userStore.user?.id;
      
      // 检查是否为全新歌手
      // 1. 优先使用后端返回的 isNewArtist 字段
      // 2. 如果后端没有返回，则根据平台链接判断
      let isNewArtist = false;
      
      // 检查后端返回的 isNewArtist 字段
      if (artist.isNewArtist !== undefined) {
        // 兼容各种可能的真值: true, 1, "1", "true" 等
        isNewArtist = artist.isNewArtist === true || 
                      artist.isNewArtist === 1 || 
                      artist.isNewArtist === "1" || 
                      artist.isNewArtist === "true" || 
                      String(artist.isNewArtist).toLowerCase() === "true";
      } else {
        // 后端没有返回 isNewArtist 字段，根据平台链接判断
        const hasAnyPlatformLink = Object.values(platforms).some(link => link && link.trim() !== '');
        isNewArtist = !hasAnyPlatformLink;
      }
      
      console.log(`[调试] 歌手 ${artist.name} isNewArtist:`, isNewArtist, '原始值:', artist.isNewArtist);
      
      return {
        ...artist,
        avatarUrl,
        platforms,
        isCreatedByCurrentUser,
        isNewArtist // 确保传递isNewArtist字段
      };
    });
    
    console.log('[调试] 处理后的歌手列表:', artistList.map(a => ({
      id: a.id, 
      name: a.name, 
      isNewArtist: a.isNewArtist
    })));
    
    // 先更新界面展示
    artists.value = artistList;
    
    // // 然后异步加载真实头像 - 只为有网易云链接的歌手
    // loadArtistAvatars(artistList);
    
  } catch (error) {
    console.error('[调试] 获取歌手列表失败:', error);
    if (error.response) {
      console.error('[调试] 错误状态码:', error.response.status);
      console.error('[调试] 错误信息:', error.response.data);
    }
    ElMessage.error(error.response?.data?.message || '获取歌手列表失败');
    artists.value = []; // 确保在出错时artists是空数组
  } finally {
    loading.value = false;
    console.log('[调试] 获取歌手列表完成');
  }
};

const handleSearch = () => {
  // 搜索功能通过计算属性 filteredArtists 自动实现
  fetchArtists();
};

const getAvatarUrl = (artist) => {
  // 根据艺术家平台链接获取头像，这里简化处理
  // 实际项目中可以从某个音乐平台获取头像或使用默认头像
  return '';
};

const handleEdit = (row) => {
  currentArtist.value = row;
  
  // 检查是否为全新歌手
  // 1. 优先使用已有的 isNewArtist 字段
  // 2. 如果没有，则根据平台链接判断
  let isNewArtist = row.isNewArtist;
  
  // 如果 isNewArtist 未定义，则根据平台链接判断
  if (isNewArtist === undefined) {
    const hasAnyPlatformLink = row.platforms && Object.values(row.platforms).some(link => link && link.trim() !== '');
    isNewArtist = !hasAnyPlatformLink;
  }
  
  console.log('编辑歌手:', {
    id: row.id,
    name: row.name,
    realName: row.realName,
    id_number: isAdmin.value ? row.id_number : maskIdNumber(row.id_number),
    isNewArtist: isNewArtist
  });
  
  // 如果是管理员，直接打开编辑对话框
  if (isAdmin.value) {
    setEditForm(row, isNewArtist);
    editDialogVisible.value = true;
    return;
  }
  
  // 非管理员先检查是否有待审核的申请
  checkPendingRequest(row.id);
};

// 检查是否有待审核的申请
const checkPendingRequest = async (artistId) => {
  try {
    loading.value = true;
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    const response = await axios.get(`${API_BASE_URL}/artist-edit-requests/check/${artistId}`, { headers });
    
    if (response.data.hasPendingRequest) {
      // 有待审核的申请，显示申请内容
      pendingRequest.value = response.data.request;
      canCancelRequest.value = response.data.canCancel;
      pendingRequestDialogVisible.value = true;
    } else {
      // 没有待审核的申请，打开编辑对话框
      setEditForm(currentArtist.value, currentArtist.value.isNewArtist);
      editDialogVisible.value = true;
    }
  } catch (error) {
    console.error('检查待审核申请失败:', error);
    ElMessage.error('检查待审核申请失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 设置编辑表单
const setEditForm = (row, isNewArtist) => {
  // 检查是否有关联的主歌手
  const hasCanonicalArtist = row.canonicalArtist && Object.keys(row.canonicalArtist).length > 0;
  
  // 优先使用主歌手的信息，但保留当前歌手的ID
  const sourceData = hasCanonicalArtist ? {
    ...row,
    name: row.canonicalArtist.name || row.name,
    realName: row.canonicalArtist.realName || row.realName,
    // 身份证号码不显示
    id_number: '', 
    region: row.canonicalArtist.region || row.region,
    artistType: row.canonicalArtist.artistType || row.artistType,
    description: row.canonicalArtist.description || row.description,
    platforms: row.canonicalArtist.platforms || row.platforms,
    // 保存主歌手ID用于后端处理
    canonicalArtistId: row.canonicalArtistId
  } : row;
  
  editForm.value = {
    id: row.id, // 始终使用当前歌手的ID
    name: sourceData.name,
    realName: sourceData.realName,
    id_number: sourceData.id_number || '', // 无论是否管理员，都设置身份证号（非管理员会显示为密码）
    region: sourceData.region ? [sourceData.region] : [], // 确保region是数组
    artistType: sourceData.artistType || '',
    description: sourceData.description || '',
    platforms: { ...sourceData.platforms },
    platformsValid: {
      netease: true,
      qq: true,
      kugou: true,
      kuwo: true,
      qishui: true,
      spotify: true,
      youtube: true,
      appleMusic: true,
      soundCloud: true
    },
    reason: '',
    isNew: false, // 标记为已存在歌手
    isExistingArtist: false, // 标记为添加已有歌手
    isNewArtist: isNewArtist, // 设置是否为全新歌手
    canonicalArtistId: sourceData.canonicalArtistId // 保存主歌手ID
  };
  
  // 初始验证所有已有链接
  Object.keys(row.platforms).forEach(platform => {
    if (row.platforms[platform]) {
      editForm.value.platformsValid[platform] = validateUrl(row.platforms[platform], platform);
    }
  });
  
  // 设置现有头像
  if (row.avatarUrl) {
    avatarUrl.value = row.avatarUrl;
  } else {
    avatarUrl.value = '';
  }
  avatarFile.value = null;
};

const handleSubmitEdit = async () => {
  if (!editFormRef.value) return;
  
  // 检查全新歌手是否上传了头像（仅对新建全新歌手强制要求）
  if (editForm.value.isNew && !editForm.value.isExistingArtist && !avatarFile.value && !avatarUrl.value) {
    console.log('[调试] 头像文件缺失:', {
      isNew: editForm.value.isNew,
      isExistingArtist: editForm.value.isExistingArtist,
      avatarFile: avatarFile.value ? '有文件' : '无文件',
      avatarUrl: avatarUrl.value ? '有URL' : '无URL'
    });
    ElMessage.warning('请上传艺人头像');
    return;
  }
  
  // 如果是新建已有歌手且未显示过匹配组件，先进行艺人匹配检查
  // 注意：由于我们已经添加了watch监听器，这部分逻辑可能已经执行过，但为了安全起见仍保留
  if (editForm.value.isNew && editForm.value.isExistingArtist && !showArtistMatcher.value && (editForm.value.name || editForm.value.realName)) {
    try {
      const response = await axios.post(`${API_BASE_URL}/artist-wiki/search-potential-matches`, {
        name: editForm.value.name,
        realName: editForm.value.realName
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 如果有强匹配项，显示匹配组件
      if (response.data.hasStrongMatch && response.data.strongMatches.length > 0) {
        matchedArtists.value = response.data.strongMatches;
        showArtistMatcher.value = true;
        return; // 中断提交流程，等待用户选择
      }
    } catch (error) {
      console.error('搜索潜在匹配艺人失败:', error);
      // 继续创建流程，不阻止用户
    }
  }
  
  // 如果有头像文件，检查其状态
  if (avatarFile.value) {
    console.log('[调试] 头像文件状态:', {
      name: avatarFile.value.name,
      size: avatarFile.value.size,
      type: avatarFile.value.type,
      lastModified: new Date(avatarFile.value.lastModified).toISOString()
    });
  }
  
  // 添加已有歌手时检查是否至少有一个平台链接
  if (editForm.value.isNew && editForm.value.isExistingArtist) {
    const hasAnyLink = Object.values(editForm.value.platforms).some(link => link && link.trim() !== '');
    if (!hasAnyLink) {
      ElMessage.error('添加已有歌手时，至少需要填写一个平台链接');
      return;
    }
  }
  
  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 获取认证token
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('未找到认证token，可能会导致操作失败');
        }
        
        // 准备请求头
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        
        if (editForm.value.isNew) {
          if (editForm.value.isExistingArtist) {
            // 添加已有歌手（填写基本信息和平台链接）
            try {
              // 准备请求数据 - 根据后端API要求的格式
          const artistData = {
                name: editForm.value.name,
                realName: editForm.value.realName,
                id_number: editForm.value.id_number || null,
                platforms: {
                  netease: editForm.value.platforms.netease || null,
                  qq: editForm.value.platforms.qq || null,
                  kugou: editForm.value.platforms.kugou || null,
                  kuwo: editForm.value.platforms.kuwo || null,
                  qishui: editForm.value.platforms.qishui || null,
                  spotify: editForm.value.platforms.spotify || null,
                  youtube: editForm.value.platforms.youtube || null,
                  appleMusic: editForm.value.platforms.appleMusic || null,
                  soundCloud: editForm.value.platforms.soundCloud || null
                }
              };
              
              console.log('[调试] 添加已有歌手，发送数据:', JSON.stringify(artistData, null, 2));
              console.log('[调试] API端点:', `${API_BASE_URL}/artists`);
              console.log('[调试] 请求头:', {
                'Authorization': `Bearer ${token ? token.substring(0, 10) + '...' : 'null'}`,
                'Content-Type': 'application/json'
              });
              
              // 发送请求到后端API
              console.log('[调试] 开始发送请求...');
              const response = await axios.post(`${API_BASE_URL}/artists`, artistData, { 
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              console.log('[调试] 请求成功，响应状态码:', response.status);
              console.log('[调试] 响应数据:', JSON.stringify(response.data, null, 2));
              
              ElMessage.success(`已有歌手添加成功`);
              editDialogVisible.value = false;
              
              // 如果创建成功，将新歌手添加到本地列表中
              if (response.data && response.data.id) {
                console.log('[调试] 创建成功，歌手ID:', response.data.id);
                const newArtist = {
                  ...response.data,
                  isCreatedByCurrentUser: true,
                  isNewArtist: response.data.isNewArtist, // 明确设置isNewArtist字段
                  platforms: {
                    netease: response.data.netease || null,
                    qq: response.data.qq || null,
                    kugou: response.data.kugou || null,
                    kuwo: response.data.kuwo || null,
                    qishui: response.data.qishui || null,
                    spotify: response.data.spotify || null,
                    youtube: response.data.youtube || null,
                    appleMusic: response.data.appleMusic || null,
                    soundCloud: response.data.soundCloud || null
                  },
                };
                
                console.log('[调试] 添加新歌手到本地列表:', newArtist.name);
                artists.value.unshift(newArtist);
              } else {
                console.log('[调试] 响应数据中没有ID，刷新歌手列表');
                await fetchArtists();
              }
            } catch (error) {
              console.error('[调试] 添加已有歌手失败:', error);
              console.error('[调试] 错误详情:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data
              });
              ElMessage.error(error.response?.data?.message || '添加已有歌手失败，请稍后重试');
            }
          } else {
            // 创建全新歌手（完整信息）
            // 检查头像上传
            if (!avatarFile.value) {
              ElMessage.warning('请上传艺人头像');
              return;
            }
            
            try {
              console.log('[调试] 开始创建全新歌手:', {
                name: editForm.value.name,
                realName: editForm.value.realName,
                avatarFile: avatarFile.value ? avatarFile.value.name : '无'
              });
              
              // 准备请求数据
              const artistData = {
                name: editForm.value.name,
                realName: editForm.value.realName || '',
                id_number: editForm.value.id_number || null,
                region: editForm.value.region && editForm.value.region.length > 0 ? editForm.value.region.join(',') : '',
                artistType: editForm.value.artistType || '',
                description: editForm.value.description || '',
                platforms: {
                  netease: editForm.value.platforms.netease || '',
                  qq: editForm.value.platforms.qq || '',
                  kugou: editForm.value.platforms.kugou || '',
                  kuwo: editForm.value.platforms.kuwo || '',
                  qishui: editForm.value.platforms.qishui || '',
                  spotify: editForm.value.platforms.spotify || '',
                  youtube: editForm.value.platforms.youtube || '',
                  appleMusic: editForm.value.platforms.appleMusic || '',
                  soundCloud: editForm.value.platforms.soundCloud || ''
                },
                skipMatchCheck: showArtistMatcher.value // 如果已经显示过匹配组件，则跳过匹配检查
              };
              
              // 如果有头像文件，将其转换为Base64
              if (avatarFile.value) {
                try {
                  console.log('[调试] 准备转换头像文件为Base64:', {
                    name: avatarFile.value.name,
                    size: avatarFile.value.size,
                    type: avatarFile.value.type
                  });
            
                  // 将文件转换为Base64
                  const base64Data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = e => reject(new Error('读取文件失败'));
                    reader.readAsDataURL(avatarFile.value);
                  });
                  
                  // 提取Base64编码部分（去掉前缀）
                  const base64String = base64Data.split(',')[1];
                  
                  // 添加到请求数据
                  artistData.avatarBase64 = base64String;
                  artistData.avatarFileName = avatarFile.value.name;
                  artistData.avatarFileType = avatarFile.value.type;
                  
                  console.log('[调试] 已将头像转换为Base64，长度:', base64String.length);
                } catch (fileError) {
                  console.error('[调试] 转换头像文件为Base64时出错:', fileError);
                  ElMessage.error('处理头像文件时出错，请重新上传');
                  return;
              }
              }
              
              console.log('[调试] 发送创建全新歌手请求');
            
              try {
              // 发送请求到后端API - 使用Base64路由
              const response = await axios.post(`${API_BASE_URL}/artist-wiki/create-with-base64`, artistData, { 
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                timeout: 60000 // 60秒超时
              });
            
              console.log('[调试] 创建全新歌手成功，响应状态码:', response.status);
              console.log('[调试] 响应数据:', JSON.stringify(response.data, null, 2));
              console.log('[调试] isNewArtist字段:', response.data.isNewArtist);
              
            // 修改成功提示信息
            if (isAdmin.value) {
              ElMessage.success(`歌手 "${editForm.value.name}" 创建成功`);
            } else {
              ElMessage.success(`歌手 "${editForm.value.name}" 创建成功，现在可以在您的歌手列表中查看`);
            }
            
            editDialogVisible.value = false;
              } catch (error) {
                // 处理409冲突状态码（发现潜在匹配的艺人）
                if (error.response && error.response.status === 409) {
                  console.log('[调试] 发现潜在匹配的艺人:', error.response.data);
                  
                  // 显示匹配组件
                  if (error.response.data.strongMatches && error.response.data.strongMatches.length > 0) {
                    matchedArtists.value = error.response.data.strongMatches;
                    showArtistMatcher.value = true;
                    return; // 中断创建流程，等待用户选择
                  }
                }
                
                // 其他错误，继续抛出
                throw error;
              }
            
            // 如果创建成功，将新歌手添加到本地列表中
            if (response.data && response.data.id) {
              const newArtist = {
                ...response.data,
                  isCreatedByCurrentUser: true,
                  isNewArtist: response.data.isNewArtist, // 明确设置isNewArtist字段
                  platforms: {
                  netease: response.data.netease || null,
                  qq: response.data.qq || null,
                  kugou: response.data.kugou || null,
                  kuwo: response.data.kuwo || null,
                  qishui: response.data.qishui || null,
                  spotify: response.data.spotify || null,
                  youtube: response.data.youtube || null,
                  appleMusic: response.data.appleMusic || null,
                  soundCloud: response.data.soundCloud || null
                  },
                  avatarUrl: response.data.avatarUrl ? 
                    (response.data.avatarUrl.startsWith('http') ? 
                      response.data.avatarUrl : 
                      `${STATIC_BASE_URL}/uploads/images/${response.data.avatarUrl}`) : 
                    null
                };
                
                console.log('[调试] 添加全新歌手到本地列表:', newArtist);
              artists.value.unshift(newArtist);
            } else {
                console.log('[调试] 响应数据中没有ID，刷新歌手列表');
              await fetchArtists();
            }
          } catch (error) {
            console.error('创建歌手失败:', error);
              console.error('[调试] 错误详情:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data
              });
              
              // 针对特定错误提供更具体的错误信息
              if (error.response?.status === 500) {
                if (error.response?.data?.message === 'Unexpected end of form') {
                  console.error('[调试] 表单数据不完整，可能是文件上传问题');
                  ElMessage.error('文件上传失败，请检查头像文件并重新上传');
                } else {
                  ElMessage.error(`服务器错误: ${error.response?.data?.message || '未知错误'}`);
                }
              } else if (error.response?.status === 400) {
                ElMessage.error(`请求错误: ${error.response?.data?.message || '请检查输入数据'}`);
              } else {
              ElMessage.error(error.response?.data?.message || '创建歌手失败，请稍后重试');
              }
            }
          }
          return;
        }
        
        if (isAdmin.value) {
          // 管理员直接修改
          await axios.put(`${API_BASE_URL}/artist-edit-requests/artists/${editForm.value.id}`, {
            name: editForm.value.name,
            realName: editForm.value.realName,
            id_number: editForm.value.id_number,
            platforms: editForm.value.platforms
          }, { headers });
          ElMessage.success('修改成功');
        } else {
          // 普通用户提交申请
          const changes = {};
          
          // 检查基本信息是否有变化 - 无论是否全新歌手，都允许修改艺名、实名和身份证号
          if (editForm.value.name !== currentArtist.value.name) {
            changes.newName = editForm.value.name;
            console.log('修改艺名:', currentArtist.value.name, '->', editForm.value.name);
          }
          if (editForm.value.realName !== currentArtist.value.realName) {
            changes.newRealName = editForm.value.realName;
            console.log('修改实名:', currentArtist.value.realName, '->', editForm.value.realName);
          }
          if (editForm.value.id_number && editForm.value.id_number !== currentArtist.value.id_number) {
            changes.new_id_number = editForm.value.id_number;
            console.log('修改身份证号:', maskIdNumber(currentArtist.value.id_number), '->', maskIdNumber(editForm.value.id_number));
          }
          
          // 其他字段（如地区、艺人类型、描述等）仅对全新歌手允许修改
          if (editForm.value.isNewArtist) {
            // 可以添加其他基本信息字段的修改
          }
          
          // 检查平台链接是否有变化 - 所有歌手都可以修改平台链接
          const platformFields = {
            netease: 'newNetease',
            qq: 'newQq',
            kugou: 'newKugou',
            kuwo: 'newKuwo',
            qishui: 'newQishui',
            spotify: 'newSpotify',
            youtube: 'newYoutube',
            appleMusic: 'newAppleMusic',
            soundCloud: 'newSoundCloud'
          };

          Object.entries(platformFields).forEach(([key, newKey]) => {
            if (editForm.value.platforms[key] !== currentArtist.value.platforms[key]) {
              changes[newKey] = editForm.value.platforms[key] || null;
              console.log(`修改${key}链接:`, currentArtist.value.platforms[key], '->', editForm.value.platforms[key]);
            }
          });
          
          // 如果没有任何修改，提示用户
          if (Object.keys(changes).length === 0) {
            ElMessage.warning('没有发现任何修改');
            return;
          }
          
          console.log('提交修改申请:', changes);
          
          // 提交修改申请
          const requestData = {
            artistId: editForm.value.id,
            changes: changes,
            reason: editForm.value.reason
          };
          
          // 如果是关联歌手，记录主歌手ID
          if (editForm.value.canonicalArtistId) {
            console.log(`歌手 ${editForm.value.id} 是关联歌手，关联到主歌手 ${editForm.value.canonicalArtistId}`);
            // 后端会自动处理转发申请到主歌手
          }
          
          try {
            await axios.post(`${API_BASE_URL}/artist-edit-requests`, requestData, { headers });
            
            ElMessage.success('申请已提交，请等待管理员审核');
            editDialogVisible.value = false;
            await fetchArtists();
          } catch (submitError) {
            // 特殊处理409错误（已存在待审核申请）
            if (submitError.response && submitError.response.status === 409) {
              ElMessageBox.confirm(
                submitError.response.data.message,
                '申请冲突',
                {
                  confirmButtonText: '查看我的申请',
                  cancelButtonText: '关闭',
                  type: 'warning'
                }
              ).then(() => {
                // 跳转到用户申请列表页面
                // 如果有相应的页面可以跳转
                // router.push('/my-requests');
                
                // 或者关闭当前对话框
                editDialogVisible.value = false;
              }).catch(() => {
                // 用户点击关闭，不做任何操作
              });
            } else {
              // 其他错误正常显示
              ElMessage.error(submitError.response?.data?.message || '提交申请失败');
            }
          }
        }
      } catch (error) {
        console.error('操作失败:', error);
        ElMessage.error(error.response?.data?.message || '操作失败');
      }
    }
  });
};

const handleDelete = (artist) => {
  currentArtist.value = artist;
  
  // 检查是否是用户自己创建的艺人
  const isCreatedByCurrentUser = artist.createdById === userStore.user?.id;
  
  // 根据不同情况显示不同的确认信息
  if (isAdmin.value) {
  deleteDialogVisible.value = true;
  } else if (isCreatedByCurrentUser) {
    // 普通用户删除自己创建的艺人，显示简单确认对话框
    ElMessageBox.confirm(
      `确定要删除歌手 "${artist.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      confirmDelete();
    }).catch(() => {
      // 用户取消删除操作
    });
  } else {
    ElMessage.warning('您只能删除自己创建的歌手');
  }
};

const confirmDelete = async () => {
  if (!currentArtist.value) return;
  
  try {
    deleteLoading.value = true;
    
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('未找到认证token，可能会导致操作失败');
    }
    
    // 准备请求头
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 根据用户角色选择不同的API端点
    const apiEndpoint = isAdmin.value 
      ? `${API_BASE_URL}/artist-edit-requests/artists/${currentArtist.value.id}` 
      : `${API_BASE_URL}/artist-wiki/${currentArtist.value.id}`;
    
    await axios.delete(apiEndpoint, { headers });
    ElMessage.success(`歌手 ${currentArtist.value.name} 已被删除`);
    deleteDialogVisible.value = false;
    
    // 从本地列表中移除
    const index = artists.value.findIndex(a => a.id === currentArtist.value.id);
    if (index !== -1) {
      artists.value.splice(index, 1);
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      ElMessage.error(error.response.data.message);
    } else if (error.response && error.response.status === 403) {
      ElMessage.error('您没有权限删除此歌手');
    } else {
      ElMessage.error('删除歌手失败');
    }
    console.error('删除歌手错误:', error);
  } finally {
    deleteLoading.value = false;
  }
};

const goToLinkChecker = () => {
  router.push('/link-checker');
};

// 添加实时链接验证函数
const handlePlatformUrlChange = (platform) => {
  const url = editForm.value.platforms[platform];
  editForm.value.platformsValid[platform] = validateUrl(url, platform);
};

// 检查是否为全新歌手（无需平台链接）
const isFullNewArtist = computed(() => {
  return editForm.value.isNew && !editForm.value.isExistingArtist && editForm.value.isNewArtist;
});

// 添加身份证号码掩码函数
const maskIdNumber = (idNumber) => {
  if (!idNumber) return '';
  return idNumber.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
};

// 处理添加歌手的下拉菜单选择
const handleAddArtistCommand = (command) => {
  if (command === 'existingArtist') {
    // 添加已有歌手模式
    editForm.value = {
      id: null,
      name: '',
      realName: '',
      id_number: '',
      region: [],
      artistType: '',
      description: '',
      platforms: {
        netease: '',
        qq: '',
        kugou: '',
        kuwo: '',
        qishui: '',
        spotify: '',
        youtube: '',
        appleMusic: '',
        soundCloud: ''
      },
      platformsValid: {
        netease: true,
        qq: true,
        kugou: true,
        kuwo: true,
        qishui: true,
        spotify: true,
        youtube: true,
        appleMusic: true,
        soundCloud: true
      },
      reason: '',
      isNew: true,
      isExistingArtist: true,
      isNewArtist: false
    };
    
    // 重置网易云歌手信息
    neteaseArtistInfo.value = null;
  } else if (command === 'fullNewArtist') {
    // 新建全新歌手模式（无平台链接）
    editForm.value = {
      id: null,
      name: '',
      realName: '',
      id_number: '',
      region: [],
      artistType: '',
      description: '',
      platforms: {
        netease: '',
        qq: '',
        kugou: '',
        kuwo: '',
        qishui: '',
        spotify: '',
        youtube: '',
        appleMusic: '',
        soundCloud: ''
      },
      platformsValid: {
        netease: true,
        qq: true,
        kugou: true,
        kuwo: true,
        qishui: true,
        spotify: true,
        youtube: true,
        appleMusic: true,
        soundCloud: true
      },
      reason: '',
      isNew: true,
      isExistingArtist: false,
      isNewArtist: true // 标记为全新歌手
    };
    
    // 重置网易云歌手信息
    neteaseArtistInfo.value = null;
  }
  
  // 重置头像
  avatarUrl.value = '';
  avatarFile.value = null;
  
  // 显示对话框
  editDialogVisible.value = true;
};

// 网易云音乐歌手信息相关变量
const neteaseArtistInfo = ref(null);
const neteaseInfoFound = computed(() => neteaseArtistInfo.value !== null);
const fetchingNeteaseInfo = ref(false);

// 从网易云音乐URL中提取歌手ID - 修复提取逻辑
const extractNeteaseArtistId = (url) => {
  if (!url) return null;
  
  try {
    // 1. 直接从URL中提取id参数
    const idMatch = url.match(/id=([0-9]+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
    
    // 2. 处理其他格式的URL
    const artistMatch = url.match(/\/artist\/([0-9]+)/);
    if (artistMatch && artistMatch[1]) {
      return artistMatch[1];
    }
    
    // 3. 最后尝试解析URL对象
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);
    const id = searchParams.get('id');
    if (id) {
      return id;
    }
    
    console.warn('无法从网易云音乐链接中提取歌手ID:', url);
    return null;
  } catch (error) {
    console.error('解析网易云音乐链接失败:', error);
    return null;
  }
};

// 修改网易云音乐链接处理函数，在输入有效链接后自动获取信息
const handleNeteaseUrlChange = () => {
  const url = editForm.value.platforms.netease;
  
  // 每次URL变化时，先清空之前的歌手信息
  neteaseArtistInfo.value = null;
  
  // 使用同步验证，不使用await
  editForm.value.platformsValid.netease = url ? validateUrl(url, 'netease') : true;
  
  // 如果链接无效，直接返回
  if (!editForm.value.platformsValid.netease) {
    return;
  }
  
  // 如果链接有效但为空，不执行任何操作
  if (!url) {
    return;
  }
  
  // 仅在"添加已有歌手"模式下才自动获取网易云信息
  if (editForm.value.isExistingArtist) {
    // 链接有效，使用setTimeout异步获取歌手信息，避免在验证函数中使用await
    setTimeout(() => {
      fetchNeteaseArtistInfo();
    }, 10);
  }
};

// 获取网易云音乐歌手信息
const fetchNeteaseArtistInfo = async () => {
  // 每次请求前先清空之前的歌手信息
  neteaseArtistInfo.value = null;
  
  const artistId = extractNeteaseArtistId(editForm.value.platforms.netease);
  if (!artistId) {
    // 不显示错误消息，静默失败
    console.warn('无法从链接中提取歌手ID');
    return;
  }
  
  console.log(`开始获取网易云歌手信息，网易云ID: ${artistId}`);
  console.log(`网易云链接: ${editForm.value.platforms.netease}`);
  
  fetchingNeteaseInfo.value = true;
  try {
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    console.log(`使用后端代理API发送请求: ${API_BASE_URL}/proxy/netease/artist?id=${artistId}`);

    // 使用后端代理API获取歌手信息
    const response = await axios.get(`${API_BASE_URL}/proxy/netease/artist`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: { id: artistId }
    });
    
    console.log(`网易云API响应状态码: ${response.status}`);
    console.log(`网易云API响应码: ${response.data?.code || '无'}`);
    
    if (response.data && response.data.code === 200 && response.data.data && response.data.data.artist) {
      const artistData = response.data.data.artist;
      const userData = response.data.data.user;
      
      // 输出完整的artistData对象结构，方便调试
      console.log('获取到的歌手数据结构:', Object.keys(artistData));
      
      // 检查头像相关字段
      console.log('头像相关字段:', {
        avatar: artistData.avatar || '无',
        avatarUrl: artistData.avatarUrl || '无',
        cover: artistData.cover || '无',
        userAvatar: userData?.avatarUrl || '无'
      });
      
      // 处理地区信息
      let region = ['china', 'mainland']; // 默认为中国大陆
      
      if (userData && userData.province) {
        const province = userData.province;
        if (province === 1000000) {
          // 国外
          region = ['abroad'];
        } else if (province >= 110000) {
          // 中国省份，根据省份代码设置
          region = ['china'];
          
          // 根据省份代码设置具体省份
          switch(Math.floor(province / 10000)) {
            case 11: region.push('beijing'); break;
            case 31: region.push('shanghai'); break;
            case 44: region.push('guangdong'); break;
            case 33: region.push('zhejiang'); break;
            case 32: region.push('jiangsu'); break;
            case 51: region.push('sichuan'); break;
            default: region.push('mainland'); // 默认为大陆
          }
        }
      }
      
      neteaseArtistInfo.value = {
        id: artistData.id,
        name: artistData.name,
        realName: artistData.alias?.[0] || '',
        avatarUrl: artistData.avatar || artistData.cover || userData?.avatarUrl,
        briefDesc: artistData.briefDesc || '',
        region: region
      };
      
      // 不显示成功消息，保持界面简洁
      console.log('成功获取歌手信息:', neteaseArtistInfo.value);
    } else {
      console.warn('未找到歌手信息或API返回格式异常:', {
        响应码: response.data?.code,
        数据结构: response.data ? JSON.stringify(response.data).slice(0, 200) + '...' : '无数据'
      });
      
      // 根据错误码显示不同的提示信息
      if (response.status === 404 || (response.data && response.data.code === 404)) {
        ElMessage.warning({
          message: '无相关艺人，请检查ID是否正确',
          duration: 3000
        });
      } else {
        ElMessage.warning({
          message: '未找到有效的歌手信息，请检查链接是否正确',
          duration: 3000
        });
      }
      
      // 确保清空歌手信息
      neteaseArtistInfo.value = null;
    }
  } catch (error) {
    console.error('获取网易云音乐歌手信息失败:', error);
    console.error('错误详情:', {
      错误类型: error.name,
      错误消息: error.message,
      状态码: error.response?.status || '无响应',
      响应数据: error.response?.data ? JSON.stringify(error.response.data).slice(0, 200) + '...' : '无数据'
    });
    // 确保清空歌手信息
    neteaseArtistInfo.value = null;
  } finally {
    fetchingNeteaseInfo.value = false;
  }
};

// 获取网易云歌手信息（仅作为检测工具）
const fetchAndFillNeteaseInfo = async () => {
  // 每次请求前先清空之前的歌手信息
  neteaseArtistInfo.value = null;
  
  const artistId = extractNeteaseArtistId(editForm.value.platforms.netease);
  if (!artistId) {
    ElMessage.error('无法从链接中提取歌手ID');
    return;
  }
  
  fetchingNeteaseInfo.value = true;
  
  try {
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    // 使用后端代理API
    const response = await axios.get(`${API_BASE_URL}/proxy/netease/artist`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: { id: artistId }
    });
    
    if (response.data && response.data.code === 200 && response.data.data && response.data.data.artist) {
      const artistData = response.data.data.artist;
      const userData = response.data.data.user;
      
      // 处理地区信息
      let region = ['china', 'mainland']; // 默认为中国大陆
      
      if (userData && userData.province) {
        const province = userData.province;
        if (province === 1000000) {
          // 国外
          region = ['abroad'];
        } else if (province >= 110000) {
          // 中国省份，根据省份代码设置
          region = ['china'];
          
          // 根据省份代码设置具体省份
          switch(Math.floor(province / 10000)) {
            case 11: region.push('beijing'); break;
            case 31: region.push('shanghai'); break;
            case 44: region.push('guangdong'); break;
            case 33: region.push('zhejiang'); break;
            case 32: region.push('jiangsu'); break;
            case 51: region.push('sichuan'); break;
            default: region.push('mainland'); // 默认为大陆
          }
        }
      }
      
      // 保存网易云歌手信息
      neteaseArtistInfo.value = {
        id: artistData.id,
        name: artistData.name,
        realName: artistData.alias?.[0] || '',
        avatarUrl: artistData.avatar || artistData.cover || userData?.avatarUrl,
        briefDesc: artistData.briefDesc || '',
        alias: artistData.alias?.join(', ') || '',
        region: region
      };
      
      // 显示成功消息
      console.log('成功获取歌手信息:', neteaseArtistInfo.value);
    } else {
      console.warn('未找到歌手信息或API返回格式异常');
      
      // 根据错误码显示不同的提示信息
      if (response.status === 404 || (response.data && response.data.code === 404)) {
        ElMessage.warning({
          message: '无相关艺人，请检查ID是否正确',
          duration: 3000
        });
      } else {
        ElMessage.warning({
          message: '未找到有效的歌手信息，请检查链接是否正确',
          duration: 3000
        });
      }
    }
  } catch (error) {
    console.error('获取网易云音乐歌手信息失败:', error);
    
    // 根据错误类型显示不同的错误信息
    if (error.response && error.response.status === 404) {
      ElMessage.warning({
        message: '无相关艺人，请检查ID是否正确',
        duration: 3000
      });
    } else if (error.response && error.response.data && error.response.data.message) {
      ElMessage.error({
        message: `获取失败: ${error.response.data.message}`,
        duration: 3000
      });
    } else {
      ElMessage.error({
        message: '获取歌手信息失败，请检查链接或网络连接',
        duration: 3000
      });
    }
    
    // 确保清空歌手信息
    neteaseArtistInfo.value = null;
  } finally {
    fetchingNeteaseInfo.value = false;
  }
};

// 移除应用网易云歌手信息功能，仅保留为检测工具
const applyNeteaseInfo = () => {
  // 功能已移除，仅作为检测工具使用
  console.log('网易云音乐信息检测工具');
};

const applyNeteaseInfoToForm = () => {
  // 功能已移除，仅作为检测工具使用
  console.log('网易云音乐信息检测工具');
};

// 头像上传前的验证
const beforeAvatarUpload = (file) => {
  // 如果是从网易云API获取的头像，已经确认是合法的，直接通过
  if (neteaseArtistInfo.value && file.name.includes(`avatar_${neteaseArtistInfo.value.id}`)) {
    return true;
  }
  
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/jpg';
  const isPNG = file.type === 'image/png';
  const isValidType = isJPG || isPNG;
  const isLessThan2M = file.size / 1024 / 1024 < 2; // 限制为2MB
  
  if (!isValidType) {
    ElMessage.error('头像图片只能是JPG或PNG格式!');
    return false;
  }
  
  if (!isLessThan2M) {
    ElMessage.error('头像图片大小不能超过2MB!');
    return false;
  }
  
  // 检查图片尺寸 - 返回一个正常的Promise
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        if (img.width > 1200 || img.height > 1200) {
          ElMessage.error('图片尺寸不能超过1200x1200像素!');
          reject(false);
        } else {
          console.log('[调试] 头像验证通过:', file.name);
          resolve(true);
        }
      };
      img.onerror = () => reject(false);
    };
    reader.onerror = () => reject(false);
  });
};

// 处理头像变更
const handleAvatarChange = async (file) => {
  if (!file) return;
  
  console.log('[调试] 头像文件变更:', {
    name: file.name,
    size: file.raw.size,
    type: file.raw.type
  });
  
  try {
    // 如果文件大于1MB，尝试压缩
    if (file.raw.size > 1024 * 1024) {
      console.log('[调试] 文件过大，尝试压缩');
      
      // 创建一个Canvas来压缩图片
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // 等待图片加载
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file.raw);
      });
      
      // 计算压缩后的尺寸，保持宽高比
      let width = img.width;
      let height = img.height;
      const maxSize = 800; // 最大尺寸为800px
      
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      
      // 设置Canvas尺寸并绘制图片
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // 将Canvas转换为Blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85); // 使用85%的质量
      });
      
      // 创建新的File对象
      const compressedFile = new File([blob], file.raw.name, {
        type: 'image/jpeg',
        lastModified: new Date().getTime()
      });
      
      console.log('[调试] 图片压缩结果:', {
        原始大小: Math.round(file.raw.size / 1024) + 'KB',
        压缩后大小: Math.round(compressedFile.size / 1024) + 'KB',
        压缩率: Math.round((1 - compressedFile.size / file.raw.size) * 100) + '%'
      });
      
      // 使用压缩后的文件
      avatarFile.value = compressedFile;
    } else {
      // 文件大小合适，直接使用
  avatarFile.value = file.raw;
    }
    
    // 更新预览
    avatarUrl.value = URL.createObjectURL(avatarFile.value);
    
    // 手动更新表单验证状态
    if (editFormRef.value) {
      editFormRef.value.validateField('avatar');
    }
  } catch (error) {
    console.error('[调试] 处理头像文件时出错:', error);
    ElMessage.error('处理头像文件时出错，请重新上传');
  }
};

// 修改添加歌手按钮点击处理函数
const handleAddArtist = () => {
  handleAddArtistCommand('newArtist');
};

// 添加getDialogTitle函数
const getDialogTitle = () => {
  if (editForm.value.isNew) {
    if (editForm.value.isExistingArtist) {
      return '添加已有歌手';
    } else {
      return '新建全新歌手';
    }
  } else if (isAdmin.value) {
    return '编辑歌手信息';
  } else {
    return `申请修改歌手"${currentArtist.value?.name}"的信息`;
  }
};

// 获取提交按钮文本
const getSubmitButtonText = () => {
  if (editForm.value.isNew) {
    if (editForm.value.isExistingArtist) {
      return '添加';
    } else {
      return '创建全新歌手';
    }
  } else if (isAdmin.value) {
    return '保存';
  } else {
    return '提交修改申请';
  }
};

// 处理长文本截断，避免显示过长
const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

// 获取默认头像改为动态获取网易云头像
const getDefaultAvatar = (artist) => {
  // 返回默认头像图片，当无法获取网易云头像时使用
  return '/placeholder-album.png';
};

// 检查艺术家是否有网易云链接
const hasNeteaseLink = (artist) => {
  return artist && artist.platforms && artist.platforms.netease && artist.platforms.netease.trim() !== '';
};

// 异步加载歌手头像 - 只为有网易云链接的歌手加载头像
const loadArtistAvatars = (artistList) => {
  // 创建一个函数来安全地获取单个歌手的头像
  const loadSingleArtistAvatar = async (artist) => {
    if (!hasNeteaseLink(artist)) return;
    
    try {
      const artistId = extractNeteaseArtistId(artist.platforms.netease);
      if (!artistId) {
        console.warn('无法从链接提取ID:', artist.platforms.netease);
        return;
      }
      
      console.log('正在获取歌手头像:', artist.name, '网易云ID:', artistId);
      
      // 获取认证token
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('未登录，无法获取歌手头像');
        return;
      }
      
      // 使用后端代理API获取歌手信息
      try {
        const response = await axios.get(`${API_BASE_URL}/proxy/netease/artist`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: { id: artistId }
        });
        
        if (response.data && response.data.code === 200 && response.data.data && response.data.data.artist) {
          const artistData = response.data.data.artist;
          
          // 找到合适的头像URL
          let avatarUrl = artistData.avatarUrl || artistData.avatar || artistData.cover || artistData.picUrl || artistData.img1v1Url;
          
          if (!avatarUrl) {
            console.warn(`歌手 ${artist.name} 没有头像URL，使用默认头像`);
            avatarUrl = '/placeholder-album.png';
          }
          
          // 创建一个Image对象来预加载图像
          const img = new Image();
          
          // 成功加载时更新歌手头像
          img.onload = () => {
            const artistIndex = artists.value.findIndex(a => a.id === artist.id);
            if (artistIndex !== -1) {
              artists.value[artistIndex].avatarUrl = avatarUrl;
              console.log('已更新歌手头像:', artist.name);
            }
          };
          
          // 加载失败时记录错误但不抛出异常
          img.onerror = () => {
            console.warn('头像加载失败，使用默认头像:', artist.name);
          };
          
          // 开始加载图像
          img.src = avatarUrl;
        } else {
          console.warn(`获取歌手 ${artist.name} 的网易云信息失败，API返回无效数据`);
        }
      } catch (error) {
        console.error(`调用后端代理API获取歌手 ${artist.name} 信息失败:`, error);
        console.error('错误详情:', error.response?.data || error.message);
      }
    } catch (error) {
      console.error('获取歌手头像失败:', artist.name, error);
      // 错误时继续使用默认头像，不打断流程
    }
  };
  
  // 对每个歌手应用头像加载函数，使用Promise.all并行处理
  const promises = artistList.map(artist => loadSingleArtistAvatar(artist));
  
  // 等待所有头像加载完成
  Promise.all(promises).then(() => {
    console.log('所有歌手头像加载请求已发起');
  }).catch(error => {
    console.error('头像加载过程中发生错误:', error);
  });
};

// 添加变量
const batchFetchingInfo = ref(false);
const neteaseInfoList = ref([]);
const batchInfoDialogVisible = ref(false);
const selectedArtistIds = ref([]);

// 批量获取网易云歌手信息
const fetchAllNeteaseSingerInfo = async () => {
  batchFetchingInfo.value = true;
  neteaseInfoList.value = [];
  selectedArtistIds.value = [];
  
  try {
    // 筛选出有网易云链接的歌手
    const artistsWithNetease = artists.value.filter(artist => 
      artist.platforms && artist.platforms.netease && validateUrl(artist.platforms.netease, 'netease')
    );
    
    if (artistsWithNetease.length === 0) {
      ElMessage.warning('没有找到有效的网易云音乐歌手链接');
      batchFetchingInfo.value = false;
      return;
    }
    
    console.log('找到有网易云链接的歌手:', artistsWithNetease.map(a => ({
      id: a.id,
      name: a.name,
      neteaseUrl: a.platforms.netease
    })));
    
    ElMessage.info(`正在获取 ${artistsWithNetease.length} 位歌手的网易云信息，请稍候...`);
    
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    // 准备请求头
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 逐个获取歌手信息，使用Promise.all处理并行请求
    const fetchPromises = artistsWithNetease.map(async (artist) => {
      try {
        const artistId = extractNeteaseArtistId(artist.platforms.netease);
        if (!artistId) {
          console.warn(`无法从链接中提取歌手ID: ${artist.platforms.netease}`);
          return null;
        }
        
        console.log(`开始获取歌手 ${artist.name}(ID:${artist.id}) 的网易云信息，网易云ID:${artistId}`);
        
        // 使用我们的后端代理API
        const response = await axios.get(`${API_BASE_URL}/proxy/netease/artist`, {
          headers,
          params: { id: artistId }
        });
        
        if (response.data && response.data.code === 200 && response.data.data) {
          const artistData = response.data.data.artist;
          const userData = response.data.data.user;
          
          // 处理地区信息
          let region = ['china', 'mainland']; // 默认为中国大陆
          
          if (userData && userData.province) {
            const province = userData.province;
            if (province === 1000000) {
              // 国外
              region = ['abroad'];
            } else if (province >= 110000) {
              // 中国省份，根据省份代码设置
              region = ['china'];
              
              // 根据省份代码设置具体省份
              switch(Math.floor(province / 10000)) {
                case 11: region.push('beijing'); break;
                case 31: region.push('shanghai'); break;
                case 44: region.push('guangdong'); break;
                case 33: region.push('zhejiang'); break;
                case 32: region.push('jiangsu'); break;
                case 51: region.push('sichuan'); break;
                default: region.push('mainland'); // 默认为大陆
              }
            }
          }
          
          // 记录头像信息
          const avatarUrl = artistData.avatar || artistData.cover || userData?.avatarUrl;
          console.log(`歌手 ${artist.name} 的网易云信息获取成功:`, {
            网易云ID: artistData.id,
            网易云名称: artistData.name,
            头像URL: avatarUrl || '无头像',
            简介长度: artistData.briefDesc ? artistData.briefDesc.length : 0,
            地区: region.join('-')
          });
          
          // 返回所需信息
          return {
            originalArtistId: artist.id, // 原始数据库歌手ID
            neteaseId: artistData.id,
            name: artistData.name,
            realName: artistData.alias?.[0] || '',
            avatarUrl: avatarUrl,
            briefDesc: artistData.briefDesc || '',
            region: region,
            selected: true // 默认选中
          };
        }
        
        console.warn(`歌手 ${artist.name} 的网易云信息获取失败:`, {
          响应码: response.data?.code,
          数据: response.data?.data ? '有数据' : '无数据',
          歌手数据: response.data?.data?.artist ? '有歌手数据' : '无歌手数据'
        });
        
        return null;
      } catch (error) {
        console.error(`获取歌手 ${artist.name} 网易云信息失败:`, error);
        console.error('错误详情:', {
          错误类型: error.name,
          错误消息: error.message,
          状态码: error.response?.status || '无响应',
          响应数据: error.response?.data || '无数据'
        });
        return null;
      }
    });
    
    console.log(`等待 ${fetchPromises.length} 个歌手信息请求完成...`);
    
    // 等待所有请求完成
    const results = await Promise.all(fetchPromises);
    
    // 过滤掉失败的请求
    const validResults = results.filter(result => result !== null);
    
    console.log(`歌手信息获取结果: 共 ${results.length} 个请求，成功 ${validResults.length} 个，失败 ${results.length - validResults.length} 个`);
    
    if (validResults.length === 0) {
      ElMessage.warning('未能获取任何歌手的网易云信息');
      batchFetchingInfo.value = false;
      return;
    }
    
    // 更新列表并默认全选
    neteaseInfoList.value = validResults;
    selectedArtistIds.value = validResults.map(item => item.originalArtistId);
    
    // 显示对话框
    batchInfoDialogVisible.value = true;
    ElMessage.success(`成功获取 ${validResults.length} 位歌手的网易云信息`);
    
  } catch (error) {
    console.error('批量获取歌手信息失败:', error);
    console.error('错误堆栈:', error.stack);
    ElMessage.error('批量获取歌手信息失败');
  } finally {
    batchFetchingInfo.value = false;
  }
};

// 应用选中的网易云歌手信息
const applySelectedNeteaseInfo = async () => {
  if (selectedArtistIds.value.length === 0) {
    ElMessage.warning('请至少选择一位歌手');
    return;
  }
  
  try {
    // 获取选中的歌手信息
    const selectedInfo = neteaseInfoList.value.filter(item => 
      selectedArtistIds.value.includes(item.originalArtistId)
    );
    
    if (selectedInfo.length === 0) {
      ElMessage.warning('未选择任何歌手');
      return;
    }
    
    // 准备请求数据
    const updateData = selectedInfo.map(info => ({
      id: info.originalArtistId,
      name: info.name,
      realName: info.realName,
      description: info.briefDesc,
      avatarUrl: info.avatarUrl,
      region: info.region || ['china', 'mainland'], // 使用从API获取的地区信息
      artistType: 'independent' // 默认设置为独立音乐人
    }));
    
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    // 准备请求头
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 发送批量更新请求
    // 注意：后端需要实现对应的API
    const response = await axios.post(`${API_BASE_URL}/artists/batch-update`, {
      artists: updateData
    }, { headers });
    
    // 关闭对话框
    batchInfoDialogVisible.value = false;
    
    // 更新本地数据
    updateData.forEach(updatedArtist => {
      const index = artists.value.findIndex(artist => artist.id === updatedArtist.id);
      if (index !== -1) {
        // 更新关键字段
        artists.value[index].name = updatedArtist.name;
        artists.value[index].realName = updatedArtist.realName;
        artists.value[index].description = updatedArtist.description;
        artists.value[index].avatarUrl = updatedArtist.avatarUrl;
        artists.value[index].region = updatedArtist.region;
        artists.value[index].artistType = updatedArtist.artistType;
      }
    });
    
    ElMessage.success(`成功更新 ${updateData.length} 位歌手的信息`);
    
  } catch (error) {
    console.error('应用网易云信息失败:', error);
    ElMessage.error(error.response?.data?.message || '应用网易云信息失败');
  }
};

// 处理表格选择变化
const handleSelectionChange = (selection) => {
  selectedArtistIds.value = selection.map(item => item.originalArtistId);
};

// 全选/取消全选
const selectAllNeteaseInfo = (isSelect) => {
  if (isSelect) {
    selectedArtistIds.value = neteaseInfoList.value.map(item => item.originalArtistId);
  } else {
    selectedArtistIds.value = [];
  }
};

// 获取筛选选项
const fetchFilterOptions = async () => {
  try {
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    // 准备请求头
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // 发送请求
    const response = await axios.get(`${API_BASE_URL}/artist-wiki/filter-options`, { headers });
    
    // 更新筛选选项
    if (response.data) {
      // 保留原有的sortOptions
      const sortOptions = filterOptions.value.sortOptions;
      filterOptions.value = {
        ...response.data,
        sortOptions
      };
    }
    
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    // 确保filterOptions有默认值
    if (!filterOptions.value.regions) {
      filterOptions.value.regions = [];
    }
    if (!filterOptions.value.artistTypes) {
      filterOptions.value.artistTypes = [];
    }
  }
};

// 监听搜索查询变化
watch(searchQuery, () => {
  fetchArtists();
});

// 处理从PlatformLinkRecognizer组件应用单个链接
const handleApplyIdentifiedLink = ({ platform, link }) => {
    editForm.value.platforms[platform] = link;
    handlePlatformUrlChange(platform);
    ElMessage.success(`已应用 ${platform} 链接`);
};

// 处理从PlatformLinkRecognizer组件应用所有链接
const handleApplyAllIdentifiedLinks = (allValidLinks) => {
  let appliedCount = 0;
  Object.entries(allValidLinks).forEach(([platform, link]) => {
    if (!editForm.value.platforms[platform] || editForm.value.platforms[platform] !== link) {
      editForm.value.platforms[platform] = link;
      handlePlatformUrlChange(platform);
      appliedCount++;
    }
  });

  if (appliedCount > 0) {
    ElMessage.success(`已应用 ${appliedCount} 个平台链接`);
  } else {
    ElMessage.info('没有新的链接需要应用');
  }
};

const hasAnyPlatformLink = (artist) => {
  // 检查艺人自身的平台链接
  const hasOwnLinks = artist && artist.platforms && Object.values(artist.platforms).some(link => link && link.trim() !== '');
  
  // 检查关联主歌手的平台链接
  const hasCanonicalLinks = artist && artist.canonicalArtist && artist.canonicalArtist.platforms && 
    Object.values(artist.canonicalArtist.platforms).some(link => link && link.trim() !== '');
  
  // 如果自身有链接或关联的主歌手有链接，则返回true
  return hasOwnLinks || hasCanonicalLinks;
};

const copyArtistInfo = (artist) => {
  // 获取有效的平台链接（优先使用主歌手的链接）
  const getEffectiveLink = (platform) => {
    if (artist.canonicalArtist && artist.canonicalArtist.platforms && artist.canonicalArtist.platforms[platform]) {
      return artist.canonicalArtist.platforms[platform];
    }
    return artist.platforms[platform];
  };

  // 生成艺人主页信息文本
  const lines = [];
  lines.push(`艺人名：${artist.name}`);
  if (artist.realName) lines.push(`艺人真实姓名：${artist.realName}`);
  
  // 如果有关联的主歌手，显示主歌手信息
  if (artist.canonicalArtist) {
    lines.push(`关联主歌手：${artist.canonicalArtist.name}`);
  }
  
  lines.push('主页链接');
  // 国内平台
  const netease = getEffectiveLink('netease');
  if (netease) lines.push(`网易云音乐：${netease}`);
  
  const qq = getEffectiveLink('qq');
  if (qq) lines.push(`QQ音乐：${qq}`);
  
  const kugou = getEffectiveLink('kugou');
  if (kugou) lines.push(`酷狗音乐：${kugou}`);
  
  const kuwo = getEffectiveLink('kuwo');
  if (kuwo) lines.push(`酷我音乐：${kuwo}`);
  
  const qishui = getEffectiveLink('qishui');
  if (qishui) lines.push(`汽水音乐：${qishui}`);
  
  // 外网平台
  const spotify = getEffectiveLink('spotify');
  if (spotify) lines.push(`Spotify：${spotify}`);
  
  const youtube = getEffectiveLink('youtube');
  if (youtube) lines.push(`Youtube：${youtube}`);
  
  const appleMusic = getEffectiveLink('appleMusic');
  if (appleMusic) lines.push(`Apple Music：${appleMusic}`);
  
  const soundCloud = getEffectiveLink('soundCloud');
  if (soundCloud) lines.push(`SoundCloud：${soundCloud}`);
  const text = lines.join('\n');
  // 复制到剪贴板
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('艺人主页信息已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制');
  });
};

// 添加转换歌手相关变量
const convertDialogVisible = ref(false);
const convertFormRef = ref(null);
const convertLoading = ref(false);

// 转换表单初始值
const convertForm = ref({
  platforms: {
    netease: '',
    qq: '',
    kugou: '',
    kuwo: '',
    qishui: '',
    spotify: '',
    youtube: '',
    appleMusic: '',
    soundCloud: ''
  },
  platformsValid: {
    netease: true,
    qq: true,
    kugou: true,
    kuwo: true,
    qishui: true,
    spotify: true,
    youtube: true,
    appleMusic: true,
    soundCloud: true
  }
});

// 转换表单验证规则
const convertRules = {
  'platforms': [
    { 
      validator: (rule, value, callback) => {
        const hasAnyLink = Object.values(convertForm.value.platforms).some(link => link && link.trim() !== '');
        if (!hasAnyLink) {
          callback(new Error('请至少填写一个平台链接'));
        } else {
          callback();
        }
      }, 
      trigger: 'blur' 
    }
  ]
};

// 处理转换歌手按钮点击
const handleConvertArtist = (artist) => {
  currentArtist.value = artist;
  
  // 重置转换表单
  convertForm.value = {
    platforms: {
      netease: '',
      qq: '',
      kugou: '',
      kuwo: '',
      qishui: '',
      spotify: '',
      youtube: '',
      appleMusic: '',
      soundCloud: ''
    },
    platformsValid: {
      netease: true,
      qq: true,
      kugou: true,
      kuwo: true,
      qishui: true,
      spotify: true,
      youtube: true,
      appleMusic: true,
      soundCloud: true
    }
  };
  
  // 显示转换对话框
  convertDialogVisible.value = true;
};

// 处理转换平台链接变化
const handleConvertPlatformUrlChange = (platform) => {
  const url = convertForm.value.platforms[platform];
  convertForm.value.platformsValid[platform] = validateUrl(url, platform);
};

// 处理从PlatformLinkRecognizer组件应用单个链接到转换表单
const handleApplyConvertIdentifiedLink = ({ platform, link }) => {
    convertForm.value.platforms[platform] = link;
    handleConvertPlatformUrlChange(platform);
    ElMessage.success(`已应用 ${platform} 链接`);
};

// 处理从PlatformLinkRecognizer组件应用所有链接到转换表单
const handleApplyAllConvertIdentifiedLinks = (allValidLinks) => {
  let appliedCount = 0;
  Object.entries(allValidLinks).forEach(([platform, link]) => {
    if (!convertForm.value.platforms[platform] || convertForm.value.platforms[platform] !== link) {
      convertForm.value.platforms[platform] = link;
      handleConvertPlatformUrlChange(platform);
      appliedCount++;
    }
  });

  if (appliedCount > 0) {
    ElMessage.success(`已应用 ${appliedCount} 个平台链接`);
  } else {
    ElMessage.info('没有新的链接需要应用');
  }
};

// 确认转换歌手
const confirmConvertArtist = async () => {
  if (!convertFormRef.value) return;
  
  await convertFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        convertLoading.value = true;
        
        // 检查是否至少有一个平台链接
        const hasAnyLink = Object.values(convertForm.value.platforms).some(link => link && link.trim() !== '');
        if (!hasAnyLink) {
          ElMessage.error('请至少填写一个平台链接');
          convertLoading.value = false;
          return;
        }
        
        // 获取认证token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录');
        }
        
        // 准备请求头
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        
        // 发送转换请求
        const response = await axios.put(
          `${API_BASE_URL}/artist-edit-requests/artists/${currentArtist.value.id}/convert`, 
          { platforms: convertForm.value.platforms }, 
          { headers }
        );
        
        // 更新本地歌手数据
        const updatedArtist = response.data;
        const index = artists.value.findIndex(a => a.id === updatedArtist.id);
        if (index !== -1) {
          // 更新歌手数据
          artists.value[index] = {
            ...artists.value[index],
            ...updatedArtist,
            platforms: updatedArtist.platforms,
            isNewArtist: false
          };
        }
        
        ElMessage.success(`歌手 ${currentArtist.value.name} 已成功转换为已有链接歌手`);
        convertDialogVisible.value = false;
      } catch (error) {
        console.error('转换歌手失败:', error);
        ElMessage.error(error.response?.data?.message || '转换歌手失败，请稍后重试');
      } finally {
        convertLoading.value = false;
      }
    }
  });
};

// 在<script setup>部分添加新的响应式变量
const pendingRequest = ref(null);
const pendingRequestDialogVisible = ref(false);
const canCancelRequest = ref(false);
const cancelLoading = ref(false);

// 检查是否有任何修改的计算属性
const hasAnyChanges = computed(() => {
  if (!pendingRequest.value) return false;
  
  // 检查基本信息修改
  if (pendingRequest.value.newName || 
      pendingRequest.value.newRealName || 
      pendingRequest.value.new_id_number) {
    return true;
  }
  
  // 检查平台链接修改
  for (const platform of platformFields) {
    const newFieldName = 'new' + platform.charAt(0).toUpperCase() + platform.slice(1);
    if (pendingRequest.value[newFieldName]) {
      return true;
    }
  }
  
  return false;
});

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 平台字段列表，从platformRegex中获取
const platformFields = Object.keys(platformRegex);

// 获取平台标签
const getPlatformLabel = (key) => {
  const labels = {
    netease: '网易云音乐',
    qq: 'QQ音乐',
    kugou: '酷狗音乐',
    kuwo: '酷我音乐',
    qishui: '汽水音乐',
    spotify: 'Spotify',
    youtube: 'YouTube',
    appleMusic: 'Apple Music',
    soundCloud: 'SoundCloud'
  };
  return labels[key] || key;
};

// 撤销申请
const cancelRequest = async () => {
  try {
    if (!pendingRequest.value || !pendingRequest.value.id) {
      ElMessage.error('无法获取申请信息');
      return;
    }
    
    await ElMessageBox.confirm(
      '确定要撤销此修改申请吗？撤销后需要重新提交申请。',
      '撤销确认',
      {
        confirmButtonText: '确定撤销',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    cancelLoading.value = true;
    
    // 获取认证token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // 发送撤销请求
    await axios.delete(`${API_BASE_URL}/artist-edit-requests/cancel/${pendingRequest.value.id}`, { headers });
    
    ElMessage.success('修改申请已成功撤销');
    pendingRequestDialogVisible.value = false;
    
    // 撤销成功后，打开编辑对话框
    setEditForm(currentArtist.value, currentArtist.value.isNewArtist);
    editDialogVisible.value = true;
  } catch (error) {
    if (error === 'cancel') return;
    console.error('撤销申请失败:', error);
    ElMessage.error(error.response?.data?.message || '撤销申请失败，请稍后重试');
  } finally {
    cancelLoading.value = false;
  }
};

// 添加新的响应式变量
const showArtistMatcher = ref(false);
const matchedArtists = ref([]);
const creatingArtist = ref(false);
const debounceTimer = ref(null); // 用于防抖处理

// 添加监听器，监听艺名和实名的变化
watch(
  [() => editForm.value.name, () => editForm.value.realName],
  async ([newName, newRealName]) => {
    // 只在新建已有歌手模式下触发
    if (!editForm.value.isNew || !editForm.value.isExistingArtist) return;
    
    // 如果艺名和实名都为空，不触发搜索
    if (!newName && !newRealName) {
      showArtistMatcher.value = false;
      matchedArtists.value = [];
      return;
    }
    
         // 防抖处理，避免频繁请求
     clearTimeout(debounceTimer.value);
     debounceTimer.value = setTimeout(async () => {
       try {
         console.log('开始搜索潜在匹配艺人:', { name: newName, realName: newRealName });
         
         // 发送请求搜索潜在匹配的艺人
         const response = await axios.post(`${API_BASE_URL}/artist-wiki/search-potential-matches`, {
           name: newName,
           realName: newRealName
         }, {
           headers: {
             'Authorization': `Bearer ${localStorage.getItem('token')}`,
             'Content-Type': 'application/json'
           }
         });
         
         console.log('搜索结果:', response.data);
         
         // 如果有强匹配项，显示匹配组件
         if (response.data.hasStrongMatch && response.data.strongMatches.length > 0) {
           console.log('发现强匹配项:', response.data.strongMatches.length);
           matchedArtists.value = response.data.strongMatches;
           showArtistMatcher.value = true;
           console.log('匹配状态:', { showMatcher: showArtistMatcher.value, matchCount: matchedArtists.value.length });
         } else {
           // 如果没有强匹配项，隐藏匹配组件
           showArtistMatcher.value = false;
           matchedArtists.value = [];
           console.log('未发现强匹配项');
         }
      } catch (error) {
        console.error('搜索潜在匹配艺人失败:', error);
        // 出错时隐藏匹配组件
        showArtistMatcher.value = false;
        matchedArtists.value = [];
      }
    }, 500); // 500ms的防抖延迟
  }
);

// 处理艺人匹配
const handleSelectMatchedArtist = async (artist) => {
  try {
    // 如果是新建已有歌手，则关联到选中的艺人
    if (editForm.value.isNew && editForm.value.isExistingArtist) {
      // 先创建艺人 - 设置为已有链接歌手
      const artistData = {
        name: editForm.value.name,
        realName: editForm.value.realName,
        id_number: editForm.value.id_number || null,
        region: editForm.value.region && editForm.value.region.length > 0 ? editForm.value.region.join(',') : '',
        artistType: editForm.value.artistType || '',
        description: editForm.value.description || '',
        platforms: editForm.value.platforms || {},
        isNewArtist: false, // 设置为已有链接歌手，而不是全新歌手
        skipMatchCheck: true // 跳过匹配检查
      };
      
      // 如果有头像，添加到请求数据
      if (avatarFile.value) {
        // 将文件转换为Base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = e => reject(new Error('读取文件失败'));
          reader.readAsDataURL(avatarFile.value);
        });
        
        // 提取Base64编码部分（去掉前缀）
        const base64String = base64Data.split(',')[1];
        
        // 添加到请求数据
        artistData.avatarBase64 = base64String;
        artistData.avatarFileName = avatarFile.value.name;
        artistData.avatarFileType = avatarFile.value.type;
      }
      
      creatingArtist.value = true;
      
      // 创建艺人
      const createResponse = await axios.post(`${API_BASE_URL}/artist-wiki/create-with-base64`, artistData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 关联到选中的艺人
      await axios.post(`${API_BASE_URL}/artist-wiki/associate-with-artist`, {
        artistId: createResponse.data.id,
        canonicalArtistId: artist.id
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      ElMessage.success(`艺人 "${editForm.value.name}" 已成功关联到 "${artist.name}"`);
      editDialogVisible.value = false;
      await fetchArtists(); // 刷新艺人列表
    } else {
      // 如果是编辑现有艺人，则仅显示信息
      ElMessage.info(`您选择了关联到艺人 "${artist.name}"`);
    }
  } catch (error) {
    console.error('关联艺人失败:', error);
    ElMessage.error('关联艺人失败: ' + (error.response?.data?.message || error.message));
  } finally {
    creatingArtist.value = false;
    showArtistMatcher.value = false;
  }
};

// 取消艺人匹配
const cancelArtistMatcher = () => {
  showArtistMatcher.value = false;
};

// 忽略匹配结果，创建新艺人
const createArtistAnyway = async () => {
  showArtistMatcher.value = false;
  
  // 继续提交表单，创建新艺人
  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 准备请求数据
        const artistData = {
          name: editForm.value.name,
          realName: editForm.value.realName || '',
          id_number: editForm.value.id_number || null,
          region: editForm.value.region && editForm.value.region.length > 0 ? editForm.value.region.join(',') : '',
          artistType: editForm.value.artistType || '',
          description: editForm.value.description || '',
          platforms: editForm.value.platforms || {},
          skipMatchCheck: true // 强制跳过匹配检查
        };
        
        // 如果有头像，添加到请求数据
        if (avatarFile.value) {
          // 将文件转换为Base64
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('读取文件失败'));
            reader.readAsDataURL(avatarFile.value);
          });
          
          // 提取Base64编码部分（去掉前缀）
          const base64String = base64Data.split(',')[1];
          
          // 添加到请求数据
          artistData.avatarBase64 = base64String;
          artistData.avatarFileName = avatarFile.value.name;
          artistData.avatarFileType = avatarFile.value.type;
        }
        
        // 发送请求创建艺人
        const response = await axios.post(`${API_BASE_URL}/artist-wiki/create-with-base64`, artistData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        // 创建成功
        ElMessage.success(`歌手 "${editForm.value.name}" 创建成功`);
        editDialogVisible.value = false;
        await fetchArtists(); // 刷新艺人列表
      } catch (error) {
        console.error('创建艺人失败:', error);
        ElMessage.error('创建艺人失败: ' + (error.response?.data?.message || error.message));
      }
    }
  });
};
</script>

<style scoped>
@import url('@/assets/css/artistWiki.css');



</style> 