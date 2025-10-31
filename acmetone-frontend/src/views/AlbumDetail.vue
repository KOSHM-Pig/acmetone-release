<template>
    <div class="album-detail-container" :class="{ 'is-loading': loading }">
      <el-skeleton :loading="loading" animated>
        <template #template>
          <div class="skeleton-wrapper">
            <div class="skeleton-header">
              <el-skeleton-item variant="h1" style="width: 50%; height: 60px" />
              <div class="skeleton-actions">
                <el-skeleton-item variant="button" style="width: 120px; height: 40px" />
                <el-skeleton-item variant="button" style="width: 120px; height: 40px" />
              </div>
            </div>
            <div class="skeleton-body">
              <el-skeleton-item variant="image" class="skeleton-cover" />
              <div class="skeleton-details">
                <el-skeleton-item variant="p" style="width: 80%" />
                <el-skeleton-item variant="p" style="width: 60%" />
                <el-skeleton-item variant="p" style="width: 70%; margin-top: 20px" />
                <el-skeleton-item variant="p" style="width: 90%" />
              </div>
            </div>
          </div>
        </template>
  
        <template #default>
          <!-- 错误状态 -->
          <div v-if="error" class="error-state">
            <div class="error-icon">
              <el-icon><CircleClose /></el-icon>
            </div>
            <h2 class="error-title">加载失败</h2>
            <p class="error-message">{{ error }}</p>
            <div class="error-actions">
              <button class="garrix-btn" @click="handleRetry">重试加载</button>
              <button class="garrix-btn secondary" @click="$router.push('/albums')">返回列表</button>
            </div>
          </div>
  
          <div v-else-if="album" class="album-content">
            <!-- 管理员面板 -->
            <AdminPanel 
              v-if="isAdmin" 
              :albumId="album.id" 
              :initialStatus="adminForm.status" 
              :initialComment="adminForm.comment"
              @update-success="fetchAlbumDetail"
            />
  
            <!-- 专辑头部 -->
            <div class="album-header">
              <div class="header-main">
                <h1 class="album-title">{{ album?.title || '加载中...' }}</h1>
                <div class="album-subtitle">
                  <span>{{ album.performer }}</span>
                  <span class="separator">&bull;</span>
                  <span>{{ new Date(album.releaseDate).getFullYear() }}</span>
                  <span class="separator">&bull;</span>
                  <span>{{ album.type }}</span>
                </div>
              </div>
              <div class="header-actions">
                <span :class="['status-badge', getStatusClass(album.virtualStatus || album.status)]">
                  {{ getStatusText(album.virtualStatus || album.status) }}
                </span>
                <button
                  type="button"
                  class="garrix-btn secondary small"
                  @click="router.push(`/album/${route.params.id}/flow`)"
                >
                  <el-icon><Connection /></el-icon>
                  <span>Beta 实验室</span>
                </button>
                <!-- <button
                  type="button"
                  class="garrix-btn secondary small"
                  v-if="album.status === 'approved'"
                  @click="router.push(`/album/${route.params.id}/links`)"
                >
                  <el-icon><Link /></el-icon>
                  <span>展示页面</span>
                </button> -->
                <button type="button" v-if="canEditSong(album)" class="garrix-btn" @click="handleEditAlbum">
                  编辑信息
                </button>
                <button
                  type="button"
                  v-if="album.isDraft && album.songs && album.songs.length > 0"
                  class="garrix-btn"
                  @click="submitForReview"
                >
                  提交审核
                </button>
                <button
                  type="button"
                  v-if="album.status === 'rejected' && album.songs && album.songs.length > 0 && album.submittedById === userStore.user?.id"
                  class="garrix-btn"
                  @click="resubmitForReview"
                >
                  重新提交
                </button>
              </div>
            </div>
            
            <!-- 水平分隔线 -->
            <div class="album-divider"></div>
            
            <!-- 拒绝理由 -->
            <div v-if="album.status === 'rejected'" class="rejection-notice">
              <div class="rejection-icon"><el-icon><WarningFilled /></el-icon></div>
              <div class="rejection-content">
                <strong class="rejection-title">审核未通过</strong>
                <p class="rejection-reason">理由：{{ album.comment || '未提供' }}</p>
              </div>
            </div>
            
            <!-- 主体内容 -->
            <div class="album-body">
              
              <!-- 左侧：封面 -->
              <div class="album-cover-wrapper">
                <div 
                  class="album-cover" 
                  @click="canEditSong(album) ? triggerCoverUpload(coverFileInput) : null"
                  :class="{'is-clickable': canEditSong(album)}"
                >
                  <img 
                    :src="album.coverImage ? resourceLoader.getResourceUrl(album.coverImage) : ''" 
                    :alt="album.title"
                    class="album-cover-img"
                  />
                  <div v-if="canEditSong(album)" class="cover-edit-overlay">
                    <el-icon><Edit /></el-icon>
                    <span>更换封面</span>
                  </div>
                </div>
                <input
                  ref="coverFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  style="display: none;"
                  @change="handleCoverFileSelected"
                  id="coverFileInput"
                />
              </div>
  
              <!-- 右侧：详情 -->
              <div class="album-details-wrapper">
                <div class="detail-section">
                  <h3 class="section-subtitle">专辑简介</h3>
                  <div class="description" :class="{ 'collapsed': !isDescriptionExpanded }">
                    <p v-html="formattedDescription"></p>
                    <button 
                      v-if="shouldShowExpandButton" 
                      type="button"
                      class="description-toggle" 
                      @click="toggleDescription"
                    >
                      {{ isDescriptionExpanded ? '收起' : '展开' }}
                    </button>
                  </div>
                </div>
                <div class="detail-section">
                  <h3 class="section-subtitle">发行信息</h3>
                  <div class="meta-grid">
                    <div class="meta-item">
                      <span class="meta-label">专辑类型</span>
                      <span class="meta-value">{{ album.type }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">发行日期</span>
                      <span class="meta-value">{{ formatDate(album.releaseDate) }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">发行外显</span>
                      <span class="meta-value">{{ album.displayInfo }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">专辑表演者</span>
                      <span class="meta-value">{{ album.performer || '无' }}</span>
                    </div>
                  </div>
                </div>
                
                 <!-- 授权书部分 -->
                <div v-if="album?.contractStatus !== 'signed'" class="detail-section compact-section">
                  <h3 class="section-subtitle">授权书 <b>(生成授权书后&nbsp;必须在<a href="https://dzyz.sh.gov.cn" target="_blank">上海一网通办</a>进行数字签名&nbsp;然后再进行上传)</b></h3>
                  <div class="authorization-area">
                     <div v-if="album?.authorizationFile" class="auth-file-info">
                        <el-icon><Document /></el-icon>
                        <span class="file-name" :title="album?.authorizationFile">{{ getAuthorizationFileName() }}</span>
                      </div>
                    <div class="auth-actions">
                       <el-upload
                        type="button"
                        v-if="(!album?.authorizationFile || album?.submittedById === userStore.user?.id) && canEditSong(album)"
                        class="auth-uploader"
                        action="#"
                        :auto-upload="false"
                        :on-change="handleAuthorizationFileChange"
                        :limit="1"
                        accept=".pdf"
                        :show-file-list="false"
                        :file-list="authorizationFileList"
                      >
                         <button class="garrix-btn secondary">
                           <el-icon><Upload /></el-icon>
                           <span>{{ album?.authorizationFile ? '更换授权书' : '上传授权书' }}</span>
                         </button>
                      </el-upload>
                       <button
                        type="button"
                        v-if="album?.authorizationFile" 
                        class="garrix-btn secondary"
                        @click="previewAuthorizationFile"
                      >
                        <el-icon><View /></el-icon>
                        <span>预览</span>
                      </button>
                      <button
                        type="button"
                        v-if="album?.authorizationFile && (userStore.isAdmin || (album?.submittedById === userStore.user?.id && canEditSong(album)))"
                        class="garrix-btn danger"
                        @click="deleteAuthorizationFile"
                      >
                         <el-icon><Delete /></el-icon>
                      </button>
                       <button
                          type="button"
                          v-if="canEditSong(album)"
                          class="garrix-btn secondary"
                          :disabled="!album.songs || album.songs.length === 0"
                          @click="showIdNumberDialog"
                          :title="!album.songs || album.songs.length === 0 ? '请先添加歌曲后再生成授权书' : ''"
                        >
                          <el-icon><Download /></el-icon>
                          <span>生成授权书</span>
                        </button>
                    </div>
                  </div>
                   <p class="section-tip compact-tip">只能上传PDF格式文件。提交审核前必须先上传授权书。</p>
                   <!-- 添加签名提示 -->

                </div>
              </div>
            </div>
            
            <!-- 歌曲列表 -->
            <div class="songs-section">
              <el-tabs v-model="activeTab" type="border-card">
                <el-tab-pane label="歌曲列表" name="songs">
                  <div class="section-header">
                    <h2 class="section-title">歌曲列表</h2>
                    <div class="section-actions">
                      <button type="button" v-if="canEditSong(album)" class="garrix-btn" @click="dialogVisible = true">
                        <el-icon><Plus /></el-icon>
                        <span>添加歌曲</span>
                      </button>
                    </div>
                  </div>
                  
                  <div v-if="!album?.songs?.length" class="empty-songs">
                    <p>暂无歌曲</p>
                    <button type="button" v-if="canEditSong(album)" class="garrix-btn" @click="dialogVisible = true">立即添加</button>
                  </div>
  
                  <div v-else class="song-list-container">
                    <!-- 桌面版布局 - 只在大屏幕上显示 -->
                    <div class="desktop-song-list">
                      <div class="song-list-header" style="display: grid; grid-template-columns: 50px 40px 1fr 120px 120px 60px 60px 90px; padding: 16px 20px; background-color: #ffffff; border-bottom: 1px solid #ebeef5; font-weight: 600; color: #000000; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">
                        <span class="col-drag" style="text-align: center;">排序</span>
                        <span class="col-track" style="text-align: center;">#</span>
                        <span class="col-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">标题</span>
                        <span class="col-isrc" style="text-align: center; white-space: nowrap;">ISRC</span>
                        <span class="col-upc" style="text-align: center; white-space: nowrap;">UPC</span>
                        <span class="col-duration" style="text-align: center; white-space: nowrap;">时长</span>
                        <span class="col-player" style="text-align: center;">播放</span>
                        <span class="col-actions" style="text-align: right;">操作</span>
                      </div>
                     <draggable 
                      v-model="album.songs" 
                      item-key="id" 
                      handle=".drag-handle"
                      @end="handleSongDrag"
                      :disabled="!canEditSong(album)"
                      class="song-list-draggable"
                    >
                      <template #item="{ element: song, index }">
                        <div class="song-item" style="display: grid; grid-template-columns: 30px 40px 1fr 120px 120px 60px 60px 90px; padding: 16px 20px; border-bottom: 1px solid #ebeef5; align-items: center;">
                          <span v-if="canEditSong(album)" class="drag-handle" style="cursor: move; display: flex; justify-content: center; align-items: center; color: #333; background-color: #f0f0f0; border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 25px; height: 25px;">
                            <el-icon style="font-size: 16px;"><Rank /></el-icon>
                            <span class="drag-tooltip" style="position: absolute; background: rgba(0,0,0,0.7); color: white; font-size: 12px; padding: 2px 5px; border-radius: 3px; top: -20px; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; white-space: nowrap;">拖动排序</span>
                          </span>
                          <span class="song-track-number" style="font-weight: 600; color: #000000; text-align: center;">{{ song.trackNumber || index + 1 }}</span>
                          <div class="song-title-artist" style="padding-right: 5px; min-width: 0; max-width: 100%; width: 100%;">
                            <span class="song-title" style="font-weight: 500; font-size: 14px; color: #303133; margin-bottom: 3px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ song.title }}</span>
                            <span class="song-artist" style="font-size: 12px; color: #909399; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ song.Artists.map(a => a.name).join(' / ') }}</span>
                          </div>
                          <div class="song-isrc" style="text-align: center; color: #606266; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 8px;">
                            <span v-if="song.isrc" class="isrc-code">{{ song.isrc }}</span>
                            <span v-else class="isrc-empty" style="color: #c0c4cc; font-style: italic;">未设置</span>
                            <!-- 调试信息 -->
                            <div v-if="false" style="font-size: 10px; color: red;">
                              DEBUG: {{ JSON.stringify({id: song.id, isrc: song.isrc, hasIsrc: !!song.isrc}) }}
                            </div>
                          </div>
                          <div class="song-upc" style="text-align: center; color: #606266; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 8px;">
                            <span v-if="song.upc" class="upc-code">{{ song.upc }}</span>
                            <span v-else class="upc-empty" style="color: #c0c4cc; font-style: italic;">未设置</span>
                          </div>
                          <span class="song-duration" style="text-align: center; color: #606266; font-size: 13px; white-space: nowrap;">{{ song.duration ? formatDuration(song.duration) : '-' }}</span>
                          
                          <div class="song-player-wrapper" style="display: flex; justify-content: center; align-items: center;">
                            <button
                              type="button"
                              class="play-btn garrix-button-circle"
                              @click="playSong(song)"
                              :disabled="!song.wavFile"
                              style="width: 40px; height: 40px; border: 1px solid var(--garrix-black, #000000); background-color: transparent; color: var(--garrix-black, #000000); border-radius: 50%; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;"
                            >
                              <el-icon><VideoPlay /></el-icon>
                            </button>
                          </div>
                          
                          <div class="song-actions" style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">

                            <button
                              type="button"
                              v-if="canEditSong(album)"
                              @click="handleEditSong(song)"
                              class="garrix-btn secondary small"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              v-if="canEditSong(album)"
                              @click="handleDeleteSong(song)"
                              class="garrix-btn danger small"
                            >
                              删除
                            </button>
                            <button
                              type="button"
                              v-if="!canEditSong(album)"
                              @click="handleViewArtistDetails(song)"
                              class="garrix-btn secondary small"
                            >
                              详情
                            </button>
                          </div>
                        </div>
                      </template>
                    </draggable>
                    </div>
                    
                    <!-- 移动端布局 - 为小屏幕设计的卡片式布局 -->
                    <draggable 
                      v-model="album.songs" 
                      item-key="id" 
                      handle=".mobile-drag-handle"
                      @end="handleSongDrag"
                      :disabled="!canEditSong(album)"
                      class="mobile-song-list"
                    >
                      <template #item="{ element: song, index }">
                        <div class="mobile-song-card" style="margin-bottom: 16px; border: 1px solid #ebeef5; border-radius: 4px; overflow: hidden; background-color: #ffffff; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);">
                          <div class="mobile-song-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #ebeef5; background-color: #f9f9f9;">
                            <div class="mobile-song-info" style="flex: 1; min-width: 0; display: flex; align-items: center;">
                              <span v-if="canEditSong(album)" class="mobile-drag-handle" style="cursor: move; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: #333; background-color: #f0f0f0; border: 1px solid #ddd; padding: 5px; border-radius: 4px; width: 30px; height: 30px;">
                                <el-icon style="font-size: 18px;"><Rank /></el-icon>
                                <span class="drag-tooltip" style="position: absolute; background: rgba(0,0,0,0.7); color: white; font-size: 12px; padding: 2px 5px; border-radius: 3px; top: -20px; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.3s; white-space: nowrap;">拖动排序</span>
                              </span>
                              <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 600; color: #000000; width: 24px; text-align: center;">{{ song.trackNumber || index + 1 }}</span>
                                <div style="flex: 1; min-width: 0;">
                                  <div style="font-weight: 500; font-size: 14px; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ song.title }}</div>
                                  <div style="font-size: 12px; color: #909399; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ song.Artists.map(a => a.name).join(' / ') }}</div>
                                </div>
                              </div>
                              <div style="margin-top: 4px; font-size: 12px; color: #606266;">时长: {{ song.duration ? formatDuration(song.duration) : '-' }}</div>
                            </div>
                          </div>
                          
                          <div class="mobile-song-player" style="padding: 12px 15px; border-bottom: 1px solid #ebeef5; display: flex; justify-content: center;">
                            <button
                              type="button"
                              class="play-btn garrix-button-circle"
                              @click="playSong(song)"
                              :disabled="!song.wavFile"
                              style="width: 48px; height: 48px; border: 1px solid var(--garrix-black, #000000); background-color: transparent; color: var(--garrix-black, #000000); border-radius: 50%; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; font-size: 20px;"
                            >
                              <el-icon><VideoPlay /></el-icon>
                            </button>
                          </div>
                          
                          <div class="mobile-song-actions" style="display: flex; justify-content: flex-end; padding: 10px 15px; gap: 10px;">
                            <button
                              type="button"
                              v-if="canEditSong(album)"
                              @click="handleEditSong(song)"
                              class="garrix-btn secondary small"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              v-if="canEditSong(album)"
                              @click="handleDeleteSong(song)"
                              class="garrix-btn danger small"
                            >
                              删除
                            </button>
                            <button
                              type="button"
                              v-if="!canEditSong(album)"
                              @click="handleViewArtistDetails(song)"
                              class="garrix-btn secondary small"
                            >
                              详情
                            </button>
                          </div>
                        </div>
                      </template>
                    </draggable>
                  </div>
                </el-tab-pane>
                
                <el-tab-pane label="权利链条" name="rights-chain">
                  <RightsChainViewer :albumId="route.params.id" :canEdit="canEditSong(album)" />
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </template>
      </el-skeleton>
  
      <!-- 添加/编辑歌曲对话框 -->
      <el-dialog
        v-model="dialogVisible"
        width="80%"
        :before-close="handleDialogClose"
        custom-class="garrix-dialog"
      >
        <template #header>
          <h2 class="dialog-title">{{ songForm.isEditing ? '编辑歌曲' : '添加歌曲' }}</h2>
        </template>
        <el-form
          ref="songFormRef"
          :model="songForm"
          :rules="songRules"
          label-position="top"
        >
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="歌曲名称" prop="title">
                <div class="black-border-wrapper">
                  <el-input 
                    v-model="songForm.title" 
                    placeholder="请输入歌曲名称" 
                    class="garrix-custom-input"
                  />
                </div>
              </el-form-item>
            </el-col>
          </el-row>
  
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="风格" prop="genre">
                <div class="black-border-wrapper">
                  <el-select 
                    v-model="songForm.genre" 
                    placeholder="请选择歌曲风格" 
                    popper-class="garrix-select-popper"
                    class="garrix-custom-select"
                  >
                    <el-option
                      v-for="genre in genres"
                      :key="genre"
                      :label="genre"
                      :value="genre"
                      class="garrix-select-option"
                    />
                  </el-select>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="语言" prop="language">
                <div class="black-border-wrapper">
                  <el-select 
                    v-model="songForm.language" 
                    placeholder="请选择歌曲语言" 
                    popper-class="garrix-select-popper"
                    class="garrix-custom-select"
                  >
                    <el-option label="中文" value="中文" class="garrix-select-option" />
                    <el-option label="英文" value="英文" class="garrix-select-option" />
                    <el-option label="纯音乐" value="纯音乐" class="garrix-select-option" />
                    <el-option label="其他语言" value="其他语言" class="garrix-select-option" />
                  </el-select>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
  
          <el-row :gutter="20">
            <el-col :span="12">
              <!-- 修改歌曲表单中的WAV文件上传部分，在编辑模式下也显示，但标记为可选 -->
              <el-form-item :label="'WAV文件'" :prop="songForm.isEditing ? '' : 'wavFile'">
                <el-upload
                  class="wav-uploader"
                  action="#"
                  :auto-upload="false"
                  :on-change="handleWavChange"
                  :on-remove="handleWavRemove"
                  :limit="1"
                  :file-list="fileList"
                  accept=".wav"
                >
                  <button type="button" class="garrix-btn secondary">
                    {{ songForm.isEditing ? '更换WAV文件(可选)' : '选择文件' }}
                  </button>
                  <template #tip>
                    <div class="el-upload__tip">
                      {{ '只能上传WAV格式文件，且文件大小不超过100MB' }}
                      <span v-if="songForm.isEditing">（编辑模式下可选）</span>
                    </div>
                  </template>
                </el-upload>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item
                v-if="songForm.language && songForm.language !== '纯音乐'"
                :prop="songForm.isEditing ? '' : 'lyricsFile'"
              >
                <template #label>
                  <div class="form-label-with-status">
                    <span>歌词文件</span>
                    <div class="file-status-indicators">
                      <span
                        v-if="hasExistingLyricsFile"
                        class="status-indicator uploaded"
                        title="服务器已有歌词文件"
                      >
                        <el-icon><Check /></el-icon>
                        已上传
                      </span>
                      <span
                        v-else-if="songForm.isEditing"
                        class="status-indicator missing"
                        title="服务器暂无歌词文件"
                      >
                        <el-icon><Close /></el-icon>
                        未上传
                      </span>
                    </div>
                  </div>
                </template>
                <div class="lyrics-upload-container">
                  <div class="lyrics-upload-actions">
                    <el-upload
                      class="lyrics-uploader"
                      action="#"
                      :auto-upload="false"
                      :on-change="handleLyricsChange"
                      :on-remove="handleLyricsRemove"
                      :limit="1"
                      :file-list="lyricsFileList"
                      accept=".lrc"
                    >
                      <button type="button" class="garrix-btn secondary">
                        {{ songForm.isEditing ? '更换歌词文件(可选)' : '选择歌词文件' }}
                      </button>
                      <template #tip>
                        <div class="el-upload__tip">
                          {{ '只能上传LRC格式的歌词文件，且文件大小不超过2MB' }}
                            <span v-if="songForm.isEditing">（编辑模式下可选）</span>
                        </div>
                      </template>
                    </el-upload>
                    <button
                      type="button"
                      v-if="songForm.language && songForm.language !== '纯音乐'"
                      class="garrix-btn primary small lrc-maker-btn"
                      @click="openLrcMaker"
                    >
                      制作动态歌词
                    </button>
                  </div>
                  <div class="lyrics-preview-actions">
                    <button
                      type="button"
                      v-if="songForm.lyricsFile || lyricsFileList.length > 0"
                      class="garrix-btn"
                      @click="previewLyrics('main')"
                    >
                      预览歌词
                    </button>
                  </div>
                </div>
              </el-form-item>
              <el-form-item
                v-if="songForm.language === '英文' || songForm.language === '其他语言'"
                :prop="songForm.isEditing ? '' : 'translationLyricsFile'"
              >
                <template #label>
                  <div class="form-label-with-status">
                    <span>中文翻译歌词(可选)</span>
                    <div class="file-status-indicators">
                      <span
                        v-if="hasExistingTranslationLyricsFile"
                        class="status-indicator uploaded"
                        title="服务器已有翻译歌词文件"
                      >
                        <el-icon><Check /></el-icon>
                        已上传
                      </span>
                      <span
                        v-else-if="songForm.isEditing"
                        class="status-indicator missing"
                        title="服务器暂无翻译歌词文件"
                      >
                        <el-icon><Close /></el-icon>
                        未上传
                      </span>
                    </div>
                  </div>
                </template>
                <div class="lyrics-upload-container">
                  <el-upload
                    class="translation-lyrics-uploader"
                    action="#"
                    :auto-upload="false"
                    :on-change="handleTranslationLyricsChange"
                    :on-remove="handleTranslationLyricsRemove"
                    :limit="1"
                    :file-list="translationLyricsFileList"
                    accept=".lrc"
                  >
                    <button type="button" class="garrix-btn secondary">
                      {{ songForm.isEditing ? '更换中文翻译歌词(可选)' : '选择中文翻译歌词' }}
                    </button>
                    <template #tip>
                      <div class="el-upload__tip">
                        {{ '只能上传LRC格式的歌词文件，且文件大小不超过2MB' }}
                          <span v-if="songForm.isEditing">（编辑模式下可选）</span>
                      </div>
                    </template>
                  </el-upload>
                  <button
                    type="button"
                    v-if="songForm.translationLyricsFile || translationLyricsFileList.length > 0"
                    class="garrix-btn"
                    @click="previewLyrics('translation')"
                  >
                    预览翻译歌词
                  </button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
  
          <el-dialog
            v-model="lyricsPreviewVisible"
            :title="lyricsPreviewTitle"
            width="80%"
            destroy-on-close
          >
            <div v-if="lyricsPreviewLoading" class="lyrics-preview-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>解析歌词中...</span>
            </div>
            <div v-else-if="lyricsPreviewError" class="lyrics-preview-error">
              <el-icon><CircleClose /></el-icon>
              <span>{{ lyricsPreviewError }}</span>
            </div>
            <div v-else>
              <div v-if="showDualLyrics" class="dual-lyrics-preview">
                <div class="lyrics-preview-container">
                  <h3>原文歌词</h3>
                  <div v-if="isEditingLyrics" class="lyrics-edit-container">
                    <el-input
                      v-model="editingLyricsContent"
                      type="textarea"
                      :rows="15"
                      placeholder="编辑原文歌词"
                      resize="none"
                    />
                  </div>
                  <div v-else class="lyrics-content">
                    <p v-for="(line, index) in parsedLyrics" :key="'main-'+index" class="lyrics-line">
                      <span class="lyrics-time">[{{ formatLyricsTime(line.time) }}]</span>
                      <span class="lyrics-text">{{ line.text }}</span>
                    </p>
                  </div>
                </div>
                <div class="lyrics-preview-container">
                  <h3>翻译歌词</h3>
                  <div v-if="isEditingTranslationLyrics" class="lyrics-edit-container">
                    <el-input
                      v-model="editingTranslationLyricsContent"
                      type="textarea"
                      :rows="15"
                      placeholder="编辑翻译歌词"
                      resize="none"
                    />
                  </div>
                  <div v-else class="lyrics-content">
                    <p v-for="(line, index) in parsedTranslationLyrics" :key="'trans-'+index" class="lyrics-line">
                      <span class="lyrics-time">[{{ formatLyricsTime(line.time) }}]</span>
                      <span class="lyrics-text">{{ line.text }}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div v-else class="single-lyrics-preview">
                <div class="lyrics-preview-container">
                  <div v-if="isEditingLyrics" class="lyrics-edit-container">
                    <el-input
                      v-model="editingLyricsContent"
                      type="textarea"
                      :rows="15"
                      placeholder="编辑歌词"
                      resize="none"
                    />
                  </div>
                  <div v-else class="lyrics-content">
                    <p v-for="(line, index) in currentPreviewLyrics" :key="index" class="lyrics-line">
                      <span class="lyrics-time">[{{ formatLyricsTime(line.time) }}]</span>
                      <span class="lyrics-text">{{ line.text }}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <template #footer>
              <div class="dialog-footer">
                <div class="left-buttons">
                  <button
                    type="button"
                    v-if="!isEditingLyrics && !isEditingTranslationLyrics && canEditLyrics" 
                    class="garrix-btn"
                    @click="startEditLyrics"
                  >
                    编辑歌词
                  </button>
                  <button
                    type="button"
                    v-if="isEditingLyrics || isEditingTranslationLyrics" 
                    class="garrix-btn" 
                    @click="saveLyricsChanges"
                    :disabled="savingLyrics"
                  >
                    <span v-if="savingLyrics">保存中...</span>
                    <span v-else>保存修改</span>
                  </button>
                  <button
                    type="button"
                    v-if="isEditingLyrics || isEditingTranslationLyrics" 
                    class="garrix-btn secondary"
                    @click="cancelEditLyrics"
                  >
                    取消编辑
                  </button>
                </div>
                <div class="right-buttons">
                  <button type="button" class="garrix-btn secondary" @click="lyricsPreviewVisible = false">关闭</button>
                  <button type="button" v-if="showDualLyrics && !isEditingLyrics && !isEditingTranslationLyrics" class="garrix-btn" @click="previewCombinedLyrics">
                    预览双语对照
                  </button>
                </div>
              </div>
            </template>
          </el-dialog>
  
          <el-dialog
            v-model="combinedLyricsPreviewVisible"
            title="双语对照歌词预览"
            width="80%"
            destroy-on-close
          >
            <div class="combined-lyrics-preview">
              <div class="lyrics-content">
                <p v-for="(line, index) in combinedLyrics" :key="index" class="lyrics-line combined">
                  <span class="lyrics-time">[{{ formatLyricsTime(line.time) }}]</span>
                  <span class="lyrics-text">{{ line.text }}</span>
                  <span v-if="line.translation" class="lyrics-translation">{{ line.translation }}</span>
                </p>
              </div>
            </div>
            <template #footer>
              <div class="dialog-footer">
                <button type="button" class="garrix-btn" @click="combinedLyricsPreviewVisible = false">关闭</button>
              </div>
            </template>
          </el-dialog>
  
          <el-form-item label="歌手" prop="artists">
            <div class="artists-container">
              <!-- Artist Search Input -->
              <div class="search-box-container">
                  <el-input
                  v-model="dialogArtistSearchKeyword"
                  placeholder="搜索并添加歌手..."
                  class="garrix-input"
                  @input="handleDialogArtistSearch"
                  @blur="handleDialogSearchBlur"
                >
                  <template #prefix>
                    <el-icon class="search-icon"><Search /></el-icon>
                  </template>
                </el-input>
                <div 
                  v-if="dialogShowArtistSearchDropdown" 
                  class="artist-search-dropdown"
                >
                  <div class="search-dropdown-content">
                    <div v-if="dialogSearchingArtists" class="search-loading">
                      <el-icon class="is-loading"><Loading /></el-icon> 搜索中...
                  </div>
                    <div v-else-if="dialogSearchResults.length === 0" class="no-results">
                      没有找到匹配的歌手
                  </div>
                    <div v-else class="search-results-list">
                      <div 
                        v-for="artist in dialogSearchResults" 
                        :key="artist.id"
                        class="search-result-item"
                        @click="addArtistFromSearch(artist)"
                      >
                        <div class="artist-info">
                          <div class="artist-name">{{ artist.name }}</div>
                          <div v-if="artist.realName" class="artist-realname">{{ artist.realName }}</div>
                    </div>
                        <span class="add-icon"><el-icon><Plus /></el-icon></span>
                    </div>
                    </div>
                    </div>
                    </div>
                    </div>

              <!-- Draggable Artist Cards -->
                              <draggable
                  v-model="songForm.artists"
                  item-key="id"
                  handle=".drag-handle"
                  class="artist-card-list"
                  @end="handleArtistDrag"
                >
                  <template #item="{ element: artist, index }">
                    <div class="artist-card-in-dialog">
                      <span class="drag-handle"><el-icon><Rank /></el-icon></span>
                      <div class="artist-display-info">
                        <span class="artist-title">{{ artist.name }}</span>
                        <span v-if="artist.realName" class="artist-realname-display">{{ artist.realName }}</span>
                      </div>
                      <span
                        class="remove-artist-btn"
                        @click="removeArtist(index)"
                      >&times;</span>
                    </div>
                  </template>
                </draggable>
                    </div>
                  </el-form-item>
  
          <!-- Upload Progress -->
          <div v-if="isUploading" class="upload-progress">
            <el-progress :percentage="uploadProgress" :format="percentageFormatter" />
            <div class="progress-text">
              <span v-if="uploadProgress < 100">正在上传文件 ({{ uploadProgress }}%)，请勿关闭页面...</span>
              <span v-else>文件上传完成，正在处理...</span>
            </div>
          </div>
  
                    <!-- 移除表单内的提交按钮，只保留底部的按钮 -->
        </el-form>

        <template #footer>
          <div class="dialog-footer">
            <div class="left-buttons">
              <button type="button" class="garrix-btn secondary" @click="cancelSongForm">取消</button>
            </div>
            <div class="right-buttons">
              <button type="button" class="garrix-btn" @click="submitSongForm" :disabled="isUploading || songFormSubmitting">
                <span v-if="isUploading">上传中...</span>
                <span v-else-if="songFormSubmitting">处理中...</span>
                <span v-else>{{ songForm.isEditing ? '保存修改' : '添加歌曲' }}</span>
              </button>
            </div>
          </div>
        </template>
      </el-dialog>
  
      <!-- 编辑专辑信息对话框 -->
      <el-dialog
        v-model="albumEditDialogVisible"
        title="编辑专辑信息"
        :width="isMobile ? '100%' : '60%'"
        custom-class="garrix-dialog album-edit-dialog"
        :fullscreen="isMobile"
        :append-to-body="true"
      >
        <el-form
          ref="albumFormRef"
          :model="albumForm"
          :rules="albumRules"
          label-width="120px"
          class="album-edit-form"
        >
          <div class="form-grid">
            <div class="form-left-column">
              <el-form-item label="专辑名称" prop="title">
                <el-input v-model="albumForm.title" placeholder="请输入专辑名称" />
              </el-form-item>
    
              <el-form-item label="专辑类型" prop="type">
                <el-select v-model="albumForm.type" placeholder="请选择专辑类型" class="full-width-select">
                  <el-option label="专辑" value="专辑" />
                  <el-option label="单曲" value="单曲" />
                </el-select>
              </el-form-item>
    
              <el-form-item label="发行日期" prop="releaseDate">
                <el-date-picker
                  v-model="albumForm.releaseDate"
                  type="date"
                  placeholder="选择发行日期"
                  :disabled-date="disabledDate"
                  value-format="YYYY-MM-DD"
                  format="YYYY-MM-DD"
                  class="full-width-date-picker"
                />
              </el-form-item>
    
              <el-form-item label="发行外显" prop="displayInfo">
                <el-input v-model="albumForm.displayInfo" placeholder="例如：ASPIRE SOUND × 极音记" />
              </el-form-item>
            </div>
            
            <div class="form-right-column">
              <!-- 添加封面图片上传 -->
              <el-form-item label="专辑封面">
                <div class="album-cover-upload">
                  <div class="cover-preview">
                    <img 
                      v-if="albumForm.coverImage" 
                      :src="albumForm.coverImage.startsWith('blob:') ? albumForm.coverImage : (albumForm.coverImage.startsWith('http') ? albumForm.coverImage : resourceLoader.getResourceUrl(albumForm.coverImage))" 
                      class="cover-preview-img" 
                    />
                    <div v-else class="no-cover">
                      <el-icon><Picture /></el-icon>
                      <span>无封面图片</span>
                    </div>
                  </div>
                  <div class="cover-actions">
                    <el-upload
                      class="cover-uploader-dialog"
                      action="#"
                      :auto-upload="false"
                      :on-change="handleDialogCoverChange"
                      :show-file-list="false"
                      accept="image/jpeg,image/png,image/jpg"
                    >
                      <button type="button" class="garrix-btn secondary">
                         <el-icon><Upload /></el-icon>
                         <span>选择图片</span>
                      </button>
                    </el-upload>
                    <div class="upload-tip">
                      支持JPG、PNG格式，图片大小不超过10MB
                    </div>
                  </div>
                </div>
              </el-form-item>
            </div>
          </div>
          
          <!-- 专辑简介 -->
          <el-form-item label="专辑简介" prop="description">
            <el-input
              v-model="albumForm.description"
              type="textarea"
              :rows="4"
              placeholder="请输入专辑简介"
              class="description-textarea"
            />
          </el-form-item>
          
          <!-- 添加专辑表演者管理 -->
          <el-form-item label="专辑表演者" prop="performers" class="performers-section">
            <div class="performers-container">
              <!-- 搜索框 -->
              <div class="search-box-container">
                <el-input
                  v-model="artistSearchKeyword"
                  placeholder="搜索歌手Wiki..."
                  class="performer-search-input"
                  size="small"
                  @input="handleGlobalArtistSearch"
                  @blur="handleSearchBlur"
                  @focus="handleSearchFocus"
                  ref="searchInputRef"
                >
                  <template #prefix>
                    <el-icon class="search-icon"><Search /></el-icon>
                  </template>
                  <template #suffix v-if="showArtistSearchDropdown || artistSearchKeyword">
                    <el-icon class="clear-icon" @click.stop="clearSearch"><Close /></el-icon>
                  </template>
                </el-input>
                
                <!-- 搜索提示信息 -->
                <transition name="fade">
                  <div v-if="showSearchTip" class="search-tip">
                    <el-icon><InfoFilled /></el-icon>
                    <span>请搜索歌手，若没有歌手请<a href="/artist-wiki" target="_blank" class="wiki-link">前往歌手Wiki创建</a></span>
                  </div>
                </transition>
                
                <!-- 搜索结果下拉框 -->
                <div 
                  v-if="showArtistSearchDropdown" 
                  ref="searchDropdownRef"
                  class="artist-search-dropdown"
                >
                  <div class="search-dropdown-content">
                    <div v-if="searchingArtists" class="search-loading">
                      <el-icon><Loading /></el-icon> 搜索中...
                    </div>
                    <div v-else-if="searchResults.length === 0" class="no-results">
                      没有找到匹配的歌手
                    </div>
                    <div v-else class="search-results-list">
                      <div 
                        v-for="artist in searchResults" 
                        :key="artist.id"
                        class="search-result-item"
                        @click="addArtistDirectly(artist)"
                        :class="{ 'active': selectedArtist && selectedArtist.id === artist.id }"
                      >
                        <div class="artist-info">
                          <div class="artist-name">{{ artist.name }}</div>
                          <div v-if="artist.realName" class="artist-realname">{{ artist.realName }}</div>
                        </div>
                        <span class="add-icon"><el-icon><Plus /></el-icon></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 卡片式布局 -->
              <div class="performers-cards">
                <draggable 
                  v-model="albumForm.performers"
                  @end="handlePerformerDrag"
                  item-key="id"
                  handle=".drag-handle"
                  class="performers-card-list"
                >
                  <template #item="{ element, index }">
                    <div class="pf-card">
                      <div class="pf-number">{{ index + 1 }}</div>
                      <span class="pf-drag">::</span>
                      <span class="pf-name">{{ element.name }}</span>
                      <span
                        class="pf-remove"
                        @click="handleRemovePerformer(index)"
                      >×</span>
                    </div>
                  </template>
                </draggable>
                
                <!-- 新增表演者按钮 -->
                <div class="pf-add-card" @click="handleAddPerformerClick">
                  <el-icon class="pf-add-icon"><Plus /></el-icon>
                  <span class="pf-add-text">添加表演者</span>
                </div>
              </div>
            </div>
            <div class="field-tip">
              搜索并添加歌手，可拖拽调整表演者显示顺序
            </div>
          </el-form-item>
        </el-form>
  
        <template #footer>
          <span class="dialog-footer">
            <button type="button" class="garrix-btn secondary" @click="albumEditDialogVisible = false">取消</button>
            <button type="button" class="garrix-btn" @click="handleUpdateAlbum" :disabled="submitting">
               <span v-if="submitting">保存中...</span>
               <span v-else>保存</span>
            </button>
          </span>
        </template>
      </el-dialog>
  
      <!-- 歌手详情对话框 -->
      <el-dialog
        v-model="artistDetailsVisible"
        title="歌曲详情"
        width="600px"
        custom-class="artist-details-dialog garrix-dialog"
      >
        <div class="artist-details-container">
          <!-- 歌曲基本信息 -->
          <div class="song-basic-info">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="歌曲名称">{{ currentSongDetails?.title }}</el-descriptions-item>
              <el-descriptions-item label="风格">{{ currentSongDetails?.genre }}</el-descriptions-item>
              <el-descriptions-item label="语言">{{ currentSongDetails?.language }}</el-descriptions-item>
              <el-descriptions-item label="时长">{{ currentSongDetails?.duration ? formatDuration(currentSongDetails.duration) : '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
  
          <div class="section-divider">歌手信息</div>
          
          <!-- 歌手标签页 -->
          <el-tabs v-model="activeArtistTab" class="artist-tabs">
            <el-tab-pane 
              v-for="(artist, index) in currentArtistDetails" 
              :key="index"
              :label="artist.name"
              :name="String(index)"
            >
              <div class="artist-info">
                <p v-if="artist.realName" class="artist-realname">
                  <strong>实名：</strong>{{ artist.realName }}
                </p>
                
                <p v-if="userStore.user?.role === 'admin' && artist.id_number" class="artist-idnumber">
                  <strong>身份证号：</strong>{{ maskIdNumber(artist.id_number) }}
                </p>
                
                <p v-if="hasPlatformLinks(artist)" class="platform-links-title">
                  <strong>平台链接：</strong>
                </p>
                
                <div class="platform-links-container">
                  <a 
                    v-if="artist.netease" 
                    :href="ensureAbsoluteUrl(artist.netease)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/网易云.svg" alt="网易云音乐" class="platform-detail-icon" />
                    <span>网易云音乐</span>
                  </a>
                  
                  <a 
                    v-if="artist.qq" 
                    :href="ensureAbsoluteUrl(artist.qq)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/QQ音乐.svg" alt="QQ音乐" class="platform-detail-icon" />
                    <span>QQ音乐</span>
                  </a>
                  
                  <a 
                    v-if="artist.kugou" 
                    :href="ensureAbsoluteUrl(artist.kugou)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/酷狗音乐.svg" alt="酷狗音乐" class="platform-detail-icon" />
                    <span>酷狗音乐</span>
                  </a>
                  
                  <a 
                    v-if="artist.kuwo" 
                    :href="ensureAbsoluteUrl(artist.kuwo)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/酷我音乐.svg" alt="酷我音乐" class="platform-detail-icon" />
                    <span>酷我音乐</span>
                  </a>
                  
                  <a 
                    v-if="artist.qishui" 
                    :href="ensureAbsoluteUrl(artist.qishui)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/汽水音乐.svg" alt="汽水音乐" class="platform-detail-icon" />
                    <span>汽水音乐</span>
                  </a>
                  
                  <a 
                    v-if="artist.spotify" 
                    :href="ensureAbsoluteUrl(artist.spotify)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/Spotify.svg" alt="Spotify" class="platform-detail-icon" />
                    <span>Spotify</span>
                  </a>
                  
                  <a 
                    v-if="artist.youtube" 
                    :href="ensureAbsoluteUrl(artist.youtube)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/youtube.svg" alt="YouTube" class="platform-detail-icon" />
                    <span>YouTube</span>
                  </a>
                  
                  <a 
                    v-if="artist.appleMusic" 
                    :href="ensureAbsoluteUrl(artist.appleMusic)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/applemusic.svg" alt="Apple Music" class="platform-detail-icon" />
                    <span>Apple Music</span>
                  </a>
                  
                  <a 
                    v-if="artist.soundCloud" 
                    :href="ensureAbsoluteUrl(artist.soundCloud)" 
                    target="_blank" 
                    class="platform-link-item"
                  >
                    <img src="/soundcloud.svg" alt="SoundCloud" class="platform-detail-icon" />
                    <span>SoundCloud</span>
                  </a>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
        
        <template #footer>
          <span class="dialog-footer">
            <button type="button" class="garrix-btn" @click="artistDetailsVisible = false">关闭</button>
          </span>
        </template>
      </el-dialog>
  
      <!-- 身份证号输入对话框 -->
      <el-dialog
        v-model="idNumberDialogVisible"
        title="请输入身份证号码"
        width="400px"
        custom-class="garrix-dialog"
      >
        <div>
          <p class="dialog-tip">请输入您的身份证号码，用于生成授权书</p>
          <p class="dialog-tip warning-tip">注意：必须输入您实名认证时使用的身份证号码，否则无法生成授权书</p>
          <el-form>
            <el-form-item :error="idNumberErrorMsg" :class="{ 'is-error': !idNumberValid }">
              <el-input
                v-model="inputIdNumber"
                placeholder="请输入18位身份证号码"
                maxlength="18"
                show-password
                @input="idNumberValid = true; idNumberErrorMsg = ''"
              />
            </el-form-item>
          </el-form>
        </div>
        
        <template #footer>
          <span class="dialog-footer">
            <button type="button" class="garrix-btn secondary" @click="idNumberDialogVisible = false">取消</button>
            <button
              type="button" 
              class="garrix-btn" 
              @click="validateAndGenerateAuthorization" 
              :disabled="idNumberLoading"
            >
              <span v-if="idNumberLoading">生成中...</span>
              <span v-else>确认并生成授权书</span>
            </button>
          </span>
        </template>
      </el-dialog>
      
      <!-- PDF预览对话框 -->
      <PdfPreview
        v-model:visible="pdfPreviewVisible"
        :pdf-url="pdfPreviewUrl"
        :album="album"
        @iframe-load="handleIframeLoad"
        @iframe-error="handleIframeError"
      />

      <!-- 音频播放抽屉 -->
      <AudioPlayerDrawer
        :visible="audioDrawerVisible"
        :current-song="currentPlayingSong"
        :playlist="playlistSongs"
        :album-cover="album?.coverImage ? resourceLoader.getResourceUrl(album.coverImage) : '/placeholder-album.png'"
        :album-id="route.params.id"
        @close="closeAudioDrawer"
        @song-change="handleSongChange"
      />

      <!-- LRC制作器抽屉 -->
      <AcmetoneBottomDrawer
        v-model:visible="lrcMakerVisible"
        title=""
        :close-on-click-outside="false"
        @close="closeLrcMaker"
      >
        <template #footer>
          <button
            type="button"
            class="garrix-btn secondary"
            @click="closeLrcMaker"
          >
            取消
          </button>
          <button
            type="button"
            class="garrix-btn primary"
            @click="handleLrcImport"
          >
            {{ songForm.isEditing ? '上传到服务器' : '导入到歌词' }}
          </button>
        </template>

        <LrcMaker
          ref="lrcMakerRef"
          :external-audio-url="lrcMakerAudioUrl"
          :external-audio-name="lrcMakerAudioName"
        />
      </AcmetoneBottomDrawer>

    </div>
  </template>
  
  <script setup>
  import AcmetoneBottomDrawer from '@/components/acmetone/AcmetoneBottomDrawer.vue'; // 导入底部抽屉组件
import AdminPanel from '@/components/album/AdminPanel.vue'; // 导入管理员控制面板组件
import PdfPreview from '@/components/album/pdfPreview.vue'; // 导入PDF预览组件
import AudioPlayerDrawer from '@/components/AudioPlayerDrawer.vue'; // 导入音频播放抽屉组件
import LrcMaker from '@/components/LrcMaker.vue'; // 导入LRC制作器组件
import RightsChainViewer from '@/components/RightsChainViewer.vue'; // 导入权利链条组件
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';
import { useAlbumStore } from '@/stores/album';
import { useArtistStore } from '@/stores/artist'; // 导入艺人store
import { useArtistEditRequestStore } from '@/stores/artistEditRequest';
import { useUserStore } from '@/stores/user';
import { useUserVerificationStore } from '@/stores/userVerification';
import resourceLoader from '@/utils/resourceLoader'; // 导入资源加载工具
import { CircleClose, Close, Connection, Delete, Document, Download, Edit, InfoFilled, Picture, Plus, Rank, Search, Upload, VideoPlay, View, WarningFilled } from '@element-plus/icons-vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import draggable from 'vuedraggable'; // 导入拖拽组件
  
  // 日志函数 - 用于调试，方便追踪
  const logDebug = (message, data) => {
    console.log(`[Debug] ${message}`, data);
  };

  import '@/assets/css/albumEditMobile.css'; // 导入专辑编辑对话框移动端样式
import '@/assets/css/performers.css'; // 导入表演者样式
  // getImageUrl 已在 albumService.js 中使用
  // ... existing code ...
  
  const route = useRoute();
  const router = useRouter();
  const albumStore = useAlbumStore();
  const artistEditRequestStore = useArtistEditRequestStore();
  const userStore = useUserStore();
  const userVerificationStore = useUserVerificationStore();
  const artistStore = useArtistStore(); // 初始化艺人store
  
  // 从 albumService 导入响应式状态
import { album, error, loading } from '@/utils/support/AlbumDetail/albumService';
// 从 handleAlbum 导入专辑处理函数
import { createHandleAlbumFunctions } from '@/utils/support/AlbumDetail/handleAlbum';
// 从 cover 导入封面处理函数
import { createCoverFunctions } from '@/utils/support/AlbumDetail/cover';
// 从 lyrics 导入歌词处理函数
import { createLyricsFunctions } from '@/utils/support/AlbumDetail/lyrics';

  const dialogVisible = ref(false);
  const songFormRef = ref(null);
  const fileList = ref([]);
  const lyricsFileList = ref([]);
  const translationLyricsFileList = ref([]);
  const authorizationFileList = ref([]);
  const authorizationFile = ref(null);
  const submitting = ref(false); // 添加submitting变量
  
  // PDF预览相关变量
  const pdfPreviewVisible = ref(false);
  const pdfPreviewUrl = ref('');
  const pdfLoaded = ref(false);

  // LRC制作器相关变量
  const lrcMakerVisible = ref(false);
  const lrcMakerRef = ref(null);
  const dialogVisibleBeforeLrc = ref(false);
  const lrcMakerAudioUrl = ref('');
  const lrcMakerAudioName = ref('');

  // State for artist search within the song dialog
  const dialogArtistSearchKeyword = ref('');
  const dialogSearchingArtists = ref(false);
  const dialogSearchResults = ref([]);
  const dialogShowArtistSearchDropdown = ref(false);
  
  // 添加缺失的响应式变量
  const albumEditDialogVisible = ref(false);
  const idNumberDialogVisible = ref(false);
  // 添加缺失的歌手详情相关变量
  const currentArtistDetails = ref([]);
  const currentSongDetails = ref(null);
  const activeArtistTab = ref('0');
  const artistDetailsVisible = ref(false);
  // 移除不再需要的PDF相关变量
  // ... existing code ...
  
  // 从常量文件导入
  import { albumRules, genres, idNumberRegex, validatePlatformUrl } from '@/utils/constants';
  
  // 确保URL是绝对路径
  const ensureAbsoluteUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };
  
  // 注意：validatePlatformUrl 函数参数顺序与我们从constants.js导入的不同
  // 我们这里需要交换参数顺序以保持兼容性
  const validatePlatformUrlLocal = (platform, url) => {
    return validatePlatformUrl(url, platform);
  };
  
  const songForm = reactive({
    title: '',
    genre: '',
    language: '',
    wavFile: null,
    lyricsFile: null,
    translationLyricsFile: null,
    artists: [],
    isEditing: false,
    editingSongId: null,
    originalLyricsFile: null, // 存储原始歌词文件路径
    originalTranslationLyricsFile: null, // 存储原始翻译歌词文件路径
  });

  // 计算属性：检查是否已存在歌词文件
  const hasExistingLyricsFile = computed(() => {
    if (!songForm.isEditing) return false;
    return songForm.originalLyricsFile && songForm.originalLyricsFile.trim() !== '';
  });

  const hasExistingTranslationLyricsFile = computed(() => {
    if (!songForm.isEditing) return false;
    return songForm.originalTranslationLyricsFile && songForm.originalTranslationLyricsFile.trim() !== '';
  });

  const songRules = {
    title: [
      { required: true, message: '请输入歌曲名称', trigger: 'blur' },
    ],
    genre: [
      { required: true, message: '请选择歌曲风格', trigger: 'change' },
    ],
    language: [
      { required: true, message: '请输入歌曲语言', trigger: 'blur' },
    ],
    wavFile: [
      { 
        validator: (rule, value, callback) => {
          // 如果是编辑模式且没有选择新文件，则跳过验证
          if (songForm.isEditing && !value) {
            callback();
          } else if (!value) {
            callback(new Error('请上传WAV文件'));
          } else {
            callback();
          }
        }, 
        trigger: 'change' 
      },
    ],
    lyricsFile: [
      { 
        validator: (rule, value, callback) => {
          // 如果是编辑模式，则歌词文件可选
          if (songForm.isEditing) {
            callback();
          } else if (!value) {
            callback(new Error('请上传歌词文件'));
          } else {
            callback();
          }
        }, 
        trigger: 'change' 
      },
    ],
    translationLyricsFile: [
      { 
        validator: (rule, value, callback) => {
          // 如果是编辑模式，则翻译歌词文件可选
          if (songForm.isEditing) {
            callback();
          } else {
            callback();
          }
        }, 
        trigger: 'change' 
      },
    ],
    artists: [
      { required: true, type: 'array', min: 1, message: '请至少添加一位歌手', trigger: 'change' },
    ],
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN');
  };
  
  const getStatusClass = (status) => {
    const classes = {
      draft: 'status-draft',
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
    };
    return classes[status] || 'status-draft';
  };
  
  const getStatusText = (status) => {
    const texts = {
      draft: '草稿',
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return texts[status] || status;
  };
  
  const handleWavChange = (file) => {
    
    const isWAV = file.raw.type === 'audio/wav' || 
                  file.raw.type === 'audio/x-wav' || 
                  file.raw.type === 'audio/wave' || 
                  file.raw.name.toLowerCase().endsWith('.wav');
    
    if (!isWAV) {
      ElMessage.error('只能上传WAV格式的音频文件!');
      fileList.value = [];
      songForm.wavFile = null;
      return false;
    }
  
    const maxSize = 200 * 1024 * 1024; // 100MB
    if (file.raw.size > maxSize) {
      ElMessage.error('文件大小不能超过200MB!');
      fileList.value = [];
      songForm.wavFile = null;
      return false;
    }
  
    fileList.value = [file];
    songForm.wavFile = file.raw;
    return true;
  };
  
  const handleWavRemove = () => {
    fileList.value = [];
    songForm.wavFile = null;
  };
  
  const addArtist = () => {
    // This function is no longer needed with the new search implementation.
    // Kept temporarily to avoid breaking old template references.
  };
  
  const removeArtist = (index) => {
    songForm.artists.splice(index, 1);
  };
  
  // 处理歌手拖拽排序
  const handleArtistDrag = () => {
    // 拖拽完成后，songForm.artists已经自动更新顺序
    // 由于使用的是响应式数据，拖拽组件自动更新了songForm.artists的顺序
    console.log('歌手排序已更新:', songForm.artists.map(a => a.name));
    
    // 确保每个歌手对象都有正确的ID
    songForm.artists.forEach((artist, index) => {
      // 处理可能的节点ID格式（如"artist-15"）
      if (typeof artist.id === 'string' && artist.id.startsWith('artist-')) {
        const match = artist.id.match(/artist-(\d+)/);
        if (match && match[1]) {
          // 更新为实际的数据库ID
          const actualId = parseInt(match[1]);
          console.log(`歌手 ${artist.name} 的ID从 ${artist.id} 更新为 ${actualId}`);
          artist.id = actualId;
        }
      }
      
      // 检查ID是否为有效的数字
      if (typeof artist.id !== 'number' && (typeof artist.id === 'string' && isNaN(parseInt(artist.id)))) {
        console.warn(`歌手 ${artist.name} 的ID无效:`, artist.id);
      }
    });
    
    // 记录拖拽后的歌手ID顺序
    const currentArtistIds = songForm.artists.map(artist => {
      // 处理可能的节点ID格式（如"artist-15"）
      if (typeof artist.id === 'string' && artist.id.startsWith('artist-')) {
        const match = artist.id.match(/artist-(\d+)/);
        if (match && match[1]) {
          return parseInt(match[1]);
        }
      }
      
      if (typeof artist.id === 'number') {
        return artist.id;
      } else if (typeof artist.id === 'string' && !isNaN(parseInt(artist.id))) {
        return parseInt(artist.id);
      }
      return null;
    }).filter(id => id !== null);
    
    console.log('拖拽后的歌手ID顺序:', currentArtistIds);
    console.log('歌手对象完整结构:', JSON.parse(JSON.stringify(songForm.artists)));
    
    // 无需额外操作，在提交表单时会将有序的歌手列表发送到后端
    // 后端会根据传入的顺序更新artists JSON字段
  };
  
  // 验证身份证号码
  const validateIdNumber = (artist) => {
    if (!artist.id_number) {
      artist.idNumberValid = true;
      return true;
    }
    
    artist.idNumberValid = idNumberRegex.test(artist.id_number);
    return artist.idNumberValid;
  };
  
  // 验证所有歌手的身份证号码
  const validateAllArtistIdNumbers = () => {
    let allValid = true;
    
    for (const artist of songForm.artists) {
      const isValid = validateIdNumber(artist);
      if (!isValid) {
        allValid = false;
        ElMessage.warning(`艺人 "${artist.name}" 的身份证号码格式不正确`);
      }
    }
    
    return allValid;
  };
  
  // 掩码显示身份证号码
  const maskIdNumber = (idNumber) => {
    if (!idNumber) return '';
    return idNumber.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
  };
  
  // 验证所有歌手的平台链接
  const validateAllArtistPlatforms = () => {
    // 标记是否所有链接都有效
    let allValid = true;
    
    // 遍历所有歌手
    for (const artist of songForm.artists) {
      // 初始化platformsValid对象（如果不存在）
      if (!artist.platformsValid) {
        artist.platformsValid = {};
      }
      
      // 验证每个平台链接
      for (const [platform, url] of Object.entries(artist.platforms)) {
        if (url) {
          const isValid = validatePlatformUrlLocal(platform, url);
          artist.platformsValid[platform] = isValid;
          
          if (!isValid) {
            allValid = false;
            ElMessage.warning(`艺人 "${artist.name}" 的${getPlatformName(platform)}链接格式不正确`);
          }
        } else {
          artist.platformsValid[platform] = true;
        }
      }
    }
    
    return allValid;
  };
  
  // 在script setup部分添加进度条相关变量
  const uploadProgress = ref(0);
  const isUploading = ref(false);
  const songFormSubmitting = ref(false);
  
  // 提交歌曲表单
  const submitSongForm = async () => {
    if (!songFormRef.value) return;
    
    try {
      // 验证表单
      await songFormRef.value.validate();
      
      // 验证每个歌手的平台链接
      let platformErrors = [];
      songForm.artists.forEach((artist, index) => {
        for (const [platform, url] of Object.entries(artist.platforms)) {
          if (url && !artist.platformsValid[platform]) {
            platformErrors.push(`歌手 ${artist.name || `#${index+1}`} 的 ${getPlatformName(platform)} 链接格式不正确`);
          }
        }
      });
      
      if (platformErrors.length > 0) {
        ElMessage.error(platformErrors.join('\n'));
        return;
      }
      
      // 检查歌词文件上传要求
      /*
      if (songForm.language && songForm.language !== '纯音乐') {
        if (!songForm.lyricsFile && !songForm.isEditing) {
          ElMessage.warning('请上传LRC格式的歌词文件');
          return;
        }
      }
      */
      
      // 提取歌手ID数组，保持拖拽后的顺序
      // 注意：这里需要确保我们获取的是实际的数据库ID，而不是临时ID
      const artistIds = songForm.artists.map(artist => {
        // 如果artist是对象，提取ID
        if (typeof artist === 'object' && artist !== null) {
          // 处理节点ID格式 (如 "artist-123")
          if (typeof artist.id === 'string' && artist.id.startsWith('artist-')) {
            const match = artist.id.match(/artist-(\d+)/);
            if (match && match[1]) {
              return parseInt(match[1]);
            }
          }
          return artist.id;
        }
        // 如果artist直接是ID
        else if (typeof artist === 'number') {
          return artist;
        }
        // 如果artist是字符串ID
        else if (typeof artist === 'string' && !isNaN(parseInt(artist))) {
          return parseInt(artist);
        }
        console.error('发现无效的歌手ID:', artist);
        return null;
      }).filter(id => id !== null); // 过滤掉null值
      
      // 确保有至少一个歌手
      if (artistIds.length === 0) {
        ElMessage.error('请至少添加一位歌手');
        songFormSubmitting.value = false;
        return;
      }
      
      console.log('保存的歌手ID顺序:', artistIds);
      console.log('歌手完整对象:', JSON.parse(JSON.stringify(songForm.artists)));
      
      // 根据是否是编辑模式执行不同的操作
      if (songForm.isEditing && songForm.editingSongId) {
        // 编辑模式 - 更新歌手信息和可能的文件
        songFormSubmitting.value = true;
        
        // 检查是否只上传了歌词文件，没有上传WAV文件
        if ((songForm.lyricsFile || songForm.translationLyricsFile) && !songForm.wavFile) {
          // 只上传歌词文件的情况
          isUploading.value = true;
          uploadProgress.value = 0;
          
          try {
            // 使用专门的歌词文件上传函数
            await uploadLyricsFiles(
              album.value.id,
              songForm.editingSongId,
              songForm.lyricsFile,
              songForm.translationLyricsFile,
              (progress) => {
                uploadProgress.value = progress;
              }
            );
            
            // 同时更新歌曲基本信息
            const updateData = {
              songId: songForm.editingSongId,
              title: songForm.title,
              genre: songForm.genre,
              language: songForm.language,
              artists: songForm.artists,
              artistIds: artistIds // 添加排序后的歌手ID数组
            };
            
            await albumStore.updateSongArtists(album.value.id, updateData);
            
            ElMessage.success('歌曲信息和歌词文件更新成功');
          } catch (error) {
            console.error('上传歌词文件错误:', error);
            ElMessage.error(`上传歌词文件失败: ${error.toString()}`);
            throw error;
          }
        } else if (songForm.wavFile) {
          // 上传了WAV文件的情况
          isUploading.value = true;
          uploadProgress.value = 0;
          
          // 准备表单数据
          const updateData = {
            songId: songForm.editingSongId,
            title: songForm.title,
            genre: songForm.genre,
            language: songForm.language,
            wavFile: songForm.wavFile,
            lyricsFile: songForm.lyricsFile,
            translationLyricsFile: songForm.translationLyricsFile,
            artists: songForm.artists,
            artistIds: artistIds // 添加排序后的歌手ID数组
          };
          
          try {
            // 调用API更新歌曲，提供进度回调
            await albumStore.updateSongWithWav(
              album.value.id, 
              updateData, 
              (progress) => {
                uploadProgress.value = progress;
              }
            );
            
            // 如果有歌词文件，但WAV文件上传完成后，确保也上传歌词文件
            if (songForm.lyricsFile || songForm.translationLyricsFile) {
              
              
              try {
                await uploadLyricsFiles(
                  album.value.id,
                  songForm.editingSongId,
                  songForm.lyricsFile,
                  songForm.translationLyricsFile,
                  (progress) => {
                    // 歌词文件上传进度从90%开始，最高到100%
                    uploadProgress.value = 90 + (progress * 0.1);
                  }
                );
                
              } catch (lyricsError) {
                console.error('上传歌词文件失败:', lyricsError);
                ElMessage.error(`歌词文件上传失败: ${lyricsError.toString()}`);
                // 不抛出异常，允许WAV文件更新成功
              }
            }
            
            ElMessage.success('歌曲信息和音频文件更新成功');
          } catch (error) {
            console.error('替换文件错误:', error);
            ElMessage.error(`替换文件失败: ${error.toString()}`);
            throw error;
          }
        } else {
          // 没有上传新的文件，只更新歌手信息
          const updateData = {
            songId: songForm.editingSongId,
            title: songForm.title,
            genre: songForm.genre,
            language: songForm.language,
            artists: songForm.artists,
            artistIds: artistIds, // 添加排序后的歌手ID数组
            // 添加原始歌词文件路径
            lyricsFile: songForm.originalLyricsFile,
            translationLyricsFile: songForm.originalTranslationLyricsFile
          };
          
          // 调用API更新歌曲信息
          await albumStore.updateSongArtists(album.value.id, updateData);
          
          ElMessage.success('歌曲信息更新成功');
        }
      } else {
        // 新增模式 - 检查WAV文件
        if (!songForm.wavFile) {
          ElMessage.warning('请上传WAV文件');
          return;
        }
        
        // 启动进度状态
        songFormSubmitting.value = true;
        isUploading.value = true;
        uploadProgress.value = 0;
        
        // 准备表单数据
        const songData = {
          title: songForm.title,
          genre: songForm.genre,
          language: songForm.language,
          wavFile: songForm.wavFile,
          lyricsFile: songForm.lyricsFile,
          translationLyricsFile: songForm.translationLyricsFile,
          artists: songForm.artists,
          artistIds: artistIds // 添加排序后的歌手ID数组
        };
        
        // 调用API添加歌曲，提供进度回调
        await albumStore.addSong(
          album.value.id, 
          songData, 
          (progress) => {
            // WAV文件上传进度占总进度的90%
            uploadProgress.value = progress * 0.9;
          }
        );
        
        // 获取新添加的歌曲ID
        const newSongId = albumStore.lastAddedSongId;
        
        // 如果有歌词文件，在WAV文件上传完成后上传歌词
        if ((songForm.lyricsFile || songForm.translationLyricsFile) && newSongId) {
          
          
          try {
            await uploadLyricsFiles(
              album.value.id,
              newSongId,
              songForm.lyricsFile,
              songForm.translationLyricsFile,
              (progress) => {
                // 歌词文件上传进度从90%开始，最高到100%
                uploadProgress.value = 90 + (progress * 0.1);
              }
            );
            
          } catch (lyricsError) {
            console.error('上传歌词文件失败:', lyricsError);
            ElMessage.error(`歌词文件上传失败: ${lyricsError.toString()}`);
            // 不抛出异常，允许WAV文件上传成功
          }
        }
        
        ElMessage.success('歌曲添加成功');
      }
      
      // 重置表单
      resetSongForm();
      dialogVisible.value = false;
      
      // 重新获取专辑详情
      await fetchAlbumDetail();
    } catch (error) {
      console.error('提交歌曲表单错误:', error);
      ElMessage.error(error.toString());
    } finally {
      isUploading.value = false;
      songFormSubmitting.value = false;
    }
  };
  
  // 重置歌曲表单
  const resetSongForm = () => {
      songForm.title = '';
      songForm.genre = '';
      songForm.language = '';
      songForm.wavFile = null;
    songForm.lyricsFile = null;
    songForm.translationLyricsFile = null;
      songForm.artists = [];
    songForm.isEditing = false;
    songForm.editingSongId = null;
    songForm.originalLyricsFile = null;
    songForm.originalTranslationLyricsFile = null;

    // 重置文件列表
      fileList.value = [];
    lyricsFileList.value = [];
    translationLyricsFileList.value = [];

    // Don't add a blank artist card anymore
    // addArtist();
  };
  
  // 添加检测专辑问题的函数
  const problems = ref([]);
  const hasErrors = computed(() => problems.value.some(p => p.level === 'error'));

  // 检测专辑中的问题
  const detectAlbumProblems = async () => {
    try {
      const newProblems = [];
      
      // 重置问题列表
      problems.value = [];
      
      // 检查专辑授权书 - 设置为严重级别(error)
      if (!album.value?.authorizationFile) {
        newProblems.push({
          level: 'error',
          message: '专辑没有上传授权文件',
          location: `专辑: ${album.value?.title || '未命名专辑'}`
        });
      }
      
      // 检查所有歌曲
      if (album.value?.songs && album.value.songs.length > 0) {
        for (const song of album.value.songs) {
          // 检查音频文件 - 严重级别(error)
          if (!song.wavFile) {
            newProblems.push({
              level: 'error',
              message: `歌曲 "${song.title}" 没有上传音频文件`,
              location: `歌曲ID: ${song.id}`
            });
          }
          
          // 检查歌词文件（仅对非纯音乐检查）- 严重级别(error)
          if (song.language !== '纯音乐' && !song.lyricsFile) {
            newProblems.push({
              level: 'error',
              message: `歌曲 "${song.title}" 没有上传歌词文件`,
              location: `歌曲ID: ${song.id}`
            });
          }
          
          // 检查翻译歌词文件（仅对英文和其他语言检查）- 警告级别(warning)
          if (['英文', '其他语言'].includes(song.language) && !song.translationLyricsFile) {
            newProblems.push({
              level: 'warning',
              message: `歌曲 "${song.title}" 没有上传翻译歌词文件`,
              location: `歌曲ID: ${song.id}`
            });
          }
          
          // 检查歌曲是否有关联歌手
          const hasArtists = song.Artists && Array.isArray(song.Artists) && song.Artists.length > 0;
          if (!hasArtists) {
            newProblems.push({
              level: 'error',
              message: `歌曲 "${song.title}" 没有关联歌手`,
              location: `歌曲ID: ${song.id}`
            });
          }
        }
      } else {
        // 没有歌曲是严重问题
        newProblems.push({
          level: 'error',
          message: '专辑中没有添加任何歌曲',
          location: `专辑: ${album.value?.title || '未命名专辑'}`
        });
      }
      
      // 更新问题列表
      problems.value = newProblems;
      
      console.log('检测到的问题:', problems.value);
      
      return problems.value;
    } catch (error) {
      console.error('检测专辑问题时出错:', error);
      return [];
    }
  };

  // 显示问题列表对话框
  const showProblemsDialog = async (problems) => {
    // 按严重程度排序问题
    const sortedProblems = [...problems].sort((a, b) => {
      const levelOrder = { error: 0, warning: 1, info: 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
    
    // 构建问题列表HTML
    let problemsHtml = '<div class="problems-list">';
    
    for (const problem of sortedProblems) {
      const iconClass = problem.level === 'error' ? 'error-icon' : 
                        problem.level === 'warning' ? 'warning-icon' : 'info-icon';
      
      problemsHtml += `
        <div class="problem-item ${problem.level}">
          <div class="problem-icon ${iconClass}"></div>
          <div class="problem-content">
            <div class="problem-message">${problem.message}</div>
            <div class="problem-location">${problem.location}</div>
          </div>
        </div>
      `;
    }
    
    problemsHtml += '</div>';
    
    // 添加一些CSS样式
    problemsHtml += `
      <style>
        .problems-list {
          max-height: 300px;
          overflow-y: auto;
        }
        .problem-item {
          display: flex;
          padding: 8px;
          margin-bottom: 8px;
          border-radius: 4px;
        }
        .problem-item.error {
          background-color: rgba(255, 87, 87, 0.1);
          border-left: 4px solid #f56c6c;
        }
        .problem-item.warning {
          background-color: rgba(255, 197, 87, 0.1);
          border-left: 4px solid #e6a23c;
        }
        .problem-item.info {
          background-color: rgba(87, 173, 255, 0.1);
          border-left: 4px solid #409eff;
        }
        .problem-icon {
          margin-right: 8px;
        }
        .problem-message {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .problem-location {
          font-size: 12px;
          color: #666;
        }
      </style>
    `;
    
    // 显示对话框
    await ElMessageBox.alert(
      problemsHtml,
      '专辑问题检测结果',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我知道了',
        type: hasErrors.value ? 'error' : 'warning'
      }
    );
  };
  
  // 修改submitForReview方法，添加授权书验证
  const submitForReview = async () => {
    try {
      loading.value = true;
      
      // 先检查用户是否已通过实名认证
      const isVerified = await checkUserVerification();
      if (!isVerified) return;
      
      // 检测专辑问题
      const detectedProblems = await detectAlbumProblems();
      
      // 检查是否有严重问题(error级别)
      const hasErrorProblems = detectedProblems.some(p => p.level === 'error');
      
      if (hasErrorProblems) {
        // 如果有严重问题，显示错误信息并展示问题列表
        await showProblemsDialog(detectedProblems);
        return;
      }
      
      // 检查是否有警告问题(warning级别)，有则提示但允许继续
      const hasWarningProblems = detectedProblems.some(p => p.level === 'warning');
      if (hasWarningProblems) {
        try {
          await ElMessageBox.confirm(
            '专辑中存在一些警告级别的问题，是否仍要继续提交？',
            '存在警告',
            {
              confirmButtonText: '继续提交',
              cancelButtonText: '查看问题',
              type: 'warning',
            }
          );
          // 用户选择继续提交，不显示问题列表
        } catch (error) {
          // 用户选择查看问题
          if (error !== 'cancel') {
            await showProblemsDialog(detectedProblems);
          }
          return;
        }
      }
      
      // 用户已通过实名认证，继续提交专辑
      await ElMessageBox.confirm(
        '提交后专辑将进入审核流程，您将无法继续编辑专辑内容。确定要提交审核吗？',
        '提交确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      const result = await albumStore.submitAlbumForReview(route.params.id);
      ElMessage.success('专辑已成功提交审核');
      
      // 重新获取专辑信息以更新状态
      await fetchAlbumDetail();
    } catch (error) {
      if (error !== 'cancel') {
        // 如果是API返回的需要认证错误
        if (error.response?.data?.needVerification) {
          try {
            await ElMessageBox.confirm(
              '您需要先完成实名认证才能提交专辑审核。是否前往实名认证页面？',
              '需要实名认证',
              {
                confirmButtonText: '前往认证',
                cancelButtonText: '取消',
                type: 'warning',
              }
            );
            
            // 用户点击了前往认证
            router.push('/user-verification');
          } catch (dialogError) {
            // 用户取消了对话框
          }
        } else {
          ElMessage.error(error.toString());
        }
      }
    } finally {
      loading.value = false;
    }
  };
  
  // 修改resubmitForReview方法，添加授权书验证
  const resubmitForReview = async () => {
    try {
      loading.value = true;
      
      // 先检查用户是否已通过实名认证
      const isVerified = await checkUserVerification();
      if (!isVerified) return;
      
      // 检测专辑问题
      const detectedProblems = await detectAlbumProblems();
      
      // 检查是否有严重问题(error级别)
      const hasErrorProblems = detectedProblems.some(p => p.level === 'error');
      
      if (hasErrorProblems) {
        // 如果有严重问题，显示错误信息并展示问题列表
        await showProblemsDialog(detectedProblems);
        return;
      }
      
      // 检查是否有警告问题(warning级别)，有则提示但允许继续
      const hasWarningProblems = detectedProblems.some(p => p.level === 'warning');
      if (hasWarningProblems) {
        try {
          await ElMessageBox.confirm(
            '专辑中存在一些警告级别的问题，是否仍要继续提交？',
            '存在警告',
            {
              confirmButtonText: '继续提交',
              cancelButtonText: '查看问题',
              type: 'warning',
            }
          );
          // 用户选择继续提交，不显示问题列表
        } catch (error) {
          // 用户选择查看问题
          if (error !== 'cancel') {
            await showProblemsDialog(detectedProblems);
          }
          return;
        }
      }
      
      // 用户已通过实名认证，继续提交专辑
      await ElMessageBox.confirm(
        '重新提交后专辑将再次进入审核流程。您是否已经根据拒绝理由修改了内容？',
        '重新提交确认',
        {
          confirmButtonText: '已修改，确定提交',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      const result = await albumStore.resubmitAlbumForReview(route.params.id);
      ElMessage.success('专辑已成功重新提交审核');
      
      // 重新获取专辑信息以更新状态
      await fetchAlbumDetail();
    } catch (error) {
      if (error !== 'cancel') {
        // 如果是API返回的需要认证错误
        if (error.response?.data?.needVerification) {
          try {
            await ElMessageBox.confirm(
              '您需要先完成实名认证才能提交专辑审核。是否前往实名认证页面？',
              '需要实名认证',
              {
                confirmButtonText: '前往认证',
                cancelButtonText: '取消',
                type: 'warning',
              }
            );
            
            // 用户点击了前往认证
            router.push('/user-verification');
          } catch (dialogError) {
            // 用户取消了对话框
          }
        } else {
          ElMessage.error(error.response?.data?.message || error.toString());
        }
      }
    } finally {
      loading.value = false;
    }
  };
  
  const handleEditSong = async (song) => {
    // 先检查专辑状态
    
    // 【新增】强制清除歌手缓存，从API获取最新数据
    const refreshArtistData = async () => {
      try {
        // 只有当song.artists存在且有值时才执行
        if (song.artists && Array.isArray(song.artists) && song.artists.length > 0) {
          logDebug('开始强制刷新歌手数据', song.artists);
          
          // 创建获取所有艺人信息的请求
          const refreshPromises = song.artists.map(artistId => {
            return axios.get(`${API_BASE_URL}/artists/${artistId}`, {
              params: {
                albumId: route.params.id,
                songId: song.id,
                _v: new Date().getTime() // 添加时间戳以避免缓存
              },
            }).catch(err => {
              console.warn(`刷新歌手(ID:${artistId})信息失败:`, err);
              return null;
            });
          });
          
          // 等待所有请求完成
          const responses = await Promise.all(refreshPromises);
          
          // 获取有效的响应
          const validResponses = responses.filter(r => r && r.data);
          
          if (validResponses.length > 0) {
            // 使用新数据更新Artists数组
            song.Artists = validResponses.map(r => r.data);
            logDebug('歌手数据刷新成功', song.Artists);
          }
        }
      } catch (error) {
        console.error('刷新歌手数据时出错:', error);
      }
    };
    
    // 执行刷新
    await refreshArtistData();
    
    // 检查专辑是否处于草稿状态或已拒绝状态
    const isDraft = album.value.isDraft || 
                   album.value.virtualStatus === 'draft' || 
                   (album.value.comment && album.value.comment.includes('DRAFT'));
    const isRejected = album.value.status === 'rejected';
    
    // 如果专辑状态不允许编辑，显示提示并返回
    if (!isDraft && !isRejected) {
      ElMessage.error('只能修改草稿状态或已拒绝状态的专辑中的歌曲');
      return;
    }
    
    // 创建临时编辑表单
    songForm.title = song.title;
    songForm.genre = song.genre || '';
    songForm.language = song.language || '';
    songForm.lyricsFile = null;
    songForm.translationLyricsFile = null;
    
    // 保存原始文件路径，以便在不上传新文件时使用
    songForm.originalLyricsFile = song.lyricsFile || null;
    songForm.originalTranslationLyricsFile = song.translationLyricsFile || null;
    
    // 重置文件列表
    lyricsFileList.value = [];
    translationLyricsFileList.value = [];
    
    // 如果歌曲有歌词文件，显示文件名
    if (song.lyricsFile) {
      lyricsFileList.value = [{
        name: song.lyricsFile.split('/').pop() || '歌词文件.lrc',
        url: resourceLoader.getResourceUrl(song.lyricsFile)
      }];
    }
    
    // 如果歌曲有翻译歌词文件，显示文件名
    if (song.translationLyricsFile) {
      translationLyricsFileList.value = [{
        name: song.translationLyricsFile.split('/').pop() || '翻译歌词文件.lrc',
        url: resourceLoader.getResourceUrl(song.translationLyricsFile)
      }];
    }
    
    // 复制歌手信息
    // 记录歌手顺序信息
    console.log('编辑歌曲的歌手顺序:', song.Artists && song.Artists.length ? song.Artists.map(a => a.name).join(', ') : '无歌手');
    
    // 检查歌曲是否有保存的artists字段（数据库中的歌手ID顺序）
    if (song.artists && Array.isArray(song.artists)) {
      console.log('歌曲的artists字段:', song.artists);
      
      // 强制刷新Artists数组，解决缓存问题
      if (true) { // 总是执行初始化流程
        console.log('歌曲没有Artists数组或为空，将从artists字段获取歌手数据');
        song.Artists = [];
        
        // 从数据库中获取歌手数据 - 添加专辑ID和歌曲ID参数
        const getArtistData = async (artistId) => {
          try {
            // 添加albumId和songId参数，以便后端验证权限
            const response = await axios.get(`${API_BASE_URL}/artists/${artistId}`, {
              params: {
                albumId: route.params.id,
                songId: song.id
              }
            });
            return response.data;
          } catch (error) {
            console.error(`获取歌手(${artistId})数据失败:`, error);
            // 即使获取失败，也返回一个带有基本信息的临时对象
            return {
              id: artistId,
              name: `歌手#${artistId}`,
              realName: ''
            };
          }
        };
        
        // 为每个歌手ID创建一个临时对象并异步获取数据
        const artistPromises = [];
        
        for (const artistId of song.artists) {
          // 确保artistId是有效的数字
          if (!artistId || isNaN(Number(artistId))) {
            console.warn('发现无效的歌手ID:', artistId);
            continue;
          }
          
          // 创建临时对象
          const tempArtist = {
            id: artistId,
            name: `歌手#${artistId}`,
            realName: '',
            // 其他必要的字段
            netease: '',
            qq: '',
            kugou: '',
            kuwo: '',
            spotify: '',
            youtube: '',
            appleMusic: '',
            soundCloud: ''
          };
          
          // 添加到Artists数组
          song.Artists.push(tempArtist);
          
          // 异步获取完整数据并添加到promises数组
          const promise = getArtistData(artistId).then(artistData => {
            if (artistData) {
              // 更新临时对象
              const index = song.Artists.findIndex(a => {
                const aId = typeof a.id === 'string' ? parseInt(a.id) : a.id;
                return aId === artistId || aId === Number(artistId);
              });
              
              if (index !== -1) {
                song.Artists[index] = artistData;
                console.log(`更新了歌手数据: ${artistData.name}`);
              }
            }
          }).catch(error => {
            console.error(`获取歌手(${artistId})数据出错:`, error);
          });
          
          artistPromises.push(promise);
        }
        
        // 等待所有歌手数据获取完成
        if (artistPromises.length > 0) {
          try {
            await Promise.all(artistPromises);
            console.log('所有歌手数据获取完成:', song.Artists);
          } catch (error) {
            console.error('获取歌手数据时出错:', error);
          }
        }
      }
      
      // 使用数据库中保存的artists字段（ID数组）来排序Artists数组
      // 这确保了我们按照数据库中保存的顺序显示歌手
      const sortedArtists = [];
      
      // 遍历artists数组中的ID
      for (const artistId of song.artists) {
        // 确保artistId是有效的数字
        if (!artistId || isNaN(Number(artistId))) {
          console.warn('发现无效的歌手ID:', artistId);
          continue;
        }
        
        // 查找匹配的歌手对象 - 检查ID和canonicalArtistId
        const artist = song.Artists.find(a => {
          const aId = typeof a.id === 'string' ? parseInt(a.id) : a.id;
          
          // 检查普通ID匹配
          if (aId === artistId || aId === Number(artistId)) {
            return true;
          }
          
          // 检查关联歌手ID匹配
          if (a.canonicalArtistId) {
            const canonicalId = typeof a.canonicalArtistId === 'string' ? 
              parseInt(a.canonicalArtistId) : a.canonicalArtistId;
            return canonicalId === artistId || canonicalId === Number(artistId);
          }
          
          return false;
        });
        
        if (artist) {
          // 如果找到匹配的歌手，使用它
          sortedArtists.push(artist);
          logDebug(`找到ID为${artistId}的歌手对象`, artist);
        } else {
          // 如果没有找到，尝试通过API获取歌手信息
          console.warn(`未找到ID为${artistId}的歌手对象，尝试从API获取`);
          
          // 先添加一个临时对象
          const tempArtist = {
            id: artistId,
            name: `歌手#${artistId}`,
            realName: ''
          };
          
          sortedArtists.push(tempArtist);
          
          // 异步获取歌手信息
          axios.get(`${API_BASE_URL}/artists/${artistId}`, {
            params: { albumId: route.params.id, songId: song.id }
          }).then(response => {
            if (response.data) {
              // 找到临时歌手的索引
              const index = sortedArtists.findIndex(a => {
                const aId = typeof a.id === 'string' ? parseInt(a.id) : a.id;
                return aId === artistId || aId === Number(artistId);
              });
              
              if (index !== -1) {
                // 更新临时歌手信息
                Object.assign(sortedArtists[index], response.data);
                
                // 如果这是关联歌手，确保使用主歌手的名称
                if (response.data.canonicalArtistId && response.data.canonicalArtist) {
                  sortedArtists[index].name = response.data.canonicalArtist.name;
                  sortedArtists[index].realName = response.data.canonicalArtist.realName || '';
                }
                
                logDebug(`更新了ID为${artistId}的歌手信息`, sortedArtists[index]);
              }
            }
          }).catch(error => {
            console.error(`获取ID为${artistId}的歌手信息失败:`, error);
          });
        }
      }
      
      // 如果有些歌手不在artists数组中，将它们添加到末尾
      if (song.Artists && Array.isArray(song.Artists)) {
      song.Artists.forEach(artist => {
          // 确保artist.id是有效的
          if (!artist || !artist.id) {
            console.warn('发现无效的歌手对象:', artist);
            return;
          }
          
          const artistId = typeof artist.id === 'string' ? Number(artist.id) : artist.id;
          const artistExists = song.artists.some(id => {
            const numId = typeof id === 'string' ? Number(id) : id;
            return numId === artistId || numId === artist.id;
          });
          
          if (!artistExists) {
          sortedArtists.push(artist);
        }
      });
      }
      
      // 使用排序后的歌手数组
      if (sortedArtists.length > 0) {
      song.Artists = sortedArtists;
      console.log('按数据库顺序排序后的歌手:', song.Artists.map(a => a.name).join(', '));
      } else {
        console.warn('排序后的歌手数组为空');
        // 确保至少有一个临时歌手对象
        if (song.artists && song.artists.length > 0) {
          const firstArtistId = song.artists[0];
          song.Artists = [{
            id: firstArtistId,
            name: `歌手#${firstArtistId}`,
            realName: ''
          }];
        }
      }
    }
    
    // 确保song.Artists是一个有效的数组
    if (!song.Artists || !Array.isArray(song.Artists) || song.Artists.length === 0) {
      console.warn('歌曲没有关联的歌手或歌手数组为空');
      
      // 如果有artists字段但没有Artists对象，创建临时对象并尝试从API获取
      if (song.artists && Array.isArray(song.artists) && song.artists.length > 0) {
        // 创建初始的临时对象数组
        song.Artists = song.artists.map(artistId => ({
          id: artistId,
          name: `加载中...`, // 初始显示为加载中
          realName: ''
        }));
        
        // 为每个艺人ID异步获取完整信息
        song.artists.forEach((artistId, index) => {
          axios.get(`${API_BASE_URL}/artists/${artistId}`, {
            params: { albumId: route.params.id, songId: song.id }
          }).then(response => {
            if (response.data) {
              // 获取到艺人信息后更新
              const artistData = response.data;
              
              // 如果是关联歌手，使用主歌手的信息
              if (artistData.canonicalArtistId && artistData.canonicalArtist) {
                song.Artists[index] = {
                  ...artistData,
                  name: artistData.canonicalArtist.name,
                  realName: artistData.canonicalArtist.realName || ''
                };
                logDebug(`获取到关联歌手(ID:${artistId})的主歌手信息`, song.Artists[index]);
              } else {
                // 普通歌手，直接使用获取到的信息
                song.Artists[index] = artistData;
                logDebug(`获取到歌手信息(ID:${artistId})`, song.Artists[index]);
              }
            }
          }).catch(error => {
            console.error(`获取歌手(ID:${artistId})信息失败:`, error);
            // 如果获取失败，使用临时名称
            song.Artists[index].name = `歌手#${artistId}`;
          });
        });
      } else {
        songForm.artists = [];
      }
    }
    
    if (song.Artists && song.Artists.length > 0) {
      songForm.artists = song.Artists.map(artist => {
        // 确保artist对象有效
        if (!artist || typeof artist !== 'object') {
          console.warn('发现无效的歌手对象:', artist);
          return null;
        }
        
        // 处理可能的节点ID格式（如"artist-15"）
        let artistId = artist.id;
        
        // 处理字符串格式的ID
        if (typeof artistId === 'string') {
          if (artistId.startsWith('artist-')) {
            // 处理节点ID格式
            const match = artistId.match(/artist-(\d+)/);
            if (match && match[1]) {
              artistId = parseInt(match[1]);
              console.log(`歌手 ${artist.name} 的ID从 ${artist.id} 更新为 ${artistId}`);
            }
          } else if (!isNaN(Number(artistId))) {
            // 处理字符串数字
            artistId = Number(artistId);
          }
        }
        
        // 处理浮点数ID - 转换为整数
        if (typeof artistId === 'number' && !Number.isInteger(artistId)) {
          console.warn(`发现浮点数ID: ${artistId}，将转换为整数`);
          artistId = Math.floor(artistId);
        }
        
        // 如果ID无效，生成一个临时ID
        if (!artistId || isNaN(artistId)) {
          console.warn(`歌手 ${artist.name} 的ID无效，将使用临时ID`);
          // 使用时间戳作为临时ID
          artistId = Math.floor(Date.now() / 1000);
        }
        
        // 处理关联歌手 - 如果有canonicalArtistId，确保使用主歌手信息
        if (artist.canonicalArtistId && artist.canonicalArtist) {
          logDebug(`歌手 ${artist.name} 是关联歌手，主歌手信息:`, artist.canonicalArtist);
          
          // 使用主歌手的名称和实名，但保持原始ID
          return {
            id: artistId,
            name: artist.canonicalArtist.name || artist.name,
            realName: artist.canonicalArtist.realName || artist.realName || '',
            // 保存关联关系
            canonicalArtistId: artist.canonicalArtistId,
            canonicalArtist: artist.canonicalArtist,
            // 其他字段保持不变
            id_number: artist.id_number || '',
            idNumberValid: true,
            platforms: {
              netease: artist.netease || artist.platforms?.netease || artist.canonicalArtist?.netease || '',
              qq: artist.qq || artist.platforms?.qq || artist.canonicalArtist?.qq || '',
              kugou: artist.kugou || artist.platforms?.kugou || artist.canonicalArtist?.kugou || '',
              kuwo: artist.kuwo || artist.platforms?.kuwo || artist.canonicalArtist?.kuwo || '',
              qishui: artist.qishui || artist.platforms?.qishui || artist.canonicalArtist?.qishui || '',
              spotify: artist.spotify || artist.platforms?.spotify || artist.canonicalArtist?.spotify || '',
              youtube: artist.youtube || artist.platforms?.youtube || artist.canonicalArtist?.youtube || '',
              appleMusic: artist.appleMusic || artist.platforms?.appleMusic || artist.canonicalArtist?.appleMusic || '',
              soundCloud: artist.soundCloud || artist.platforms?.soundCloud || artist.canonicalArtist?.soundCloud || '',
            },
            platformsValid: {
              netease: true, qq: true, kugou: true, kuwo: true,
              qishui: true, spotify: true, youtube: true, 
              appleMusic: true, soundCloud: true,
            }
          };
        }
        
        return {
          id: artistId,
          name: artist.name || '未命名歌手',
          realName: artist.realName || '',
      id_number: artist.id_number || '',
      idNumberValid: true,
      platforms: {
        netease: artist.netease || '',
        qq: artist.qq || '',
        kugou: artist.kugou || '',
        kuwo: artist.kuwo || '',
        qishui: artist.qishui || '',
        spotify: artist.spotify || '',
        youtube: artist.youtube || '',
        appleMusic: artist.appleMusic || '',
        soundCloud: artist.soundCloud || '',
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
        soundCloud: true,
      }
        };
      }).filter(Boolean); // 过滤掉null值
    }
    
    // 标记当前是在编辑模式
    songForm.isEditing = true;
    songForm.editingSongId = song.id;
    
    // 编辑模式下验证一次所有平台链接
    for (const artist of songForm.artists) {
      for (const [platform, url] of Object.entries(artist.platforms)) {
        if (url) {
          artist.platformsValid[platform] = validatePlatformUrlLocal(platform, url);
        }
      }
    }
    
    // 打开对话框
    dialogVisible.value = true;
  };
  
  const handleDeleteSong = async (song) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除这首歌曲吗？此操作不可恢复。',
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      await albumStore.deleteSong(album.value.id, song.id);
      await fetchAlbumDetail();
      ElMessage.success('歌曲删除成功');
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '删除歌曲失败');
      }
    }
  };
  
  // 添加请求控制器
  const controller = ref(null);
  const loadingTimeout = ref(false);
  const loadingTimeoutTimer = ref(null);
  
  // 处理重试加载
  const handleRetry = () => {
    
    // 重置状态
    loadingTimeout.value = false;
    error.value = null;
    
    // 清除所有定时器
    if (requestTimeout.value) {
      clearTimeout(requestTimeout.value);
      requestTimeout.value = null;
    }
    
    if (loadingTimeoutTimer.value) {
      clearTimeout(loadingTimeoutTimer.value);
      loadingTimeoutTimer.value = null;
    }
    
    // 重新加载数据
    fetchAlbumDetail();
  };
  
  // processSongs 函数已经移至 albumService.js
  
  
  
  // 导入 albumService 中的 fetchAlbumDetail 函数
import { fetchAlbumDetail as fetchAlbumDetailService } from '@/utils/support/AlbumDetail/albumService';

// 【新增】强制刷新歌曲中的歌手信息和顺序，解决显示缓存问题
const forceRefreshSongArtists = async (song) => {
  try {
    // 确保有歌手ID列表
    if (!song.artists || !Array.isArray(song.artists) || song.artists.length === 0) {
      logDebug(`歌曲 "${song.title}" 没有歌手ID列表，跳过刷新`);
      // 如果 song.Artists 也为空或不存在，则初始化为空数组
      if (!song.Artists || !Array.isArray(song.Artists)) {
        song.Artists = [];
      }
      return;
    }

    logDebug(`正在刷新歌曲 "${song.title}" 的歌手信息...`, song.artists);

    // 并行获取所有歌手的最新信息
    const artistPromises = song.artists.map(artistId => {
      if (!artistId || isNaN(Number(artistId))) {
        console.warn(`发现无效的歌手ID: ${artistId}`);
        return Promise.resolve(null);
      }
      return axios.get(`${API_BASE_URL}/artists/${artistId}`, {
        params: {
          albumId: route.params.id,
          songId: song.id,
          _v: new Date().getTime() // 添加时间戳以避免缓存
        },
      }).catch(err => {
        console.warn(`获取歌手(ID:${artistId})信息失败:`, err);
        return null;
      });
    });

    const responses = await Promise.all(artistPromises);
    const fetchedArtists = responses.filter(r => r && r.data).map(r => r.data);
    
    // 如果没有获取到任何歌手信息，则不更新
    if (fetchedArtists.length === 0) {
      logDebug(`歌曲 "${song.title}" 未能获取到任何歌手信息`);
      song.Artists = song.artists.map(id => ({ id, name: `歌手 #${id}`}));
      return;
    }

    // 创建一个Map以便通过ID快速查找
    const artistMap = new Map(fetchedArtists.map(artist => [artist.id, artist]));

    // 按照 song.artists 的顺序重新构建 song.Artists 数组
    const newArtists = song.artists.map(artistId => {
      const artistData = artistMap.get(artistId);
      if (artistData) {
        // 如果是关联歌手，显示主歌手的名称
        if (artistData.canonicalArtist) {
          logDebug(`发现关联歌手: ${artistData.name} -> ${artistData.canonicalArtist.name}`);
          return { ...artistData, name: artistData.canonicalArtist.name, realName: artistData.canonicalArtist.realName || '' };
        }
        return artistData;
      }
      // 如果获取失败，返回一个临时对象
      return { id: artistId, name: `歌手#${artistId}`, realName: '' };
    }).filter(Boolean); // 过滤掉无效条目

    // 更新歌曲的Artists数组
    song.Artists = newArtists;
    logDebug(`歌曲 "${song.title}" 的歌手信息已刷新`, song.Artists.map(a => a.name));

  } catch (error) {
    console.error(`刷新歌曲 "${song.title}" 的歌手信息时出错:`, error);
    // 出现错误时，确保 song.Artists 是一个空数组，避免模板渲染错误
    if (!song.Artists || !Array.isArray(song.Artists)) {
      song.Artists = [];
    }
  }
};

// 获取专辑详情的包装函数
  const fetchAlbumDetail = async () => {
    try {
      const albumId = route.params.id;
      await fetchAlbumDetailService(albumId, isAdmin.value, adminForm, router);
      
      // 【新增】获取专辑详情后，强制刷新所有歌曲的歌手信息，以解决显示缓存和顺序问题
      if (album.value && album.value.songs) {
        logDebug('开始为所有歌曲刷新歌手信息...');
        await Promise.all(album.value.songs.map(song => forceRefreshSongArtists(song)));
        logDebug('所有歌曲的歌手信息刷新完毕');
      }

    } catch (err) {
    // 错误已在 service 中处理，这里不需要额外处理
    }
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // 检查用户实名认证状态的函数
  const checkUserVerification = async () => {
    try {
      const verificationStatus = await userVerificationStore.getVerificationStatus();
      if (!verificationStatus.isVerified) {
        // 用户未通过实名认证，弹出提示
        await ElMessageBox.confirm(
          '您需要先完成实名认证才能提交专辑审核。是否前往实名认证页面？',
          '需要实名认证',
          {
            confirmButtonText: '前往认证',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        
        // 用户点击了前往认证
        router.push('/user-verification');
        return false;
      }
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        // 用户未提交过认证
        await ElMessageBox.confirm(
          '您需要先完成实名认证才能提交专辑审核。是否前往实名认证页面？',
          '需要实名认证',
          {
            confirmButtonText: '前往认证',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
        
        // 用户点击了前往认证
        router.push('/user-verification');
        return false;
      }
      throw error;
    }
  };
  

  
  // 更新歌曲信息已在上方定义
  
  // ... existing code ...
  
  // 添加到script中的格式化函数
  const percentageFormatter = (percentage) => {
    return percentage === 100 ? '上传完成' : `${percentage}%`;
  };
  
  // 添加请求超时控制变量
  const requestTimeout = ref(null);
  const maxRequestTime = 30000; // 30秒超时
  
  // 修改onMounted钩子
onMounted(async () => {
  
  
  // 设置超时处理
  requestTimeout.value = setTimeout(() => {
    if (loading.value) {
      console.error('请求超时，强制结束加载状态');
    loading.value = false;
      error.value = '请求超时，请稍后再试';
      ElMessage.error('加载超时，请刷新页面重试');
    }
  }, maxRequestTime);

  try {
    await fetchAlbumDetail();
  } catch (err) {
    console.error('onMounted中获取专辑详情失败:', err);
    error.value = err.message || '获取专辑详情失败';
    ElMessage.error('获取专辑详情失败，请刷新页面重试');
  }
  
  // 初始应用样式
  applyGarrixStyles();
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);
});
  
  // 添加组件销毁前的清理
onBeforeUnmount(() => {
  
  
  // 取消请求
  if (controller.value) {
    controller.value.abort();
    controller.value = null;
  }
  
  // 清理所有定时器
  if (requestTimeout.value) {
    clearTimeout(requestTimeout.value);
    requestTimeout.value = null;
  }
  
  if (loadingTimeoutTimer.value) {
    clearTimeout(loadingTimeoutTimer.value);
    loadingTimeoutTimer.value = null;
  }
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize);
});
  
  // 在script setup部分，添加canEditSong函数定义
  // 检查专辑是否可以编辑
  const canEditSong = (album) => {
    if (!album) return false;
    
    // 检查用户是否登录
    if (!userStore.user) return false;
    
    // 如果是管理员，始终可以编辑
    if (userStore.user.role === 'admin') return true;
    
    // 检查是否是专辑所有者
    const isOwner = album.submittedById === userStore.user.id;
    if (!isOwner) return false;
    
    // 检查专辑状态 - 只有草稿状态或已拒绝状态的专辑可以编辑
    const isDraft = album.isDraft || 
                  album.virtualStatus === 'draft' || 
                  (album.comment && album.comment.includes('DRAFT'));
    const isRejected = album.status === 'rejected';
    
    return isDraft || isRejected;
  };
  
  // 获取授权书文件名
  const getAuthorizationFileName = () => {
    if (!album.value?.authorizationFile) return '';
    
    // 从路径中提取文件名
    const fullPath = album.value.authorizationFile;
    const fileName = fullPath.split(/[\/\\]/).pop();
    
    return fileName;
  };

// 打开专辑预览页面
const openAlbumPreview = async () => {
  try {
    if (!album.value || !album.value.id) {
      ElMessage.warning('无法获取专辑信息');
      return;
    }

    loading.value = true;
    
    // 调用API获取专辑链接信息
    const response = await albumStore.getAlbumLink(album.value.id);
    
    if (response && response.slug) {
      // 使用完整URL，包括协议和域名
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/album/${response.slug}`;
      
      console.log('打开专辑展示页面:', url);
      window.open(url, '_blank');
    } else {
      ElMessage.warning('此专辑尚未生成展示页面链接');
    }
  } catch (error) {
    console.error('获取专辑链接失败:', error);
    ElMessage.error('获取专辑链接失败');
  } finally {
    loading.value = false;
  }
  const timestampMatch = fileName.match(/^(temp_)?\d+-?(.+)$/);
    if (timestampMatch && timestampMatch[2]) {
      return timestampMatch[2];
    }
    
    return fileName;
  };
  
  // 删除授权书
  const deleteAuthorizationFile = async () => {
    if (!album.value?.authorizationFile) {
      ElMessage.warning('未上传授权书文件');
      return;
    }
    
    try {
      await ElMessageBox.confirm(
        '确定要删除授权书文件吗？此操作不可恢复。',
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      submitting.value = true;
      await albumStore.deleteAuthorizationFile(album.value.id);
      
      // 重新获取专辑详情
      await fetchAlbumDetail();
      ElMessage.success('授权书删除成功');
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '删除授权书失败');
      }
    } finally {
      submitting.value = false;
    }
  };
  
  // 显示身份证号码输入对话框
  const showIdNumberDialog = () => {
    idNumberDialogVisible.value = true;
  };
  
  // 处理授权书文件选择
  const handleAuthorizationFileChange = (file) => {
    
    
    // 检查文件对象
    if (!file || !file.raw) {
      ElMessage.error('文件对象无效!');
      authorizationFileList.value = [];
      authorizationFile.value = null;
      return false;
    }
    
    // 检查文件类型
    const isPDF = file.raw.type === 'application/pdf' || 
                  file.raw.name.toLowerCase().endsWith('.pdf');
    
    if (!isPDF) {
      ElMessage.error('只能上传PDF格式的授权书文件!');
      authorizationFileList.value = [];
      authorizationFile.value = null;
      return false;
    }
  
    // 检查文件大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.raw.size > maxSize) {
      ElMessage.error('授权书文件大小不能超过10MB!');
      authorizationFileList.value = [];
      authorizationFile.value = null;
      return false;
    }
    
    // 更新文件列表和授权书文件
    authorizationFileList.value = [file];
    
    // 确保使用原始文件对象
    authorizationFile.value = file.raw;
    
    
    
    // 自动上传文件
    uploadAuthorizationFile();
    
    return false; // 返回false阻止自动上传，我们使用自定义上传
  };
  
  // 上传授权书文件
  const uploadAuthorizationFile = async () => {
    if (!authorizationFile.value) {
      ElMessage.warning('请先选择授权书文件');
      return;
    }
    
    try {
      submitting.value = true;
      
      
      
      // 使用FileReader将文件转换为Base64
      const fileReader = new FileReader();
      
      // 创建Promise等待文件读取完成
      const base64Data = await new Promise((resolve, reject) => {
        fileReader.onload = (e) => {
          // 获取Base64字符串，去掉前缀
          const base64 = e.target.result.split(',')[1];
          resolve(base64);
        };
        fileReader.onerror = (e) => {
          reject(new Error('文件读取失败'));
        };
        
        // 开始读取文件
        fileReader.readAsDataURL(authorizationFile.value);
      });
      
      
      
      // 获取token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      // 构建请求数据
      const requestData = {
        base64Data: base64Data,
        fileName: authorizationFile.value.name
      };
      
      // 使用axios直接发送请求
      const response = await axios.post(
        `${API_BASE_URL}/albums/${album.value.id}/authorization-base64`,
        requestData,
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 60000 // 设置60秒超时
        }
      );
      
      
      
      // 重新获取专辑详情
      await fetchAlbumDetail();
      ElMessage.success('授权书上传成功');
  
      // 清空文件列表
      authorizationFileList.value = [];
      authorizationFile.value = null;
      

    } catch (error) {
      console.error('上传授权书失败:', error);
      
      // 打印更详细的错误信息
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误数据:', error.response.data);
        console.error('错误头信息:', error.response.headers);
      } else if (error.request) {
        console.error('请求已发送但未收到响应:', error.request);
      } else {
        console.error('请求设置错误:', error.message);
      }
      
      ElMessage.error(error.response?.data?.message || error.message || '上传授权书失败');
    } finally {
      submitting.value = false;
    }
  };
  

  
  // 处理平台URL变更
  const handlePlatformUrlChange = (artist, platform) => {
    const url = artist.platforms[platform];
    artist.platformsValid[platform] = validatePlatformUrlLocal(platform, url);
  };
  
  // 获取平台名称
  const getPlatformName = (platform) => {
    const platformNames = {
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
    return platformNames[platform] || platform;
  };
  
  // 检查是否有平台链接
  const hasPlatformLinks = (artist) => {
    if (!artist) return false;
    
    // 检查所有可能的平台链接
    return Boolean(
      artist.netease || 
      artist.qq || 
      artist.kugou || 
      artist.kuwo || 
      artist.qishui || 
      artist.spotify || 
      artist.youtube || 
      artist.appleMusic || 
      artist.soundCloud
    );
  };
  
  // 身份证号码验证和生成授权书
  const inputIdNumber = ref('');
  const idNumberValid = ref(true);
  const idNumberErrorMsg = ref('');
  const idNumberLoading = ref(false);
  
  // 验证身份证号码并生成授权书
  const validateAndGenerateAuthorization = async () => {
    // 验证身份证号码
    if (!inputIdNumber.value || !idNumberRegex.test(inputIdNumber.value)) {
      idNumberValid.value = false;
      idNumberErrorMsg.value = '请输入有效的18位身份证号码';
        return;
      }
      
    try {
      idNumberLoading.value = true;
      
      
      let realName = '';
      
      try {
        // 首先尝试从验证信息获取姓名
        const verificationInfo = await userVerificationStore.getVerificationInfo();
        
        
        if (verificationInfo && verificationInfo.realName) {
          realName = verificationInfo.realName;
          
        } else {
          console.warn('验证信息中没有真实姓名');
        }
      } catch (verificationError) {
        console.error('获取验证信息失败:', verificationError);
      }
      
      // 如果从验证信息中没有获取到姓名，尝试从用户信息获取
      if (!realName && userStore.user) {
        if (userStore.user.realName) {
          realName = userStore.user.realName;
          
        } else {
          console.warn('用户信息中没有真实姓名');
        }
      }
      
      // 如果仍然没有获取到姓名，尝试从输入框获取
      if (!realName) {
        // 弹出输入框请求用户输入姓名
        try {
          const { value: inputRealName } = await ElMessageBox.prompt(
            '请输入您的真实姓名（必须与实名认证时使用的姓名一致）',
            '输入真实姓名',
            {
              confirmButtonText: '确认',
              cancelButtonText: '取消',
              inputValidator: (value) => {
                if (!value || value.trim() === '') {
                  return '姓名不能为空';
                }
                return true;
              },
              inputErrorMessage: '请输入有效的姓名'
            }
          );
          
          if (inputRealName && inputRealName.trim()) {
            realName = inputRealName.trim();
            
          }
        } catch (inputError) {
          
          return; // 用户取消了输入，直接返回
        }
      }
      
      // 最终检查是否有真实姓名
      if (!realName) {
        throw new Error('无法获取您的真实姓名，请确保已完成实名认证或手动输入姓名');
      }
      
      
      
      // 调用API生成临时授权书（不上传到服务器，只下载）
      await albumStore.generateTempAuthorizationFile(album.value.id, {
        idNumber: inputIdNumber.value,
        realName: realName
      });
      
      // 关闭对话框
      idNumberDialogVisible.value = false;
      inputIdNumber.value = '';
      
      // 显示成功消息
      ElMessage.success('授权书生成成功');
        } catch (error) {
      console.error('生成授权书错误:', error);
      ElMessage.error(error.message || '生成授权书失败');
    } finally {
      idNumberLoading.value = false;
    }
  };
  
  // 查看歌手详情
  const handleViewArtistDetails = (song) => {
    if (!song || !song.Artists || !song.Artists.length) {
      ElMessage.warning('没有可查看的歌手信息');
      return;
    }
    
    // 存储当前歌曲详情
    currentSongDetails.value = {
      title: song.title,
      genre: song.genre,
      language: song.language,
      duration: song.duration,
      trackNumber: song.trackNumber
    };
    
    // 设置当前歌手详情
    currentArtistDetails.value = song.Artists.map(artist => ({
      name: artist.name,
      realName: artist.realName,
      id_number: artist.id_number,
      netease: artist.netease || artist.platforms?.netease,
      qq: artist.qq || artist.platforms?.qq,
      kugou: artist.kugou || artist.platforms?.kugou,
      kuwo: artist.kuwo || artist.platforms?.kuwo,
      qishui: artist.qishui || artist.platforms?.qishui,
      spotify: artist.spotify || artist.platforms?.spotify,
      youtube: artist.youtube || artist.platforms?.youtube,
      appleMusic: artist.appleMusic || artist.platforms?.appleMusic,
      soundCloud: artist.soundCloud || artist.platforms?.soundCloud
    }));
    
    // 重置选中的标签页
    activeArtistTab.value = '0';
    
    // 显示对话框
    artistDetailsVisible.value = true;
  };
  
  // 禁用以前日期
  const disabledDate = (time) => {
    return time.getTime() < Date.now();
  };
  
  // 专辑表单引用
  const albumFormRef = ref(null);
  
  // 专辑编辑表单
  const albumForm = reactive({
    title: '',
    type: '',
    releaseDate: '',
    displayInfo: '',
    description: '',
    performers: [], // 这里存储专辑表演者列表
    coverImage: '',
    coverImageFile: null,
    coverImagePreview: null
  });
  
  // 初始化专辑处理函数
  const { handleEditAlbum, handleUpdateAlbum } = createHandleAlbumFunctions(
    album,
    albumForm,
    albumFormRef,
    albumEditDialogVisible,
    submitting,
    fetchAlbumDetail
  );

  // PDF预览相关函数
  const previewAuthorizationFile = () => {
    if (album.value?.authorizationFile) {
      // 构建预览URL - 直接使用静态资源路径
      const previewUrl = `${STATIC_BASE_URL}/${album.value.authorizationFile}`;
      pdfPreviewUrl.value = previewUrl;
      pdfPreviewVisible.value = true;
    } else {
      ElMessage.warning('没有可预览的授权书文件');
    }
  };
  
  // 处理iframe加载完成
  const handleIframeLoad = () => {
    pdfLoaded.value = true;
  };
  
  // 处理iframe加载错误
  const handleIframeError = () => {
    pdfLoaded.value = false;
    ElMessage.error('PDF加载失败');
  };
  
  // 初始化封面处理相关函数
  const {
    handleCoverChange,
    uploadCoverImage,
    handleCoverFileSelected,
    handleDialogCoverChange,
    triggerCoverUpload
  } = createCoverFunctions(album, albumForm, submitting);
  
  
  // 添加音频文件延迟加载功能
  const loadAudio = async (song) => {
    if (song.audioLoaded || song.audioLoading) return;
    
    try {
      song.audioLoading = true;
      
      
      // 检查文件路径是否有效
      if (!song.wavFile) {
        throw new Error('歌曲没有音频文件路径');
      }
      
      // 确保DOM中有正确的data属性
      const audioContainer = document.querySelector(`.audio-container[data-song-id="${song.id}"]`);
      if (audioContainer) {
        
      } else {
        console.warn('未找到对应的音频容器元素');
      }
      
      // 始终使用后端API获取MP3版本
      await loadAudioFromApi(song);
    } catch (error) {
      console.error('加载音频失败:', error);
      console.error('错误详情:', error.message);
      song.audioLoading = false;
      song.audioError = true;
      song.audioErrorMessage = error.message;
      ElMessage.error(`加载音频失败: ${error.message}`);
      
      // 尝试重置状态，以便用户可以重试
      setTimeout(() => {
        song.audioError = true; // 保持错误状态，但允许重试
        song.audioErrorMessage = '加载失败，请重试';
      }, 3000);
    }
  };
  
  // 从后端API加载MP3音频
  const loadAudioFromApi = async (song) => {
    try {
      // 确保有专辑ID和歌曲ID
      const albumId = song.albumId || route.params.id;
      const songId = song.id;
      
      if (!albumId || !songId) {
        throw new Error('缺少专辑ID或歌曲ID');
      }
      
      
      
      // 获取token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录，无法访问音频资源');
      }
      
      // 构建API URL
      const apiUrl = `${API_BASE_URL}/albums/${albumId}/songs/${songId}/audio`;
      
      
      // 请求API获取音频URL
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('音频API响应错误:', {
          status: response.status,
          statusText: response.statusText
        });
        
        // 尝试读取响应内容
        const errorText = await response.text();
        console.error('错误响应内容:', errorText);
        throw new Error(`音频API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      
      if (!data.audioUrl) {
        throw new Error('服务器未返回有效的音频URL');
      }
      
      // 更新歌曲对象，使用API返回的URL
      song.wavFile = data.audioUrl;
      song.audioLoaded = true;
      song.audioLoading = false;
      song.audioError = false;
      song.audioErrorMessage = null;
      
      
      // 如果API返回了真实的歌曲ID，更新歌曲对象
      if (data.id && data.id !== songId) {
        
        song.id = data.id;
      }
      
      // 如果API返回了歌曲信息，更新歌曲对象
      if (data.songInfo) {
        
        Object.assign(song, data.songInfo);
      }
      
      // 当组件销毁时，需要释放Blob URL
      if (song.wavFile && song.wavFile.startsWith('blob:')) {
        onBeforeUnmount(() => {
          
          URL.revokeObjectURL(song.wavFile);
        });
      }
      
      return data.audioUrl;
    } catch (error) {
      console.error('从API加载音频失败:', error);
      throw error;
    }
  };
  

  
  const handleDialogClose = (done) => {
    // 重置表单
    resetSongForm();
    // 关闭对话框
    done();
  };
  
  // 取消按钮处理函数
  const cancelSongForm = () => {
    // 重置表单
    resetSongForm();
    // 关闭对话框
    dialogVisible.value = false;
  };
  
  // 添加专辑表演者管理
  const artistSearchKeyword = ref('');
  const showSearchTip = ref(false);
  const showArtistSearchDropdown = ref(false);
  const searchResults = ref([]);
  const selectedArtist = ref(null);
  const searchingArtists = ref(false);
  
  // 处理搜索框失去焦点
  const handleSearchBlur = () => {
    // 不再需要延迟关闭，对话框有自己的关闭逻辑
    // showArtistSearchDropdown.value = false;
  };
  
  // 处理搜索框获得焦点
  const handleSearchFocus = () => {
    // 如果有关键词，执行搜索并显示对话框
    if (artistSearchKeyword.value.trim()) {
      handleGlobalArtistSearch();
    } else {
      // 如果有之前的搜索结果，直接显示对话框
      if (searchResults.value.length > 0) {
        showArtistSearchDropdown.value = true;
      }
    }
  };
  
  // 搜索歌手
  const handleGlobalArtistSearch = async () => {
    if (!artistSearchKeyword.value.trim()) {
      // 如果搜索关键词为空，不显示对话框
      showArtistSearchDropdown.value = false;
      searchResults.value = [];
      return;
    }
    
    try {
      // 先设置加载状态
      searchingArtists.value = true;
      
      // 显示对话框
      showArtistSearchDropdown.value = true;
      
      // 发起搜索请求
      const response = await axios.get(`${API_BASE_URL}/artist-edit-requests/search?keyword=${encodeURIComponent(artistSearchKeyword.value)}`);
      
      // 确保返回的结果是一个数组且每个项目都有有效数据
      const artists = response.data || [];
      searchResults.value = artists.filter(artist => {
        return artist && artist.name; // 过滤掉没有名称的项目
      });
      
      // 日志记录搜索结果，便于调试
      logDebug('搜索到的歌手结果', searchResults.value);
    } catch (error) {
      console.error('搜索歌手失败:', error);
      ElMessage.error('搜索歌手失败');
      searchResults.value = [];
    } finally {
      searchingArtists.value = false;
    }
  };
  
  // 添加表演者
  const handleAddPerformerClick = () => {
    showSearchTip.value = true;
    
    // 5秒后自动隐藏提示
    setTimeout(() => {
      showSearchTip.value = false;
    }, 5000);
  };
  
  // 移除表演者
  const handleRemovePerformer = (index) => {
    albumForm.performers.splice(index, 1);
  };
  
  // 添加表演者直接添加
  const addArtistDirectly = (artist) => {
    
    // 检查是否已存在相同ID的表演者
    const existingIdIndex = albumForm.performers.findIndex(p => p.artistId === artist.id);
    if (existingIdIndex >= 0) {
      ElMessage.warning(`表演者 "${artist.name}" 已添加`);
      return;
    }
    
    // 检查是否已存在相同名称的表演者（处理没有ID的情况）
    const existingNameIndex = albumForm.performers.findIndex(p => p.name === artist.name);
    if (existingNameIndex >= 0) {
      ElMessage.warning(`已存在同名表演者 "${artist.name}"`);
      return;
    }
    
    // 确保使用正确的歌手名称，而不是生成序号
    albumForm.performers.push({
      name: artist.name, // 使用歌手实际名称
      realName: artist.realName || '',
      artistId: artist.id || null, // 确保artistId是歌手的实际ID
      id: Date.now() // 本地唯一标识符，仅用于拖拽功能
    });
    
    // 清空搜索
    artistSearchKeyword.value = '';
    selectedArtist.value = null;
    showArtistSearchDropdown.value = false;
    searchResults.value = [];
    
    // 显示添加成功的提示
    ElMessage.success(`已添加表演者: ${artist.name}`);
  };
  
  // 拖拽调整顺序
  const handlePerformerDrag = () => {
    // 更新每个表演者的order属性
    albumForm.performers.forEach((performer, idx) => {
      performer.order = idx;
    });
    
    console.log('专辑表演者顺序已更新:', albumForm.performers.map(p => p.name));
    
    // 由于使用的是响应式数据，提交表单时会按最新顺序发送到后端
  };
  
  // 在script部分添加歌词文件相关的变量
  
  
  
  // 歌词文件处理函数已移至 lyrics.js
  
  // 翻译歌词文件处理函数已移至 lyrics.js
  
  // 歌词文件移除处理函数已移至 lyrics.js
  
  // 在script部分添加歌词文件相关的变量
  
  // 上传歌词文件函数已移至 lyrics.js
  
  // 处理歌词文件变更
  
  // 音频加载错误处理函数已移至 lyrics.js
  
  // 歌词预览相关变量已移至 lyrics.js
  
  // formatLyricsTime 函数已移至 lyrics.js
  
  // parseLrcFile 函数已移至 lyrics.js
  
  // previewLyrics 函数已移至 lyrics.js
  
  // fetchLyricsFromServer 函数已移至 lyrics.js
  

  // previewCombinedLyrics 函数已移至 lyrics.js
  

  
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
  
  // startEditLyrics 函数已移至 lyrics.js
  
  // cancelEditLyrics 函数已移至 lyrics.js
  
  // convertLyricsToLrcFormat 函数已移至 lyrics.js
  
  // saveLyricsChanges 函数已移至 lyrics.js
  
  // parseLrcContent 函数已移至 lyrics.js
  
  // 封面处理函数已移至 cover.js 并通过 createCoverFunctions 导入
  
  // 对话框中的封面图片变更处理函数已移至 cover.js 并通过 createCoverFunctions 导入
  
  // 在script setup部分添加coverFileInput的引用
  const coverFileInput = ref(null);
  
  // 修改albumForm，添加封面相关字段
  // const albumForm = reactive({
  //   title: '',
  //   type: '',
  //   releaseDate: '',
  //   displayInfo: '',
  //   description: '',
  //   performers: [],
  //   coverImage: '',
  //   coverImageFile: null,
  //   coverImagePreview: null
  // });
  
  // triggerCoverUpload方法已移至 cover.js 并通过 createCoverFunctions 导入
  
  // 添加管理员相关变量
  const isAdmin = computed(() => userStore.user?.role === 'admin');
  const adminForm = reactive({
    status: 'pending',
    comment: ''
  });
  const adminSubmitting = ref(false);
  
  // 管理员状态更新功能已移至AdminPanel组件
  
  // Search logic for the dialog
  const handleDialogArtistSearch = async () => {
    if (!dialogArtistSearchKeyword.value.trim()) {
      dialogShowArtistSearchDropdown.value = false;
      return;
    }
    
    try {
      dialogSearchingArtists.value = true;
      dialogShowArtistSearchDropdown.value = true;
      const response = await axios.get(`${API_BASE_URL}/artist-edit-requests/search?keyword=${encodeURIComponent(dialogArtistSearchKeyword.value)}`);
      dialogSearchResults.value = response.data || [];
    } catch (error) {
      console.error('搜索歌手失败:', error);
      ElMessage.error('搜索歌手失败');
      dialogSearchResults.value = [];
    } finally {
      dialogSearchingArtists.value = false;
    }
  };

  const handleDialogSearchBlur = () => {
    // Delay hiding to allow click event to register
    setTimeout(() => {
      dialogShowArtistSearchDropdown.value = false;
    }, 200);
  };
  
  const addArtistFromSearch = (artist) => {
    // Check if artist already exists
    if (songForm.artists.some(a => a.name === artist.name)) { // Simple check by name
      ElMessage.warning(`歌手 "${artist.name}" 已添加`);
      return;
    }
    
    // 确保添加的歌手对象包含必要的平台链接属性
    songForm.artists.push({
      // 使用歌手的实际ID，如果存在的话，否则使用一个整数临时ID
      id: artist.id || Math.floor(Date.now() / 1000), // 使用整数ID
      name: artist.name,
      realName: artist.realName || '',
      id_number: artist.id_number || '',
      idNumberValid: true,
      // 标记为新添加的歌手，便于后端处理
      isNew: !artist.id,
      platforms: {
        netease: artist.netease || '',
        qq: artist.qq || '',
        kugou: artist.kugou || '',
        kuwo: artist.kuwo || '',
        qishui: artist.qishui || '',
        spotify: artist.spotify || '',
        youtube: artist.youtube || '',
        appleMusic: artist.appleMusic || '',
        soundCloud: artist.soundCloud || '',
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
        soundCloud: true,
      }
    });

    // Reset search input
    dialogArtistSearchKeyword.value = '';
    dialogShowArtistSearchDropdown.value = false;
  };
  
  // 在onMounted之前添加
  // 直接修改下拉框样式
  const applyGarrixStyles = () => {
    setTimeout(() => {
      // 获取所有对话框中的下拉框
      const selects = document.querySelectorAll('.garrix-dialog .el-select .el-input__wrapper');
      if (selects.length > 0) {
        selects.forEach(select => {
          select.style.border = '2px solid #000000';
          select.style.borderRadius = '0';
          select.style.backgroundColor = '#ffffff';
          select.style.height = '48px';
          select.style.boxShadow = 'none';
        });
        
      }
    }, 100); // 给一点时间让DOM渲染完成
  };

  // 监听对话框打开事件
  watch(() => dialogVisible.value, (newVal) => {
    if (newVal) {
      // 对话框打开时应用样式
      applyGarrixStyles();
    }
  });
  
  // 授权书数字签名验证相关状态
  

  
  // 初始化歌词处理相关函数
const {
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
  // 响应式变量
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
} = createLyricsFunctions(songForm, lyricsFileList, translationLyricsFileList);
  

  // 专辑简介折叠控制
  const isDescriptionExpanded = ref(false);
  
  // 格式化描述文本，处理换行符
  const formattedDescription = computed(() => {
    if (!album.value?.description) return '';
    
    // 替换换行符为 <br> 标签
    return album.value.description.replace(/\n/g, '<br>');
  });
  
  // 判断是否显示展开/折叠按钮
  const shouldShowExpandButton = computed(() => {
    // 如果描述文本存在且包含多行内容，则显示展开/折叠按钮
    return album.value?.description && 
           (album.value.description.split('\n').length > 4 || 
            album.value.description.length > 200);
  });
  
  // 切换描述的展开/折叠状态
  const toggleDescription = () => {
    isDescriptionExpanded.value = !isDescriptionExpanded.value;
  };
  
  // 标签页控制
  const activeTab = ref('songs'); // 默认显示歌曲列表标签页

  // 音频播放抽屉相关
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

  // LRC制作器相关方法
  const openLrcMaker = async () => {
    // 检查语言设置
    if (!songForm.language || songForm.language === '纯音乐') {
      ElMessage.warning('纯音乐不需要制作歌词');
      return;
    }

    let audioUrl = '';
    let audioName = '';

    // 优先使用已上传的音频文件
    if (songForm.wavFile) {
      audioUrl = URL.createObjectURL(songForm.wavFile);
      audioName = songForm.wavFile.name;
    }
    // 如果是编辑模式且有歌曲ID，尝试从服务器获取音频
    else if (songForm.isEditing && songForm.editingSongId) {
      try {
        const apiUrl = `${API_BASE_URL}/albums/${route.params.id}/songs/${songForm.editingSongId}/audio`;
        const token = localStorage.getItem('token');

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioUrl) {
            audioUrl = data.audioUrl;
            audioName = songForm.title || '歌曲音频';
          }
        }
      } catch (error) {
        console.error('获取音频失败:', error);
      }
    }

    // 如果没有找到任何音频源
    if (!audioUrl) {
      ElMessage.warning('请先上传WAV音频文件或确保歌曲已有音频文件');
      return;
    }

    // 设置音频信息
    lrcMakerAudioUrl.value = audioUrl;
    lrcMakerAudioName.value = audioName;

    // 保存当前对话框状态
    dialogVisibleBeforeLrc.value = dialogVisible.value;
    // 临时关闭歌曲编辑对话框
    dialogVisible.value = false;
    // 打开LRC制作器
    lrcMakerVisible.value = true;

    // 等待LRC制作器组件加载完成后设置模式和加载歌词
    await nextTick();
    if (lrcMakerRef.value) {
      try {
        // 构建歌曲数据对象，包含歌词文件路径
        const songData = {
          title: songForm.title,
          lyricsFile: songForm.originalLyricsFile,
          translationLyricsFile: songForm.originalTranslationLyricsFile,
          language: songForm.language,
          Album: {
            title: album.value?.title,
            performer: album.value?.performer
          }
        };

        // 如果有歌词文件，自动加载
        if (songData.lyricsFile || songData.translationLyricsFile) {
          console.log('自动加载歌词:', songData);
          const result = await lrcMakerRef.value.loadLyricsFromServer(songData);
          console.log('歌词加载结果:', result);

          if (result.hasMainLyrics || result.hasTranslationLyrics) {
            ElMessage.success(`歌词加载成功 (${result.mode === 'bilingual' ? '双语模式' : '单语模式'})`);
          }
        } else {
          // 没有歌词文件，根据语言设置双语模式
          const shouldUseBilingualMode = songForm.language === '英文' || songForm.language === '其他语言';
          lrcMakerRef.value.setBilingualMode(shouldUseBilingualMode);
        }
      } catch (error) {
        console.error('加载歌词失败:', error);
        ElMessage.warning(`加载歌词失败: ${error.message}`);

        // 加载失败时，仍然根据语言设置双语模式
        const shouldUseBilingualMode = songForm.language === '英文' || songForm.language === '其他语言';
        lrcMakerRef.value.setBilingualMode(shouldUseBilingualMode);
      }
    }
  };

  // 为特定歌曲打开LRC制作器
  const openLrcMakerForSong = async (song) => {
    // 检查语言设置
    if (!song.language || song.language === '纯音乐') {
      ElMessage.warning('纯音乐不需要制作歌词');
      return;
    }

    if (!song.wavFile) {
      ElMessage.warning('该歌曲没有音频文件，无法制作歌词');
      return;
    }

    try {
      // 从服务器获取音频URL
      const apiUrl = `${API_BASE_URL}/albums/${route.params.id}/songs/${song.id}/audio`;
      const token = localStorage.getItem('token');

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`获取音频失败: ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioUrl) {
        throw new Error('服务器未返回有效的音频URL');
      }

      // 设置音频信息
      lrcMakerAudioUrl.value = data.audioUrl;
      lrcMakerAudioName.value = song.title || '歌曲音频';

      // 保存当前对话框状态（如果有的话）
      dialogVisibleBeforeLrc.value = dialogVisible.value;
      // 关闭歌曲编辑对话框（如果打开的话）
      dialogVisible.value = false;
      // 打开LRC制作器
      lrcMakerVisible.value = true;

      // 等待LRC制作器组件加载完成后设置模式和加载歌词
      await nextTick();
      if (lrcMakerRef.value) {
        try {
          // 如果有歌词文件，自动加载
          if (song.lyricsFile || song.translationLyricsFile) {
            console.log('自动加载歌曲歌词:', song);
            const result = await lrcMakerRef.value.loadLyricsFromServer(song);
            console.log('歌词加载结果:', result);

            if (result.hasMainLyrics || result.hasTranslationLyrics) {
              ElMessage.success(`歌词加载成功 (${result.mode === 'bilingual' ? '双语模式' : '单语模式'})`);
            }
          } else {
            // 没有歌词文件，根据语言设置双语模式
            const shouldUseBilingualMode = song.language === '英文' || song.language === '其他语言';
            lrcMakerRef.value.setBilingualMode(shouldUseBilingualMode);
          }
        } catch (error) {
          console.error('加载歌词失败:', error);
          ElMessage.warning(`加载歌词失败: ${error.message}`);

          // 加载失败时，仍然根据语言设置双语模式
          const shouldUseBilingualMode = song.language === '英文' || song.language === '其他语言';
          lrcMakerRef.value.setBilingualMode(shouldUseBilingualMode);
        }
      }

    } catch (error) {
      console.error('获取音频失败:', error);
      ElMessage.error(`获取音频失败: ${error.message}`);
    }
  };

  const closeLrcMaker = () => {
    lrcMakerVisible.value = false;
    // 清理音频URL（只清理通过createObjectURL创建的URL）
    if (lrcMakerAudioUrl.value && lrcMakerAudioUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(lrcMakerAudioUrl.value);
    }
    lrcMakerAudioUrl.value = '';
    lrcMakerAudioName.value = '';
    // 恢复歌曲编辑对话框
    if (dialogVisibleBeforeLrc.value) {
      dialogVisible.value = true;
    }
  };

  const handleLrcImport = async () => {
    try {
      // 检查LrcMaker组件是否有内容
      if (!lrcMakerRef.value || !lrcMakerRef.value.hasLyrics) {
        ElMessage.warning('请先制作歌词内容');
        return;
      }

      // 从LrcMaker组件获取LRC内容
      const lrcContent = lrcMakerRef.value.getLrcContent();

      // 处理双语模式
      if (typeof lrcContent === 'object' && lrcContent.original && lrcContent.translation) {
        // 双语模式：分别处理原文和翻译
        if (!lrcContent.original.trim()) {
          ElMessage.warning('原文歌词内容为空');
          return;
        }

        // 创建原文LRC文件
        const originalBlob = new Blob([lrcContent.original], { type: 'text/plain' });
        const originalFile = new File([originalBlob], 'lyrics.lrc', { type: 'text/plain' });

        const originalFileObj = {
          name: 'lyrics.lrc',
          raw: originalFile,
          size: originalFile.size,
          type: originalFile.type
        };

        // 设置原文到歌词文件字段
        songForm.lyricsFile = originalFile;
        lyricsFileList.value = [originalFileObj];

        // 如果有翻译内容，设置到翻译歌词字段
        let translationFile = null;
        if (lrcContent.translation.trim()) {
          const translationBlob = new Blob([lrcContent.translation], { type: 'text/plain' });
          translationFile = new File([translationBlob], 'translation_lyrics.lrc', { type: 'text/plain' });

          const translationFileObj = {
            name: 'translation_lyrics.lrc',
            raw: translationFile,
            size: translationFile.size,
            type: translationFile.type
          };

          songForm.translationLyricsFile = translationFile;
          translationLyricsFileList.value = [translationFileObj];
        }

        // 如果是编辑模式，直接上传到服务器
        if (songForm.isEditing && songForm.editingSongId) {
          try {
            ElMessage.info('正在上传双语歌词文件到服务器...');

            await uploadLyricsFiles(
              album.value.id,
              songForm.editingSongId,
              originalFile,
              translationFile,
              (progress) => {
                // 可以在这里显示上传进度
                console.log('上传进度:', progress + '%');
              }
            );

            // 更新原始文件路径
            songForm.originalLyricsFile = `lyrics/${songForm.editingSongId}_lyrics.lrc`;
            if (translationFile) {
              songForm.originalTranslationLyricsFile = `lyrics/${songForm.editingSongId}_translation_lyrics.lrc`;
            }

            ElMessage.success('双语动态歌词已成功上传到服务器');

            // 重新获取专辑详情以更新歌词文件状态
            await fetchAlbumDetail();
          } catch (error) {
            console.error('上传歌词文件失败:', error);
            ElMessage.error(`上传歌词文件失败: ${error.message}`);
            return;
          }
        } else {
          ElMessage.success('双语动态歌词已导入到歌词文件');
        }
      } else {
        // 单语模式
        if (!lrcContent.trim()) {
          ElMessage.warning('歌词内容为空');
          return;
        }

        // 将LRC内容转换为File对象
        const blob = new Blob([lrcContent], { type: 'text/plain' });
        const file = new File([blob], 'lyrics.lrc', { type: 'text/plain' });

        // 创建文件对象用于上传组件
        const fileObj = {
          name: 'lyrics.lrc',
          raw: file,
          size: file.size,
          type: file.type
        };

        // 设置到歌词文件字段
        songForm.lyricsFile = file;
        lyricsFileList.value = [fileObj];

        // 如果是编辑模式，直接上传到服务器
        if (songForm.isEditing && songForm.editingSongId) {
          try {
            ElMessage.info('正在上传歌词文件到服务器...');

            await uploadLyricsFiles(
              album.value.id,
              songForm.editingSongId,
              file,
              null, // 单语模式没有翻译文件
              (progress) => {
                // 可以在这里显示上传进度
                console.log('上传进度:', progress + '%');
              }
            );

            // 更新原始文件路径
            songForm.originalLyricsFile = `lyrics/${songForm.editingSongId}_lyrics.lrc`;

            ElMessage.success('动态歌词已成功上传到服务器');

            // 重新获取专辑详情以更新歌词文件状态
            await fetchAlbumDetail();
          } catch (error) {
            console.error('上传歌词文件失败:', error);
            ElMessage.error(`上传歌词文件失败: ${error.message}`);
            return;
          }
        } else {
          ElMessage.success('动态歌词已导入到歌词文件');
        }
      }

      // 关闭LRC制作器
      closeLrcMaker();

    } catch (error) {
      console.error('导入LRC文件失败:', error);
      ElMessage.error('导入LRC文件失败');
    }
  };

  // 处理歌曲拖拽排序
  const handleSongDrag = async () => {
    if (!album.value || !album.value.songs || !album.value.songs.length) return;
    
    try {
      // 拖拽完成后，album.songs已经自动更新顺序
      console.log('歌曲排序已更新:', album.value.songs.map(s => s.id));
      
      // 提取歌曲ID数组，保持拖拽后的顺序
      const songIds = album.value.songs.map(song => song.id);
      
      // 确保所有ID都是数字类型
      const numericSongIds = songIds.map(id => {
        // 处理可能的字符串ID
        if (typeof id === 'string') {
          return parseInt(id, 10);
        }
        return id;
      });
      
      // 更新歌曲序号（trackNumber）以匹配新的顺序
      album.value.songs.forEach((song, index) => {
        song.trackNumber = index + 1;
      });
      
      // 调用API更新歌曲顺序
      await albumStore.updateSongOrder(album.value.id, numericSongIds);
      
      ElMessage.success('歌曲顺序已更新');
    } catch (error) {
      console.error('更新歌曲顺序失败:', error);
      ElMessage.error('更新歌曲顺序失败，请刷新页面重试');
      
      // 重新获取专辑详情以恢复原始顺序
      await fetchAlbumDetail();
    }
  };

  // 在定义响应式变量的区域添加这个ref
  const searchDropdownRef = ref(null);

  // 处理点击外部区域关闭下拉框
  const handleClickOutside = (e) => {
    if (!showArtistSearchDropdown.value) return;
    
    const searchInput = searchInputRef.value?.$el;
    const dropdown = searchDropdownRef.value;
    
    // 如果下拉框存在且点击的不是下拉框内部也不是搜索框
    if (dropdown && !dropdown.contains(e.target) && searchInput && !searchInput.contains(e.target)) {
      showArtistSearchDropdown.value = false;
    }
  };

  // 在onMounted钩子中添加事件监听
  onMounted(() => {
    // 添加点击事件监听
    document.addEventListener('click', handleClickOutside);
    
    // 其他已存在的onMounted代码...
  });

  // 在onBeforeUnmount钩子中移除事件监听
  onBeforeUnmount(() => {
    // 移除点击事件监听
    document.removeEventListener('click', handleClickOutside);
    
    // 其他已存在的onBeforeUnmount代码...
  });

  // 添加清除搜索并关闭下拉框的函数
  const clearSearch = () => {
    artistSearchKeyword.value = '';
    showArtistSearchDropdown.value = false;
  };

  // 提交对话框表单
  const handleDialogSubmit = async () => {
    try {
      await formRef.value.validate();
      
      submitting.value = true;
      
      // 准备表单数据
      const formData = { ...albumForm };
      
      // 如果有新上传的封面图片，先上传封面
      if (albumForm.coverImageFile) {
        try {
          // 如果文件大于3MB，使用分片上传
          if (albumForm.coverImageFile.size > 3 * 1024 * 1024) {
            console.log('封面文件大小超过3MB，使用分片上传');
            
            const coverImagePath = await coverFunctions.uploadCoverImageInChunks(albumForm.coverImageFile);
            formData.coverImage = coverImagePath;
          } else {
            // 小文件使用直接Base64上传
            const fileReader = new FileReader();
            
            // 创建Promise等待文件读取完成
            const base64Data = await new Promise((resolve, reject) => {
              fileReader.onload = (e) => {
                // 获取Base64字符串，去掉前缀
                const base64 = e.target.result.split(',')[1];
                resolve(base64);
              };
              fileReader.onerror = (e) => {
                reject(new Error('文件读取失败'));
              };
              
              // 开始读取文件
              fileReader.readAsDataURL(albumForm.coverImageFile);
            });
            
            // 构建请求数据
            const requestData = {
              fileName: albumForm.coverImageFile.name,
              fileType: albumForm.coverImageFile.type,
              fileSize: albumForm.coverImageFile.size,
              fileData: base64Data
            };
            
            // 调用API上传封面图片
            const response = await axios.post(
              `${API_BASE_URL}/album-cover/${album.value.id}/base64`,
              requestData,
              {
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            
            formData.coverImage = response.data.coverImage;
          }
          
          // 释放Blob URL
          if (albumForm.coverImagePreview && albumForm.coverImagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(albumForm.coverImagePreview);
          }
        } catch (error) {
          console.error('上传封面图片失败:', error);
          ElMessage.error('上传封面图片失败: ' + (error.message || '未知错误'));
          submitting.value = false;
          return;
        }
      }
      
      // 删除不需要的字段
      delete formData.coverImageFile;
      delete formData.coverImagePreview;
      
      // 更新专辑信息
      await albumStore.updateAlbum(album.value.id, formData);
      
      // 重新获取专辑详情
      await fetchAlbumDetail();
      
      // 关闭对话框
      dialogVisible.value = false;
      
      ElMessage.success('专辑信息更新成功');
    } catch (error) {
      console.error('更新专辑信息失败:', error);
      ElMessage.error('更新专辑信息失败: ' + (error.message || '未知错误'));
    } finally {
      submitting.value = false;
    }
  };

  // 检测是否为移动设备
  const isMobile = computed(() => {
    return window.innerWidth <= 768;
  });

  // 在原有的onMounted和onBeforeUnmount钩子中添加窗口大小变化监听

  // 窗口大小变化处理函数
  const handleResize = () => {
    // 这里不需要额外逻辑，因为isMobile是计算属性，会自动更新
  };

  </script>
  
  <style scoped>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
@import url('/css/albumDetail.css');

/* 播放按钮样式 */
.play-btn {
  transition: all 0.3s ease;
}

.play-btn:hover:not(:disabled) {
  background-color: var(--garrix-black, #000000) !important;
  color: var(--garrix-white, #ffffff) !important;
  transform: scale(1.05);
}

.play-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.album-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.album-title {
  display: flex;
  align-items: center;
  gap: 12px;
}



/* 添加问题列表相关样式 */
:deep(.problems-list) {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 15px;
}

:deep(.problem-item) {
  display: flex;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  align-items: flex-start;
}

:deep(.problem-item.error) {
  background-color: rgba(245, 108, 108, 0.1);
  border-left: 4px solid #f56c6c;
}

:deep(.problem-item.warning) {
  background-color: rgba(255, 197, 87, 0.1);
  border-left: 4px solid #e6a23c;
}

:deep(.problem-item.info) {
  background-color: rgba(87, 173, 255, 0.1);
  border-left: 4px solid #409eff;
}

:deep(.problem-icon) {
  margin-right: 10px;
}

:deep(.problem-icon.error-icon)::before {
  content: "⛔";
  color: #f56c6c;
}

:deep(.problem-icon.warning-icon)::before {
  content: "⚠️";
  color: #e6a23c;
}

:deep(.problem-icon.info-icon)::before {
  content: "ℹ️";
  color: #409eff;
}

:deep(.problem-content) {
  flex: 1;
}

:deep(.problem-message) {
  font-weight: bold;
  margin-bottom: 5px;
}

:deep(.problem-location) {
  font-size: 12px;
  color: #666;
}

/* 编辑专辑对话框样式 */
:deep(.album-edit-dialog) {
  .el-dialog__body {
    padding: 30px;
  }
}

.album-edit-form {
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-bottom: 20px;
  }
  
  .form-left-column,
  .form-right-column {
    display: flex;
    flex-direction: column;
  }
  
  .full-width-select,
  .full-width-date-picker {
    width: 100%;
  }
  
  .description-textarea {
    width: 100%;
  }
  
  .album-cover-upload {
    display: flex;
    flex-direction: column;
    gap: 15px;
    
    .cover-preview {
      width: 100%;
      height: 240px;
      border: 1px dashed #dcdfe6;
      border-radius: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      background-color: #f5f7fa;
      
      .cover-preview-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      
      .no-cover {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #909399;
        
        .el-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
      }
    }
    
    .cover-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      
      .upload-tip {
        font-size: 12px;
        color: #909399;
      }
    }
  }
  
  .performers-section {
    margin-top: 20px;
    
    .performers-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      
      .search-box-container {
        position: relative;
        
        .performer-search-input {
          width: 100%;
          
          :deep(.el-input__suffix) {
            .clear-icon {
              color: #000000;
              cursor: pointer;
              
              &:hover {
                color: #000000;
              }
            }
          }
        }
        
        .search-tip {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          font-size: 12px;
          color: #909399;
          
          .wiki-link {
            color: #409eff;
            text-decoration: none;
            
            &:hover {
              text-decoration: underline;
            }
          }
        }
        
        .artist-search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background-color: #fff;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
          z-index: 10;
          max-height: 300px;
          overflow-y: auto;
          
          .search-dropdown-content {
            padding: 10px;
            
            .search-loading,
            .no-results {
              padding: 10px;
              text-align: center;
              color: #909399;
            }
            
            .search-results-list {
              .search-result-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                
                &:last-child {
                  border-bottom: none;
                }
                
                &:hover,
                &.active {
                  background-color: #f5f7fa;
                }
                
                .artist-info {
                  .artist-name {
                    font-weight: 500;
                  }
                  
                  .artist-realname {
                    font-size: 12px;
                    color: #909399;
                  }
                }
                
                .add-icon {
                  color: #409eff;
                }
              }
            }
          }
        }
      }
      
      .performers-cards {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        width: 100%;
        
        .performers-card-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          width: 100%;
        }
        
        .pf-card {
          display: flex;
          align-items: center;
          position: relative;
          background-color: white;
          border: 2px solid #000;
          padding: 8px 12px;
          margin: 5px 0;
          height: 40px;
          cursor: default;
          /* 关键修改：不再使用固定宽度，而是根据内容自适应宽度 */
          width: auto;
          
          .pf-number {
            position: absolute;
            left: -5px;
            top: -5px;
            width: 20px;
            height: 20px;
            background-color: #000;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
          }
          
          .pf-drag {
            cursor: move;
            margin-right: 10px;
            user-select: none;
          }
          
          .pf-name {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            }
            
          .pf-remove {
            margin-left: 10px;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            user-select: none;
            
            &:hover {
              color: #f56c6c;
            }
          }
        }
        
        .pf-add-card {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed #ccc;
          padding: 8px 12px;
          margin: 5px 0;
          height: 40px;
          cursor: pointer;
          gap: 5px;
          width: auto;
          min-width: 120px;
          
          &:hover {
            border-color: #000;
            background-color: #f5f5f5;
          }
          
          .pf-add-icon {
            font-size: 16px;
          }
          
          .pf-add-text {
            white-space: nowrap;
          }
        }
      }
    }
    
    .field-tip {
      margin-top: 10px;
      font-size: 12px;
      color: #909399;
    }
  }
}

/* 歌词文件状态指示器样式 */
.form-label-with-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.file-status-indicators {
  display: flex;
  gap: 8px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.status-indicator.uploaded {
  background-color: #f0f9ff;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.status-indicator.uploaded .el-icon {
  color: #059669;
}

.status-indicator.missing {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.status-indicator.missing .el-icon {
  color: #dc2626;
}

@media screen and (max-width: 768px) {
  .album-edit-form {
    .form-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }
  }

  :deep(.album-edit-dialog) {
    width: 90% !important;

    .el-dialog__body {
      padding: 15px;
    }
  }

  .form-label-with-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .file-status-indicators {
    align-self: flex-end;
  }
}
</style> 
  
