<template>
  <div class="flow-editor">
    <!-- 顶部栏 - 高级感三区布局 -->
    <div class="editor-header-premium">
      <!-- 左侧区域 -->
      <div class="header-zone left">
        <button
          class="garrix-btn"
          @click="router.push(`/albums/${route.params.id}`)"
        >
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
      </div>

      <!-- 中间区域 -->
      <div class="header-zone center">
        <el-image
          :src="album?.coverUrl || '/placeholder-album.png'"
          class="album-cover-premium"
          fit="cover"
          @click="(event) => openAlbumEditDialog(event)"
        />
        <div class="album-info-premium" @click="(event) => openAlbumEditDialog(event)">
          <div class="album-title-premium">{{ album?.title || '未命名专辑' }}</div>
          <div class="album-meta-premium">
            <span>发行: {{ formatDate(album?.releaseDate) }}</span>
            <span class="meta-separator"></span>
            <span :class="['status-badge-premium', getStatusClass(isDraft ? 'draft' : album?.status)]">
              {{ getStatusText(album?.status) }}
            </span>
        </div>
        </div>
      </div>

      <!-- 右侧区域 -->
      <div class="header-zone right">
        <button
          v-if="isDraft && album?.songs && album?.songs.length > 0"
          class="garrix-btn"
          @click="submitForReview"
        >
          <el-icon class="submit-icon"><Check /></el-icon>
          提交审核
        </button>
        <button
          v-else-if="album?.status === 'rejected'"
          class="garrix-btn garrix-btn-danger"
          @click="resubmitForReview"
        >
          <el-icon class="submit-icon"><RefreshRight /></el-icon>
          重新提交
        </button>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="editor-main">
      <!-- 添加连接点使用提示 -->
      <transition name="fade">
        <div class="connection-tips" v-if="connectionTipsVisible">
          <div class="tips-header">
            <el-icon><InfoFilled /></el-icon>
            <span>连接提示</span>
          </div>
          <div class="tips-content">
            <p>1. 每个节点四周的彩色点是连接点，可以拖拽创建连线</p>
            <p>2. 歌手节点可以连接到歌曲节点，表示该歌手是歌曲的表演者</p>
            <p>3. 连线颜色根据授权状态变化：<span class="auth-color">绿色</span>表示已授权，<span class="no-auth-color">红色</span>表示未授权</p>
            <p>4. 点击连线可以删除连接关系</p>
          </div>
          <div class="tips-footer">
            <el-checkbox v-model="doNotShowAgain" label="不再提示" size="small" />
            <el-button class="tips-close" link @click="hideConnectionTips">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>
      </transition>
      
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-animation">
          <div class="loading-circle"></div>
        </div>
        <span>正在加载专辑数据...</span>
      </div>
      
      <!-- 错误提示 -->
      <div v-else-if="!album" class="error-container">
        <el-empty description="无法加载专辑数据">
          <template #description>
            <p>加载专辑数据时出错</p>
          </template>
          <button class="garrix-btn" @click="fetchAlbumDetail">重试</button>
        </el-empty>
      </div>
      
      <!-- 流程图画布 -->
      <template v-else>
        <div class="flow-canvas-container" ref="flowWrapper" @drop="onDrop" @dragover="onDragOver">
          <vue-flow
            v-model="elements"
            :default-viewport="{ zoom: 0.85 }"
            :min-zoom="0.2"
            :max-zoom="2"
            :fit-view-on-init="true"
            :connectable="true"
            :connection-mode="'straight'"
            :connection-line-style="{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }"
            :is-valid-connection="isValidConnection"
            :snap-to-grid="false"
            :snap-grid="[20, 20]"
            :default-edge-options="{ type: 'smoothstep', animated: false }"
            class="flow-canvas"
            @node-click="handleNodeClick"
            @connect="handleConnect"
            @pane-click="handlePaneClick"
            @connection-start="handleConnectionStart"
            @connection-end="handleConnectionEnd"
            @edge-click="handleEdgeClick"
            @connect-start="onConnectStart"
            @connect-end="onConnectEnd"
            @nodes-change="onNodesChange"
            @node-drag-stop="saveNodePositions"
          >
            <Background :pattern-color="'#ddd'" gap="16" />
            <Controls position="top-right" />
            <MiniMap position="bottom-right" />
            
            <!-- 节点模板 -->
            <template #node-song="songProps">
              <div class="flow-node song-node">
                <div class="node-header">
                    <el-icon><Headset /></el-icon>
                  <div class="node-title">{{ songProps.data.label }}</div>
                  <el-button 
                    v-if="canEdit"
                    type="danger" 
                    size="small" 
                    circle 
                    class="delete-node-btn"
                    @click.stop="handleDeleteNode(songProps.id)"
                    title="删除节点"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                  </div>
                <div class="node-body">
                  <div class="file-info" :class="{ 'is-uploaded': songProps.data.wavFile }">
                    <span>音频文件</span>
                    <el-tag size="small" :type="songProps.data.wavFile ? 'success' : 'info'">{{ songProps.data.wavFile ? '已上传' : '未上传' }}</el-tag>
                  </div>
                  <div class="file-info" v-if="songProps.data.language !== '纯音乐'" :class="{ 'is-uploaded': songProps.data.lyricsFile }">
                    <span>歌词文件</span>
                    <el-tag size="small" :type="songProps.data.lyricsFile ? 'success' : 'info'">{{ songProps.data.lyricsFile ? '已上传' : '未上传' }}</el-tag>
                </div>
                  <div class="node-connection-tip">
                    <span>从四个方向的彩色点拖拽连接到其他节点</span>
              </div>
                </div>
              </div>
              <!-- 四个方向的连接把手 -->
              <Handle type="target" position="top" class="custom-handle input-handle-top" :id="`${songProps.id}-top`" />
              <Handle type="source" position="bottom" class="custom-handle output-handle-bottom" :id="`${songProps.id}-bottom`" />
              <Handle type="target" position="left" class="custom-handle input-handle-left" :id="`${songProps.id}-left`" />
              <Handle type="source" position="right" class="custom-handle output-handle-right" :id="`${songProps.id}-right`" />
              
              <!-- 连接点指示器 -->
              <div class="handle-indicator top-indicator">
                <el-icon><CaretTop /></el-icon>
                  </div>
              <div class="handle-indicator bottom-indicator">
                <el-icon><CaretBottom /></el-icon>
                </div>
              <div class="handle-indicator left-indicator">
                <el-icon><CaretLeft /></el-icon>
              </div>
              <div class="handle-indicator right-indicator">
                <el-icon><CaretRight /></el-icon>
              </div>
            </template>

            <!-- 修改歌手节点的模板，恢复水平布局 -->
            <template #node-artist="nodeProps">
              <div class="node artist-node">
                <div class="node-header">
                  <span>歌手</span>
                  <el-button 
                    v-if="canEdit"
                    type="danger" 
                    size="small" 
                    circle 
                    class="delete-node-btn"
                    @click.stop="handleDeleteNode(nodeProps.id)"
                    title="删除节点"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
              </div>
                <div class="node-content">
                  <div class="node-title" :title="nodeProps.data.label">{{ nodeProps.data.label }}</div>
                  <div v-if="nodeProps.data.realName" class="node-subtitle" :title="nodeProps.data.realName">{{ nodeProps.data.realName }}</div>
                  
                  <!-- 显示已授权歌曲信息 -->
                  <div v-if="nodeProps.data.authorizedSongs && nodeProps.data.authorizedSongs.length > 0" class="node-auth-songs">
                    <div class="auth-songs-title">已授权歌曲:</div>
                    <div v-for="song in nodeProps.data.authorizedSongs" :key="song.id" class="auth-song-item">
                      <span class="song-name" :title="song.title">{{ song.title }}</span>
                      <div class="song-actions">
                        <button class="garrix-btn" @click.stop="previewFile(song.authFile)">
                          查看
                        </button>
                        <button 
                          v-if="canEdit"
                          class="garrix-btn garrix-btn-danger"
                          @click.stop="deleteAuthFile(nodeProps.id, song.id)"
                        >
                          删除
                        </button>
                      </div>
                    </div>
            </div>

                  <!-- 显示待授权歌曲信息 - 修改为与已授权歌曲相同的布局 -->
                  <div v-if="nodeProps.data.pendingAuthSongs && nodeProps.data.pendingAuthSongs.length > 0" class="node-pending-songs">
                    <div class="pending-songs-title">待授权歌曲:</div>
                    <div v-for="song in nodeProps.data.pendingAuthSongs" :key="song.id" class="pending-song-item">
                      <span class="song-name" :title="song.title">{{ song.title }}</span>
                      <button 
                        v-if="canEdit"
                        class="garrix-btn garrix-btn-danger" 
                        @click.stop="triggerAuthFileUpload(nodeProps.id, song.id)"
                      >
                        上传
                      </button>
                </div>
                </div>
              </div>
              </div>
              <!-- 四个方向的连接把手 -->
              <Handle type="target" position="top" class="custom-handle input-handle-top" :id="`${nodeProps.id}-top`" />
              <Handle type="source" position="bottom" class="custom-handle output-handle-bottom" :id="`${nodeProps.id}-bottom`" />
              <Handle type="target" position="left" class="custom-handle input-handle-left" :id="`${nodeProps.id}-left`" />
              <Handle type="source" position="right" class="custom-handle output-handle-right" :id="`${nodeProps.id}-right`" />
              
              <!-- 连接点指示器 -->
              <div class="handle-indicator top-indicator">
                <el-icon><CaretTop /></el-icon>
              </div>
              <div class="handle-indicator bottom-indicator">
                <el-icon><CaretBottom /></el-icon>
              </div>
              <div class="handle-indicator left-indicator">
                <el-icon><CaretLeft /></el-icon>
              </div>
              <div class="handle-indicator right-indicator">
                <el-icon><CaretRight /></el-icon>
              </div>
            </template>

            <template #node-album="albumProps">
              <div class="flow-node album-node">
                <div class="node-header">
                  <el-icon><DataBoard /></el-icon>
                  <div class="node-title">{{ albumProps.data.label }}</div>
                  <!-- 专辑节点不允许删除 -->
                  <el-button 
                    v-if="canEdit && false"
                    type="danger" 
                    size="small" 
                    circle 
                    class="delete-node-btn"
                    @click.stop="handleDeleteNode(albumProps.id)"
                    title="删除节点"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <!-- 授权书状态 -->
                <div v-if="album?.authorizationFile" class="node-auth">
                  <el-tooltip content="专辑授权书已上传" placement="top">
                    <button class="garrix-btn" @click.stop="previewAlbumAuthFile(album.authorizationFile)">
                      <el-icon><Document /></el-icon> 查看授权书
                    </button>
                  </el-tooltip>
                </div>
                <div v-else class="node-auth missing">
                  <el-tooltip content="专辑授权书未上传" placement="top">
                    <span class="missing-auth">
                      <el-icon><Warning /></el-icon> 未上传授权书
                    </span>
                  </el-tooltip>
                  <button 
                    v-if="canEdit"
                    class="garrix-btn" 
                    @click.stop="triggerAlbumAuthFileUpload"
                  >
                    上传
                  </button>
                </div>
              </div>
            </template>

            <!-- 浮动节点属性面板 -->
            <Panel position="top-left" v-if="selectedNode" class="node-details-panel">
              <div class="node-properties-wrapper">
                <div class="panel-header">
                  <h4>节点属性</h4>
                  <el-button :icon="Close" circle size="small" @click="selectedNode = null" />
            </div>
              <div class="node-properties">
                  <!-- 专辑节点属性 -->
                  <template v-if="selectedNode.type === 'album'">
                    <el-descriptions :column="1" border size="small" title="专辑信息">
                      <template #extra>
                        <el-button type="primary" size="small" link @click="router.push(`/albums/${album.id}`)">编辑</el-button>
                      </template>
                      <el-descriptions-item label="类型">{{ selectedNode.data.type }}</el-descriptions-item>
                      <el-descriptions-item label="发行日期">{{ formatDate(selectedNode.data.releaseDate) }}</el-descriptions-item>
                      <el-descriptions-item label="发行外显">{{ selectedNode.data.displayInfo }}</el-descriptions-item>
                      <el-descriptions-item label="表演者">{{ selectedNode.data.performer }}</el-descriptions-item>
                      <el-descriptions-item label="简介">{{ selectedNode.data.description }}</el-descriptions-item>
                      <el-descriptions-item label="授权书状态">
                        <div class="auth-file-status">
                          <div class="file-info">
                            <el-icon v-if="album?.authorizationFile"><CircleCheck class="success-icon" /></el-icon>
                            <el-icon v-else><Warning class="warning-icon" /></el-icon>
                            <span>{{ album?.authorizationFile ? '已上传' : '未上传' }}</span>
                          </div>
                          <div class="auth-actions">
                            <button 
                              v-if="album?.authorizationFile" 
                              class="garrix-btn" 
                              @click="previewAlbumAuthFile(album?.authorizationFile)"
                            >
                              查看
                            </button>
                            <button 
                              v-if="album?.authorizationFile && canEdit" 
                              class="garrix-btn garrix-btn-danger" 
                              @click="deleteAlbumAuthFile(album?.id)"
                            >
                              删除
                            </button>
                            <button 
                              v-if="!album?.authorizationFile && canEdit" 
                              class="garrix-btn" 
                              @click="triggerAlbumAuthFileUpload"
                            >
                              上传授权书
                            </button>
                          </div>
                        </div>
                      </el-descriptions-item>
                    </el-descriptions>
                  </template>

                <!-- 歌曲节点属性 -->
                <template v-if="selectedNode.type === 'song'">
                  <el-form label-position="top" size="small">
                    <el-form-item label="歌曲名称">
                      <el-input v-model="selectedNode.data.label" />
                    </el-form-item>
                    <el-form-item label="风格">
                      <el-select v-model="selectedNode.data.genre" placeholder="请选择风格" style="width: 100%;">
                        <el-option v-for="genre in genres" :key="genre" :label="genre" :value="genre" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="语言">
                      <el-select v-model="selectedNode.data.language" placeholder="请选择语言">
                        <el-option label="中文" value="中文" />
                        <el-option label="英文" value="英文" />
                        <el-option label="纯音乐" value="纯音乐" />
                        <el-option label="其他语言" value="其他语言" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="音频文件">
                      <div class="file-upload-wrapper">
                        <div v-if="selectedNode.data.wavFile" class="file-status">
                          <div class="file-info">
                            <el-icon><Document /></el-icon>
                            <span class="file-status-text">已上传</span>
                          </div>
                          <button class="garrix-btn" @click="triggerWavUpload">更换</button>
                        </div>
                        <button v-else class="garrix-btn" @click="triggerWavUpload">上传</button>
                      </div>
                      <input ref="wavFileInput" type="file" @change="handleWavUpload" accept=".wav" style="display: none;" />
                    </el-form-item>
                    <el-form-item label="歌词文件 (LRC)" v-if="selectedNode.data.language !== '纯音乐'">
                      <div class="file-upload-wrapper">
                        <div v-if="selectedNode.data.lyricsFile" class="file-status">
                          <div class="file-info">
                            <el-icon><Document /></el-icon>
                            <span class="file-status-text">已上传</span>
                          </div>
                          <button class="garrix-btn" @click="triggerLyricsUpload">更换</button>
                        </div>
                        <button v-else class="garrix-btn" @click="triggerLyricsUpload">上传</button>
                      </div>
                      <input ref="lyricsFileInput" type="file" @change="handleLyricsUpload" accept=".lrc" style="display: none;" />
                    </el-form-item>
                    <!-- 新增：翻译歌词 -->
                    <el-form-item v-if="['英文', '其他语言'].includes(selectedNode.data.language)" label="翻译歌词文件 (LRC)">
                      <div class="file-upload-wrapper">
                        <div v-if="selectedNode.data.translationLyricsFile" class="file-status">
                          <div class="file-info">
                            <el-icon><Document /></el-icon>
                            <span class="file-status-text">已上传</span>
                          </div>
                          <button class="garrix-btn" @click="triggerTranslationLyricsUpload">更换</button>
                        </div>
                        <button v-else class="garrix-btn" @click="triggerTranslationLyricsUpload">上传</button>
                      </div>
                      <input ref="translationLyricsFileInput" type="file" @change="handleTranslationLyricsUpload" accept=".lrc" style="display: none;" />
                    </el-form-item>

                    <!-- 修改：关联歌手列表，添加拖拽排序功能 -->
                    <el-form-item label="关联歌手 (拖拽调整顺序)">
                      <div v-if="connectedArtists.length" class="artist-list-sortable">
                        <el-row :gutter="10">
                          <el-col v-for="(artist, index) in sortableArtists" :key="artist.id" :span="8">
                            <div 
                              class="artist-item"
                              draggable="true"
                              @dragstart="onArtistDragStart($event, index)"
                              @dragover.prevent
                              @drop="onArtistDrop($event, index)"
                            >
                              <el-icon><Rank /></el-icon>
                              <el-tag
                                type="info"
                                size="small"
                              >
                                {{ artist.data.label }}
                              </el-tag>
                            </div>
                          </el-col>
                        </el-row>
                        <div class="artist-order-tip">
                          <el-icon><InfoFilled /></el-icon>
                          <span>拖拽调整歌手顺序，排在前面的歌手将作为主要表演者</span>
                        </div>
                      </div>
                      <div v-else class="empty-text">
                        从右侧拖拽歌手节点并连接至此歌曲
                      </div>
                    </el-form-item>
                  </el-form>
                </template>

                <!-- 歌手节点属性 -->
                <template v-if="selectedNode.type === 'artist'">
                  <el-form label-position="top" size="small">
                    <el-form-item label="艺名">
                      <el-input v-model="selectedNode.data.label" />
                    </el-form-item>
                    <el-form-item label="真实姓名">
                      <el-input v-model="selectedNode.data.realName" />
                    </el-form-item>
                    
                    <!-- 显示已授权歌曲列表 -->
                    <el-form-item v-if="selectedNode.data.authorizedSongs && selectedNode.data.authorizedSongs.length > 0" label="已授权歌曲">
                      <div v-for="song in selectedNode.data.authorizedSongs" :key="song.id" class="auth-song-item-detail">
                        <div class="song-auth-info">
                          <span class="song-name">{{ song.title }}</span>
                        </div>
                        <div class="auth-actions">
                          <button class="garrix-btn" @click="previewFile(song.authFile)">
                            预览授权书
                          </button>
                          <button 
                            v-if="canEdit"
                            class="garrix-btn garrix-btn-danger"
                            @click="deleteAuthFile(selectedNode.id, song.id)"
                          >
                            删除授权书
                          </button>
                        </div>
                      </div>
                    </el-form-item>
                    
                    <!-- 显示待授权歌曲列表 -->
                    <el-form-item v-if="selectedNode.data.pendingAuthSongs && selectedNode.data.pendingAuthSongs.length > 0" label="待授权歌曲">
                      <div v-for="song in selectedNode.data.pendingAuthSongs" :key="song.id" class="pending-song-item-detail">
                        <div class="song-auth-info">
                          <span class="song-name">{{ song.title }}</span>
                        </div>
                        <div class="auth-actions">
                      <button 
                            v-if="canEdit"
                            class="garrix-btn garrix-btn-danger"
                            @click="triggerAuthFileUpload(selectedNode.id, song.id)"
                          >
                            上传授权书
                          </button>
                        </div>
                      </div>
                    </el-form-item>
                  </el-form>
                </template>
              </div>
              </div>
            </Panel>
          </vue-flow>
        </div>

        <!-- 右侧工具栏 - 减小宽度 -->
        <div class="editor-sidebar">
          <div class="sidebar-content">
            <div class="sidebar-header">可用节点</div>
            <div class="node-types">
              <div
                class="node-type song-node-type"
                draggable="true"
                @dragstart="onDragStart($event, 'song')"
              >
                <el-icon><Headset /></el-icon>
                <span>歌曲</span>
              </div>
              <div
                class="node-type artist-node-type"
                draggable="true"
                @dragstart="onDragStart($event, 'artist')"
              >
                <el-icon><User /></el-icon>
                <span>歌手</span>
              </div>
            </div>
            
            <!-- 歌手列表分区 -->
            <div class="sidebar-section">
              <div class="section-header">
                <span>歌手列表</span>
                <button class="garrix-btn" @click="showAddArtistDialog">
                  <el-icon><Plus /></el-icon>
                  添加新歌手
                </button>
              </div>
              
              <!-- 歌手搜索 -->
              <el-input
                v-model="artistSearchQuery"
                placeholder="搜索歌手"
                clearable
                size="small"
                prefix-icon="Search"
                class="artist-search"
                @input="filterArtists"
              />
              
              <!-- 歌手列表 -->
              <div class="artists-list" v-loading="artistsLoading">
                <div v-if="filteredArtistsList.length === 0 && !artistsLoading" class="empty-artists">
                  <el-empty description="暂无歌手" :image-size="60">
                    <button class="garrix-btn" @click="fetchArtistsList">刷新</button>
                  </el-empty>
                </div>
                <div 
                  v-for="artist in filteredArtistsList" 
                  :key="artist.id"
                  class="artist-item"
                  draggable="true"
                  @dragstart="onArtistItemDragStart($event, artist)"
                >
                  <div class="artist-info">
                    <span class="artist-name">{{ artist.name }}</span>
                    <span v-if="artist.realName" class="artist-realname">({{ artist.realName }})</span>
                  </div>
                  <button 
                    class="garrix-btn"
                    @click="addArtistToFlow(artist)"
                    title="添加到流程图"
                  >
                    <el-icon><Plus /></el-icon>
                    
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    
    <!-- 隐藏的文件上传输入 -->
    <input
      ref="coverFileInput"
      type="file"
      accept="image/jpeg,image/png,image/jpg"
      style="display: none;"
      @change="handleCoverFileSelected"
      id="coverFileInput"
    />
    
    <!-- 隐藏的授权书文件上传输入 -->
    <input
      ref="authFileInput"
      type="file"
      accept=".pdf"
      style="display: none;"
      @change="(event) => handleAuthFileUploadWithContext(event)"
      id="authFileInput"
    />

    <!-- 专辑信息编辑对话框 -->
    <el-dialog
      v-model="albumDialogVisible"
      title="编辑专辑信息"
      width="500px"
      destroy-on-close
      custom-class="album-edit-dialog"
    >
      <el-form label-position="top" size="small">
        <el-form-item label="专辑封面">
          <div 
            class="album-cover-wrapper"
            @click="handleDialogCoverClick"
            :class="{'is-clickable': canEdit}"
          >
            <img 
              :src="album?.coverUrl || '/placeholder-album.png'" 
              class="avatar" 
            />
            <div v-if="canEdit" class="cover-edit-overlay">
              <el-icon><Edit /></el-icon>
              <span>更换封面</span>
            </div>
          </div>
          <input
            ref="dialogCoverFileInput"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            style="display: none;"
            @change="handleDialogCoverFileSelected"
            id="dialogCoverFileInput"
          />
        </el-form-item>
        <el-form-item label="专辑名称">
          <el-input v-model="album.title" />
        </el-form-item>
        <el-form-item label="发行日期">
          <el-date-picker
            v-model="album.releaseDate"
            type="date"
            placeholder="选择日期"
          />
        </el-form-item>
        <el-form-item label="专辑简介">
          <el-input
            type="textarea"
            v-model="album.description"
            :rows="4"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <button class="garrix-btn garrix-btn-danger" @click="albumDialogVisible = false">取消</button>
          <button class="garrix-btn" @click="saveAlbumInfo">保存</button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 添加PDF预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="授权文件预览"
      width="80%"
      destroy-on-close
    >
      <div class="pdf-preview-container">
        <iframe 
          v-if="previewUrl" 
          :src="previewUrl" 
          class="pdf-preview-iframe" 
          @load="previewLoaded = true"
          @error="handlePreviewError"
        ></iframe>
        <div v-else-if="previewError" class="preview-error">
          <el-icon><CircleClose /></el-icon>
          <span>{{ previewError }}</span>
        </div>
        <div v-else class="preview-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载预览中...</span>
        </div>
      </div>
    </el-dialog>

    <!-- 添加歌手对话框 -->
    <el-dialog
      v-model="addArtistDialogVisible"
      title="添加新歌手"
      width="50%"
      destroy-on-close
    >
      <el-form
        ref="addArtistFormRef"
        :model="addArtistForm"
        :rules="addArtistRules"
        label-width="120px"
      >
        <el-form-item label="艺名" prop="name">
          <el-input v-model="addArtistForm.name" />
        </el-form-item>
        <el-form-item label="实名" prop="realName">
          <el-input v-model="addArtistForm.realName" />
        </el-form-item>
        <el-form-item label="身份证号码" prop="id_number">
          <el-input 
            v-model="addArtistForm.id_number" 
            maxlength="18"
            placeholder="请输入18位身份证号码"
          />
        </el-form-item>
        
        <el-divider>平台链接</el-divider>
        
        <el-form-item label="网易云音乐" prop="platforms.netease">
          <div class="input-with-icon">
            <img src="/网易云.svg" alt="网易云音乐" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.netease" 
              placeholder="https://music.163.com/#/artist?id=xxxxx"
              @input="() => validateArtistPlatformUrl('netease')"
              :status="!addArtistForm.platformsValid.netease && addArtistForm.platforms.netease ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.netease && addArtistForm.platforms.netease" class="link-validation-tip">
            格式错误，正确格式: https://music.163.com/#/artist?id=12345
          </div>
        </el-form-item>
        
        <el-form-item label="QQ音乐" prop="platforms.qq">
          <div class="input-with-icon">
            <img src="/QQ音乐.svg" alt="QQ音乐" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.qq" 
              placeholder="https://y.qq.com/n/ryqq/singer/xxxxx"
              @input="() => validateArtistPlatformUrl('qq')"
              :status="!addArtistForm.platformsValid.qq && addArtistForm.platforms.qq ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.qq && addArtistForm.platforms.qq" class="link-validation-tip">
            格式错误，正确格式: https://y.qq.com/n/ryqq/singer/002J4UUk29y8BY
          </div>
        </el-form-item>
        
        <el-form-item label="酷狗音乐" prop="platforms.kugou">
          <div class="input-with-icon">
            <img src="/酷狗音乐.svg" alt="酷狗音乐" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.kugou" 
              placeholder="https://www.kugou.com/singer/xxxxx"
              @input="() => validateArtistPlatformUrl('kugou')"
              :status="!addArtistForm.platformsValid.kugou && addArtistForm.platforms.kugou ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.kugou && addArtistForm.platforms.kugou" class="link-validation-tip">
            格式错误，正确格式: https://www.kugou.com/singer/xxxxx
          </div>
        </el-form-item>
        
        <el-form-item label="酷我音乐" prop="platforms.kuwo">
          <div class="input-with-icon">
            <img src="/酷我音乐.svg" alt="酷我音乐" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.kuwo" 
              placeholder="https://kuwo.cn/singer_detail/xxxxx"
              @input="() => validateArtistPlatformUrl('kuwo')"
              :status="!addArtistForm.platformsValid.kuwo && addArtistForm.platforms.kuwo ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.kuwo && addArtistForm.platforms.kuwo" class="link-validation-tip">
            格式错误，正确格式: https://kuwo.cn/singer_detail/12345
          </div>
        </el-form-item>
        
        <el-form-item label="汽水音乐" prop="platforms.qishui">
          <div class="input-with-icon">
            <img src="/汽水音乐.svg" alt="汽水音乐" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.qishui" 
              placeholder="https://qishui.douyin.com/s/xxxxx"
              @input="() => validateArtistPlatformUrl('qishui')"
              :status="!addArtistForm.platformsValid.qishui && addArtistForm.platforms.qishui ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.qishui && addArtistForm.platforms.qishui" class="link-validation-tip">
            格式错误，正确格式: https://qishui.douyin.com/s/abcde
          </div>
        </el-form-item>
        
        <el-form-item label="Spotify" prop="platforms.spotify">
          <div class="input-with-icon">
            <img src="/Spotify.svg" alt="Spotify" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.spotify" 
              placeholder="https://open.spotify.com/artist/xxxxx"
              @input="() => validateArtistPlatformUrl('spotify')"
              :status="!addArtistForm.platformsValid.spotify && addArtistForm.platforms.spotify ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.spotify && addArtistForm.platforms.spotify" class="link-validation-tip">
            格式错误，正确格式: https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF
          </div>
        </el-form-item>
        
        <el-form-item label="YouTube" prop="platforms.youtube">
          <div class="input-with-icon">
            <img src="/youtube.svg" alt="YouTube" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.youtube" 
              placeholder="https://music.youtube.com/channel/xxxxx"
              @input="() => validateArtistPlatformUrl('youtube')"
              :status="!addArtistForm.platformsValid.youtube && addArtistForm.platforms.youtube ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.youtube && addArtistForm.platforms.youtube" class="link-validation-tip">
            格式错误，正确格式: https://music.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ
          </div>
        </el-form-item>
        
        <el-form-item label="Apple Music" prop="platforms.appleMusic">
          <div class="input-with-icon">
            <img src="/applemusic.svg" alt="Apple Music" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.appleMusic" 
              placeholder="https://music.apple.com/cn/artist/xxxxx"
              @input="() => validateArtistPlatformUrl('appleMusic')"
              :status="!addArtistForm.platformsValid.appleMusic && addArtistForm.platforms.appleMusic ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.appleMusic && addArtistForm.platforms.appleMusic" class="link-validation-tip">
            格式错误，正确格式: https://music.apple.com/cn/artist/artist-name/12345
          </div>
        </el-form-item>
        
        <el-form-item label="SoundCloud" prop="platforms.soundCloud">
          <div class="input-with-icon">
            <img src="/soundcloud.svg" alt="SoundCloud" class="input-icon" />
            <el-input 
              v-model="addArtistForm.platforms.soundCloud" 
              placeholder="https://soundcloud.com/xxxxx"
              @input="() => validateArtistPlatformUrl('soundCloud')"
              :status="!addArtistForm.platformsValid.soundCloud && addArtistForm.platforms.soundCloud ? 'error' : ''"
            />
          </div>
          <div v-if="!addArtistForm.platformsValid.soundCloud && addArtistForm.platforms.soundCloud" class="link-validation-tip">
            格式错误，正确格式: https://soundcloud.com/artist-name
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <button class="garrix-btn garrix-btn-danger" @click="addArtistDialogVisible = false">取消</button>
          <button class="garrix-btn" @click="submitNewArtist" :disabled="addingArtist">
            <span v-if="addingArtist">处理中...</span>
            <span v-else>创建</span>
          </button>
        </span>
      </template>
    </el-dialog>

    <!-- 苹果风格问题面板 -->
    <div class="problems-panel" :class="{ 'collapsed': problemsPanelCollapsed }" v-if="problemsVisible">
      <div class="panel-header" @click="toggleProblemsPanelCollapse">
        <h4>
          问题检测
          <span class="problem-count" :class="{ 'has-errors': hasErrors }">
            {{ problemCount }}
          </span>
        </h4>
        <div class="panel-actions">
          <el-button link @click.stop="refreshProblems" title="刷新问题">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button link @click.stop="toggleProblemsPanelCollapse" title="展开/折叠面板">
            <el-icon class="panel-arrow-icon" :class="{'panel-arrow-up': !problemsPanelCollapsed, 'panel-arrow-down': problemsPanelCollapsed}">
              <ArrowDown />
            </el-icon>
          </el-button>
          <el-button link @click.stop="problemsVisible = false" title="关闭面板">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
      <transition name="problems-list">
        <div class="problems-list" v-if="!problemsPanelCollapsed">
          <template v-if="problems.length === 0">
            <div class="no-problems">
              <el-icon><CircleCheck /></el-icon>
              <span>所有检查通过</span>
            </div>
          </template>
          <template v-else>
            <div 
              v-for="(problem, index) in sortedProblems" 
              :key="index" 
              class="problem-item"
              :class="{
                'error': problem.level === 'error',
                'warning': problem.level === 'warning',
                'info': problem.level === 'info'
              }"
              @click="navigateToNode(problem)"
            >
              <div class="problem-icon">
                <el-icon v-if="problem.level === 'error'"><CircleClose /></el-icon>
                <el-icon v-else-if="problem.level === 'warning'"><Warning /></el-icon>
                <el-icon v-else><InfoFilled /></el-icon>
              </div>
              <div class="problem-content">
                <div class="problem-message">{{ problem.message }}</div>
                <div class="problem-location">{{ problem.location }}</div>
              </div>
              <div class="problem-actions" v-if="problem.fixable">
                <button 
                  class="garrix-btn" 
                  @click.stop="applyQuickFix(problem)"
                  title="快速修复"
                >
                  修复
                </button>
              </div>
            </div>
          </template>
        </div>
              </transition>
      </div>
      
      <!-- Photoshop风格状态栏 -->
      <div class="status-bar">
        <div class="status-left">
          <div 
            class="status-message" 
            v-if="statusMessage" 
            @click="handleStatusMessageClick"
            :class="{ 'clickable': statusMessage.includes('检测完成') }"
          >
            <div class="status-text">{{ statusMessage }}</div>
          </div>
        </div>
        <div class="status-right">
          <div class="status-info">
            <span>{{ elements.filter(el => el.type === 'song').length }} 首歌曲</span>
            <span class="separator">|</span>
            <span>{{ elements.filter(el => el.type === 'artist').length }} 位歌手</span>
            <span class="separator">|</span>
            <span>{{ getEdgesCount() }} 个连接</span>
                        <span class="separator">|</span>
            <span>授权书 {{ getAuthFileCount() }}/{{ getTotalRequiredAuthFiles() }}</span>
          </div>
        </div>
      </div>
    </div>
  </template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VueFlow, useVueFlow, Panel, Handle } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls'; // 添加控制组件
import { MiniMap } from '@vue-flow/minimap'; // 添加小地图组件
import { createCoverFunctions } from '@/utils/support/AlbumDetail/cover'; // 导入封面处理函数

// 导入样式
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css'; // 控制组件样式
import '@vue-flow/minimap/dist/style.css'; // 小地图样式
import '@/assets/css/problemsPanelAnimation.css'; // 导入问题面板动画样式
import { Document, Headset, User, Plus, Loading, Close, DataBoard, ArrowLeft, CaretTop, CaretBottom, CaretLeft, CaretRight, InfoFilled, Rank, CircleClose, View, Warning, Upload, Delete, Search, Refresh, CircleCheck, ArrowUp, ArrowDown, Edit, Check, RefreshRight } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import { API_BASE_URL, STATIC_BASE_URL } from '@/config';
import { genres, validatePlatformUrl } from '@/utils/constants'; // 导入风格列表和平台链接验证函数
import draggable from 'vuedraggable'; // 导入拖拽插件
import rightsChainService from '@/services/rightsChainService'; // 导入权利链条服务
import { saveNodesPositions } from '../services/api';
import api from '../services/api'; // 导入API实例
import * as authorizationService from '@/utils/authorizationService'; // 导入授权服务

const route = useRoute();
const router = useRouter();

// 添加canEdit变量，默认为true，表示可以编辑
const canEdit = ref(true);

// 状态
const album = ref(null);
const elements = ref([]);
const selectedNode = ref(null);
const selectedEdge = ref(null); // 添加选中的边状态
const albumDialogVisible = ref(false);
const activeCollapse = ref(['nodes']);
const flowWrapper = ref(null);
const loading = ref(false);
const wavFileInput = ref(null);
const lyricsFileInput = ref(null);
const translationLyricsFileInput = ref(null); // 为翻译歌词添加 ref
const authFileInput = ref(null); // 为授权书上传添加 ref
const coverFileInput = ref(null); // 为封面上传添加 ref
const dialogCoverFileInput = ref(null); // 为对话框中的封面上传添加 ref

// 存储当前授权上传的上下文
const authUploadContext = ref({
  artistNodeId: null,
  songId: null
});

// 添加预览相关的状态
const previewDialogVisible = ref(false);
const previewUrl = ref('');
const previewLoaded = ref(false);
const previewError = ref(null);
const submitting = ref(false); // 添加提交状态变量
  
  // 添加状态栏相关的状态
  const statusMessage = ref('');
  const statusMessageTimer = ref(null);
  
  // 清除状态消息
  const clearStatusMessage = () => {
    statusMessage.value = '';
    if (statusMessageTimer.value) {
      clearTimeout(statusMessageTimer.value);
      statusMessageTimer.value = null;
    }
  };
  
  // 处理状态消息点击事件
  const handleStatusMessageClick = () => {
    // 只有检测完成的消息才响应点击事件
    if (statusMessage.value && statusMessage.value.includes('检测完成')) {
      showProblemsPanel();
    }
  };
  
  // 显示问题面板
  const showProblemsPanel = () => {
    // 展开问题面板
    problemsPanelCollapsed.value = false;
    
    // 确保问题面板可见
    problemsVisible.value = true;
    
    // 添加高亮动画效果
    const panel = document.querySelector('.problems-panel');
    if (panel) {
      panel.classList.add('highlight-panel');
      setTimeout(() => {
        panel.classList.remove('highlight-panel');
      }, 1000);
    }
    
    // 滚动到问题面板
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  // 计算连接数的函数
  const getEdgesCount = () => {
    return elements.value.filter(el => el.source && el.target).length;
  };
  
  // 计算授权文件数量
  const getAuthFileCount = () => {
    let count = 0;
    // 计算专辑授权文件
    if (album.value && album.value.authorizationFile) {
      count++;
    }
    
    // 计算歌手授权文件（从歌手节点获取）
    const artistNodes = elements.value.filter(el => el.type === 'artist');
    for (const artistNode of artistNodes) {
      if (artistNode.data.authorizedSongs && artistNode.data.authorizedSongs.length > 0) {
        // 每个歌手只计算一个授权书，不管关联了多少歌曲
        count++;
      }
    }
    
    return count;
  };
  
  // 计算需要的授权文件总数
  const getTotalRequiredAuthFiles = () => {
    let count = 1; // 专辑授权文件
    
    // 计算歌手数量（每个歌手需要一个授权书）
    const artistNodes = elements.value.filter(el => el.type === 'artist');
    count += artistNodes.length;
    
    return count;
  };
  
  // Vue Flow 核心功能
const { onConnect, addEdges, getConnectedEdges, findNode, removeEdges, addNodes, project, fitView } = useVueFlow();

// 初始化封面处理相关函数
const {
  handleCoverChange,
  uploadCoverImage,
  handleCoverFileSelected,
  handleDialogCoverChange,
  triggerCoverUpload
} = createCoverFunctions(album, {}, submitting);

// 监听album.coverImage的变化，确保顶部栏封面图片同步更新
watch(() => album.value?.coverImage, (newCoverImage) => {
  if (newCoverImage && album.value) {
    // 更新顶部栏封面URL
    album.value.coverUrl = `${STATIC_BASE_URL}/${newCoverImage}`;
    console.log('监听到封面变化，已更新顶部栏封面URL:', album.value.coverUrl);
  }
});

// 添加连接状态变量
const isConnecting = ref(false);
const connectionSource = ref(null);

// 添加一个标志变量，用于跟踪连接是否已处理
const connectionHandled = ref(false);

// 添加连接处理函数
const handleConnectionStart = (event) => {
  isConnecting.value = true;
  connectionSource.value = event.source;
  
  // 获取源节点类型
  const sourceNode = findNode(event.source);
  if (sourceNode) {
    // 根据节点类型高亮可连接的目标节点
    const targetType = sourceNode.type === 'artist' ? 'song' : 'artist';
    
    // 设置所有目标类型节点高亮
    elements.value.forEach(el => {
      if (el.type === targetType) {
        el.class = 'highlight-node';
      }
    });
  }
  
  // 移除连接开始时的提示，避免与连接成功时的提示重复
};

const handleConnectionEnd = () => {
  isConnecting.value = false;
  connectionSource.value = null;
  
  // 移除所有节点的高亮状态
  elements.value.forEach(el => {
    if (el.class === 'highlight-node') {
      el.class = '';
    }
  });
  
  // 更新UI
  elements.value = [...elements.value];
};

let dndId = 0;
function getDndId() {
  return `dndnode_${dndId++}`;
}

function onDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onDrop(event) {
  event.preventDefault();
  
  // 检查是否是歌手拖拽
  const isArtistDrag = event.dataTransfer?.getData('application/vueflow-artist');
  
  if (isArtistDrag === 'true') {
    try {
      // 获取歌手数据
      const artistData = JSON.parse(event.dataTransfer?.getData('application/json'));
      
      if (!artistData || !artistData.id) {
        console.error('无效的歌手数据');
        return;
      }
      
      // 获取放置位置
      const { left, top } = flowWrapper.value.getBoundingClientRect();
      const position = project({
        x: event.clientX - left,
        y: event.clientY - top,
      });
      
      // 创建新的歌手节点
      const newArtistNode = {
        id: `artist-${artistData.id}`,
        type: 'artist',
        position,
        data: {
          id: artistData.id,
          label: artistData.name,
          realName: artistData.realName || '',
          authorizedSongs: [],
          pendingAuthSongs: [],
          pendingAuthCount: 0,
          platforms: artistData.platforms || {
            netease: artistData.netease || '',
            qq: artistData.qq || '',
            kugou: artistData.kugou || '',
            kuwo: artistData.kuwo || '',
            spotify: artistData.spotify || '',
            youtube: artistData.youtube || '',
            appleMusic: artistData.appleMusic || '',
            soundCloud: artistData.soundCloud || ''
          }
        }
      };
      
      // 检查节点是否已存在
      const existingNode = elements.value.find(el => el.id === newArtistNode.id);
      if (existingNode) {
        ElMessage.warning(`歌手 "${artistData.name}" 已存在于流程图中`);
        return;
      }
      
      // 添加节点到Vue Flow
      addNodes([newArtistNode]);
      elements.value.push(newArtistNode);
      
      // 保存节点位置
      saveNodePositions();
      
      ElMessage.success(`已添加歌手 "${artistData.name}" 到流程图`);
    } catch (error) {
      console.error('处理歌手拖拽失败:', error);
    }
    return;
  }
  
  // 原有的节点类型拖拽处理
  const type = event.dataTransfer?.getData('application/vueflow');

  if (!type || !flowWrapper.value) {
    return;
  }

  const { left, top } = flowWrapper.value.getBoundingClientRect();

  const position = project({
    x: event.clientX - left,
    y: event.clientY - top,
  });

  // 创建新节点
  if (type === 'song') {
    // 创建新歌曲并保存到后端
    createNewSong(position);
  } else if (type === 'artist') {
    // 创建新歌手并保存到后端
    createNewArtist(position);
  }
}

// 创建新歌曲并保存到后端
const createNewSong = async (position) => {
  try {
    loading.value = true;
    
    // 准备新歌曲数据
    const newSongData = {
      albumId: album.value.id,
      title: '新歌曲',
      language: '中文',
      genre: '未知',
      // 不需要上传WAV文件，后端API需要支持无文件创建
      noWavFile: true // 标记为无WAV文件创建模式
    };
    
    // 调用API创建新歌曲
    const response = await api.post(`/albums/${album.value.id}/songs`, newSongData);
    const newSong = response.data;
    
    if (newSong && newSong.id) {
      // 创建成功，添加到流程图
      const newSongNode = {
        id: `song-${newSong.id}`,
        type: 'song',
        position,
        data: {
          id: newSong.id,
          label: newSong.title || '新歌曲',
          language: newSong.language || '中文',
          wavFile: null,
          lyricsFile: null,
          genre: newSong.genre || '未知',
          Artists: []
        }
      };
      
      // 添加从专辑到新歌曲的连接线
      const edgeAlbumToSong = {
        id: `edge-album-${album.value.id}-song-${newSong.id}`,
        source: `album-${album.value.id}`,
        target: newSongNode.id,
        animated: true,
        style: { stroke: '#4f46e5' }
      };
      
      // 添加节点和连接线到Vue Flow
      addNodes([newSongNode]);
      addEdges([edgeAlbumToSong]);
      
      // 同时添加到elements数组，确保节点和边能够正确显示
      elements.value.push(newSongNode);
      elements.value.push(edgeAlbumToSong);
      
      // 强制更新视图
      elements.value = [...elements.value];
      
      // 更新专辑数据中的歌曲列表
      if (!album.value.songs) {
        album.value.songs = [];
      }
      album.value.songs.push(newSong);
      
      // 保存节点位置
      saveNodePositions();
      
      ElMessage.success('新歌曲创建成功');
    } else {
      ElMessage.error('创建歌曲失败');
    }
  } catch (error) {
    console.error('创建新歌曲失败:', error);
    ElMessage.error('创建歌曲失败: ' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
  }
};

// 创建新歌手并保存到后端
const createNewArtist = async (position) => {
  try {
    loading.value = true;
    
    // 准备新歌手数据
    const newArtistData = {
      name: '新歌手',
      realName: ''
    };
    
    // 调用API创建新歌手
    const response = await api.post(`/artists`, newArtistData);
    const newArtist = response.data;
    
    if (newArtist && newArtist.id) {
      // 创建成功，添加到流程图
      const newArtistNode = {
        id: `artist-${newArtist.id}`,
        type: 'artist',
        position,
        data: {
          id: newArtist.id,
          label: newArtist.name || '新歌手',
          realName: newArtist.realName || '',
          authFile: null,
          authorizedSongs: [],
          pendingAuthSongs: [],
          pendingAuthCount: 0
        }
      };
      
      // 添加节点到Vue Flow
      addNodes([newArtistNode]);
      
      // 同时添加到elements数组，确保节点能够正确显示
      elements.value.push(newArtistNode);
      
      // 强制更新视图
      elements.value = [...elements.value];
      
      // 保存节点位置
      saveNodePositions();
      
      ElMessage.success('新歌手创建成功');
    } else {
      ElMessage.error('创建歌手失败');
    }
  } catch (error) {
    console.error('创建新歌手失败:', error);
    ElMessage.error('创建歌手失败: ' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
  }
};

// 计算属性
const uploadUrl = computed(() => `${STATIC_BASE_URL}/upload`);

// 判断专辑是否是草稿状态
const isDraft = computed(() => {
  if (!album.value) return false;
  return album.value.isDraft || album.value.comment === 'DRAFT: 尚未提交审核';
});

const getFileName = (filePath) => {
  console.log('获取文件名:', filePath);
  
  if (!filePath) return '未知文件';
  
  // 如果filePath不是字符串，返回一个默认值
  if (typeof filePath !== 'string') {
    console.warn('文件路径不是字符串:', filePath);
    return '已上传文件';
  }
  
  // 如果filePath是一个标记值，直接返回
  if (filePath === '已上传') {
    return '已上传文件';
  }
  
  try {
    // 尝试从路径中提取文件名
    const fileName = filePath.split(/[/\\]/).pop();
    console.log('提取的文件名:', fileName);
    return fileName || '未知文件';
  } catch (error) {
    console.error('提取文件名时出错:', error);
    return '已上传文件';
  }
};

// 方法
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
  // 使用计算属性检查是否是草稿状态
  if (isDraft.value) {
    return '草稿';
  }
  
  const texts = {
    draft: '草稿',
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return texts[status] || '草稿';
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('zh-CN');
};

// 获取专辑详情
const fetchAlbumDetail = async () => {
  loading.value = true;
  try {
    console.log('开始获取专辑详情...');
    const response = await api.get(`/albums/${route.params.id}`);
    album.value = response.data;
    console.log('获取到的专辑数据:', album.value);
    
    // 获取权利链条信息，用于确定每个歌曲-歌手组合的授权状态
    let rightsChainData = null;
    try {
      // 尝试使用缓存或刷新权利链条数据
      rightsChainData = await refreshRightsChainCache();
      console.log('获取到的权利链条数据:', rightsChainData);
    } catch (error) {
      console.error('获取权利链条数据失败:', error);
    }
    
    // 解析保存的节点位置信息
    let savedPositions = {};
    if (album.value.nodesPositions) {
      try {
        const positionsArray = JSON.parse(album.value.nodesPositions);
        positionsArray.forEach(item => {
          savedPositions[item.id] = item.position;
        });
        console.log('加载保存的节点位置:', savedPositions);
      } catch (error) {
        console.error('解析节点位置数据失败:', error);
      }
    } else {
            console.log('没有保存的节点位置数据');
      }
      
      // 尝试从localStorage加载边信息
      let savedEdges = [];
      try {
        const localEdgesKey = `album-${album.value.id}-edges`;
        const localEdgesData = localStorage.getItem(localEdgesKey);
        if (localEdgesData) {
          savedEdges = JSON.parse(localEdgesData);
          console.log('从localStorage加载边信息:', savedEdges);
        } else {
          console.log('localStorage中没有保存的边信息');
        }
      } catch (error) {
        console.error('从localStorage加载边信息失败:', error);
      }
      
      // 重置elements数组
    elements.value = [];
    
    // 创建专辑节点（使用保存的位置或默认位置）
    const albumNodeId = `album-${album.value.id}`;
    const albumNode = {
      id: albumNodeId,
      type: 'album',
      position: savedPositions[albumNodeId] || { x: 0, y: 200 },
      data: {
        label: album.value.title,
        // 添加所有专辑详细信息
        title: album.value.title,
        type: album.value.type,
        releaseDate: album.value.releaseDate,
        displayInfo: album.value.displayInfo,
        performer: album.value.performer,
        description: album.value.description,
        coverUrl: album.value.coverImage ? `${STATIC_BASE_URL}/${album.value.coverImage}` : null,
        status: album.value.status,
        isDraft: album.value.isDraft,
        submittedById: album.value.submittedById,
        songs: album.value.songs
      }
    };
    elements.value.push(albumNode);
    
    // 创建歌曲节点
    if (album.value.songs && album.value.songs.length > 0) {
      console.log('处理歌曲节点，共有歌曲数量:', album.value.songs.length);
      for (let index = 0; index < album.value.songs.length; index++) {
        const song = album.value.songs[index];
        console.log(`处理第${index+1}首歌曲:`, song.title, '歌手数据:', song.Artists, '歌手JSON:', song.artists);
        
        // 歌曲节点（使用保存的位置或默认位置）
        const songNodeId = `song-${song.id}`;
        const songNode = {
          id: songNodeId,
          type: 'song',
          position: savedPositions[songNodeId] || { x: 300, y: 100 + index * 120 },
          data: {
            id: song.id,
            label: song.title,
            genre: song.genre || '',
            language: song.language || '',
            wavFile: song.wavFile,
            lyricsFile: song.lyricsFile,
            translationLyricsFile: song.translationLyricsFile,
            Artists: song.Artists || []
          }
        };
        elements.value.push(songNode);
        
        // 添加从专辑到歌曲的连接线
        const edgeAlbumToSong = {
          id: `edge-album-${album.value.id}-song-${song.id}`,
          source: albumNode.id,
          target: songNode.id,
          animated: true,
          style: { stroke: '#4f46e5' }
        };
        elements.value.push(edgeAlbumToSong);
        
        // 为每首歌曲创建对应的歌手节点
        // 首先检查song.Artists是否存在，如果不存在，尝试从song.artists (JSON字符串或数组) 获取
        let artistsArray = [];
        
        if (song.Artists && Array.isArray(song.Artists) && song.Artists.length > 0) {
          console.log(`歌曲 "${song.title}" 有 ${song.Artists.length} 个歌手对象`);
          artistsArray = song.Artists;
        } else if (song.artists) {
          // 尝试解析JSON字符串或直接使用数组
          try {
            if (typeof song.artists === 'string') {
              artistsArray = JSON.parse(song.artists);
              console.log(`从JSON字符串解析到 ${artistsArray.length} 个歌手`);
            } else if (Array.isArray(song.artists)) {
              artistsArray = song.artists;
              console.log(`从artists数组获取到 ${artistsArray.length} 个歌手`);
            }
          } catch (error) {
            console.error(`解析歌曲 "${song.title}" 的歌手JSON失败:`, error);
          }
        }
        
        if (artistsArray.length > 0) {
          console.log(`处理歌曲 "${song.title}" 的歌手节点，数量: ${artistsArray.length}`);
          
          // 使用Promise.all等待所有歌手节点处理完成
          await Promise.all(artistsArray.map((artist, artistIndex) => 
            processArtistNode(artist, artistIndex, song, songNode, rightsChainData, savedPositions)
          ));
        } else {
          console.warn(`歌曲 "${song.title}" 没有关联的歌手数据`);
        }
      }
    }
    
    console.log('生成的流程图元素:', elements.value);
    
    // 在生成完节点后，恢复保存的边信息
    if (savedEdges && savedEdges.length > 0) {
      console.log('恢复保存的边信息:', savedEdges);
      
      savedEdges.forEach(savedEdge => {
        // 检查源节点和目标节点是否存在
        const sourceNode = elements.value.find(el => el.id === savedEdge.source);
        const targetNode = elements.value.find(el => el.id === savedEdge.target);
        
        if (sourceNode && targetNode) {
          // 检查是否已经存在相同的边
          const existingEdge = elements.value.find(el => 
            el.id === savedEdge.id || 
            (el.source === savedEdge.source && el.target === savedEdge.target)
          );
          
          if (!existingEdge) {
            // 创建边并添加到elements
            const edge = {
              id: savedEdge.id,
              source: savedEdge.source,
              target: savedEdge.target,
              sourceHandle: savedEdge.sourceHandle,
              targetHandle: savedEdge.targetHandle,
              type: savedEdge.type || 'smoothstep',
              animated: false,
              label: savedEdge.data?.label || '表演者',
              style: savedEdge.style || { 
                stroke: savedEdge.data?.hasAuthorization ? '#10b981' : '#ef4444', 
                strokeWidth: 2 
              },
              data: savedEdge.data || {}
            };
            
            elements.value.push(edge);
            console.log('恢复边:', edge);
          }
        }
      });
    }
    
    // 更新UI
          nextTick(() => {
        fitView({ padding: 0.2 });
        
        // 显示流程图已加载的状态消息
        showStatusMessage('流程图已加载');
      });
    
  } catch (err) {
    console.error('获取专辑详情失败:', err);
    ElMessage.error('获取专辑详情失败');
  } finally {
    loading.value = false;
  }
};

// 处理单个歌手节点的创建或更新
const processArtistNode = async (artist, artistIndex, song, songNode, rightsChainData, savedPositions) => {
  // 提取艺术家ID - 处理各种可能的格式
  let artistId;
  
  // 记录原始数据以便调试
  console.log(`处理歌手数据:`, artist);
  
  // 处理各种可能的ID格式
  if (typeof artist === 'number') {
    // 如果artist直接是一个数字ID
    artistId = artist;
    console.log(`歌手数据是纯数字ID: ${artistId}`);
    
    // 创建临时artist对象
    artist = {
      id: artistId,
      name: `歌手#${artistId}`,
      realName: ''
    };
  } else if (typeof artist === 'string') {
    // 如果artist直接是一个字符串ID
    artistId = parseInt(artist);
    console.log(`歌手数据是字符串ID: ${artistId}`);
    
    // 创建临时artist对象
    artist = {
      id: artistId,
      name: `歌手#${artistId}`,
      realName: ''
    };
  } else if (artist && typeof artist === 'object') {
    // 如果artist是一个对象，尝试提取ID
    if (typeof artist.id === 'number') {
      artistId = artist.id;
    } else if (typeof artist.id === 'string') {
      // 处理可能的节点ID格式 (如 "artist-123")
      const match = artist.id.match(/artist-(\d+)/);
      if (match && match[1]) {
        artistId = parseInt(match[1]);
      } else if (!isNaN(parseInt(artist.id))) {
        artistId = parseInt(artist.id);
      }
    }
    
    console.log(`从歌手对象中提取ID: ${artistId}`);
  }
  
  // 如果无法确定ID，生成一个临时ID
  if (!artistId || isNaN(artistId)) {
    artistId = Math.floor(Date.now() / 1000) + artistIndex;
    console.warn(`无法确定歌手ID，使用临时ID: ${artistId}`);
    
    // 更新artist对象的ID
    if (artist && typeof artist === 'object') {
      artist.id = artistId;
    } else {
      artist = {
        id: artistId,
        name: `未知歌手#${artistId}`,
        realName: ''
      };
    }
  }
  
  console.log(`处理歌手(ID: ${artistId})的节点`);
            
            // 从权利链条数据中查找此歌曲-歌手组合的授权状态
            let hasAuthorization = false;
            let authorizationFile = null;
            if (rightsChainData && rightsChainData.songs) {
              const songData = rightsChainData.songs.find(s => s.id === song.id);
              if (songData && songData.artists) {
      const artistData = songData.artists.find(a => a.id === artistId);
                if (artistData && artistData.authorization && artistData.authorization.authorizationFile) {
                  hasAuthorization = true;
                  authorizationFile = artistData.authorization.authorizationFile;
        console.log(`歌曲 "${song.title}" 的歌手 "${artist.name || `#${artistId}`}" 有授权文件:`, authorizationFile);
                }
              }
            }
            
            // 检查这个歌手节点是否已经存在
  const artistNodeId = `artist-${artistId}`;
            const existingArtistNode = elements.value.find(
    el => el.type === 'artist' && el.id === artistNodeId
            );
            
            if (!existingArtistNode) {
    console.log(`创建新的歌手节点: ${artistNodeId}`);
    
    // 如果缺少必要的歌手信息，尝试从API获取
    if (!artist.name || !artist.realName) {
      try {
        console.log(`尝试从API获取歌手(${artistId})信息，歌曲ID: ${song.id}`);
        const artistData = await getArtistData(artistId, song.id);
        if (artistData) {
          // 更新歌手信息
          artist.name = artistData.name || artist.name || `歌手#${artistId}`;
          artist.realName = artistData.realName || artist.realName || '';
          console.log(`从API获取到歌手(${artistId})信息:`, artist.name);
        } else {
          console.warn(`API未返回歌手(${artistId})数据`);
        }
      } catch (error) {
        console.error(`获取歌手(${artistId})信息失败:`, error);
      }
    }
              
              // 创建新的歌手节点（使用保存的位置或默认位置）
              const artistNode = {
                id: artistNodeId,
                type: 'artist',
                position: savedPositions[artistNodeId] || { x: -300, y: 100 + artistIndex * 120 },
                data: {
        id: artistId,
        label: artist.name || `歌手#${artistId}`,
        realName: artist.realName || '',
                  // 初始化已授权歌曲列表
                  authorizedSongs: hasAuthorization ? [{
                    id: song.id,
                    title: song.title,
                    authFile: authorizationFile
                  }] : [],
                  // 初始化待授权歌曲列表
                  pendingAuthSongs: hasAuthorization ? [] : [{
                    id: song.id,
                    title: song.title
                  }],
                  // 计算待授权歌曲数量
                  pendingAuthCount: hasAuthorization ? 0 : 1,
                  // 添加更多歌手信息
                  platforms: {
                    netease: artist.netease || '',
                    qq: artist.qq || '',
                    kugou: artist.kugou || '',
                    kuwo: artist.kuwo || '',
                    spotify: artist.spotify || '',
                    youtube: artist.youtube || '',
                    appleMusic: artist.appleMusic || '',
                    soundCloud: artist.soundCloud || ''
                  }
                }
              };
              console.log('创建歌手节点:', artistNode);
              elements.value.push(artistNode);
              
              // 添加从歌手到歌曲的连接线
              // 检查授权状态，决定连接线颜色
              const authColor = hasAuthorization ? '#10b981' : '#ef4444';
              console.log('歌手授权状态:', hasAuthorization ? '已授权' : '未授权');
              const edgeArtistToSong = {
      id: `edge-artist-${artistId}-song-${song.id}`,
                source: artistNode.id,
                target: songNode.id,
                animated: false,
      type: 'smoothstep',
                label: '表演者',
                style: { stroke: authColor, strokeWidth: 2 },
                data: {
        artistId: artistId,
                  songId: song.id,
                  hasAuthorization: hasAuthorization
                }
              };
              elements.value.push(edgeArtistToSong);
      } else {
              // 如果歌手节点已存在，只添加连接线并更新数据
              // 获取现有的节点
              const artistNodeIndex = elements.value.findIndex(
      el => el.type === 'artist' && el.id === artistNodeId
              );
              
              if (artistNodeIndex !== -1) {
      console.log(`更新现有歌手节点: ${artistNodeId}`);
      
                // 确保已授权和待授权歌曲数组存在
                if (!elements.value[artistNodeIndex].data.authorizedSongs) {
                  elements.value[artistNodeIndex].data.authorizedSongs = [];
                }
                
                if (!elements.value[artistNodeIndex].data.pendingAuthSongs) {
                  elements.value[artistNodeIndex].data.pendingAuthSongs = [];
                }
                
                // 根据授权状态更新歌曲列表
                if (hasAuthorization) {
                  // 检查是否已存在于已授权列表
                  const existsInAuthorized = elements.value[artistNodeIndex].data.authorizedSongs.some(s => s.id === song.id);
                  if (!existsInAuthorized) {
                    // 添加到已授权歌曲列表
                    elements.value[artistNodeIndex].data.authorizedSongs.push({
                      id: song.id,
                      title: song.title,
                      authFile: authorizationFile
                    });
                  }
    } else {
                  // 检查是否已存在于待授权列表
                  const existsInPending = elements.value[artistNodeIndex].data.pendingAuthSongs.some(s => s.id === song.id);
                  if (!existsInPending) {
                    // 添加到待授权歌曲列表
                    elements.value[artistNodeIndex].data.pendingAuthSongs.push({
                      id: song.id,
                      title: song.title
                    });
                  }
                }
                
                // 更新待上传授权书计数
                elements.value[artistNodeIndex].data.pendingAuthCount = elements.value[artistNodeIndex].data.pendingAuthSongs.length;
                
                console.log('更新现有歌手节点:', elements.value[artistNodeIndex]);
              }
              
    // 检查是否已存在连接线
    const existingEdge = elements.value.find(
      el => (el.source === artistNodeId && el.target === songNode.id) || 
           (el.target === artistNodeId && el.source === songNode.id)
    );
    
    if (!existingEdge) {
              // 检查授权状态，决定连接线颜色
              const authColor = hasAuthorization ? '#10b981' : '#ef4444';
              const edgeArtistToSong = {
        id: `edge-artist-${artistId}-song-${song.id}`,
        source: artistNodeId,
                target: songNode.id,
                animated: false,
        type: 'smoothstep',
                label: '表演者',
                style: { stroke: authColor, strokeWidth: 2 },
                data: {
          artistId: artistId,
                  songId: song.id,
                  hasAuthorization: hasAuthorization
                }
              };
              elements.value.push(edgeArtistToSong);
      console.log(`添加歌手(${artistId})到歌曲(${song.id})的连接线`);
    } else {
      console.log(`歌手(${artistId})到歌曲(${song.id})的连接线已存在`);
    }
  }
};

const handleCoverClick = () => {
  albumDialogVisible.value = true;
};

const handleTitleClick = async () => {
  albumDialogVisible.value = true;
};

// 打开专辑编辑对话框
const openAlbumEditDialog = (event) => {
  if (!canEdit.value) {
    ElMessage.info('当前专辑状态不允许编辑');
    return;
  }
  
  // 如果是点击封面，直接触发文件选择
  if (event && event.target && (event.target.tagName === 'IMG' || event.target.closest('.album-cover-premium'))) {
    // 确保文件上传元素已经存在
    nextTick(() => {
      if (coverFileInput.value) {
        coverFileInput.value.click();
      } else {
        console.error('找不到封面文件上传元素');
      }
    });
    return;
  }
  
  albumDialogVisible.value = true;
};

const handleNodeClick = (event) => {
  console.log('节点被点击:', event.node);
  selectedNode.value = event.node;
  
  // 如果是歌手节点，检查授权文件状态
  if (selectedNode.value.type === 'artist') {
    console.log('歌手节点授权文件状态:', selectedNode.value.data.authFile);
    
    // 如果授权文件状态不明确，尝试从API获取最新状态
    if (!selectedNode.value.data.authFile) {
      // 这里可以添加额外的API调用来获取最新的授权文件状态
      console.log('歌手节点没有授权文件信息，可能需要从API获取');
    }
  }
  
  // 展开属性面板
  if (!activeCollapse.value.includes('properties')) {
    activeCollapse.value.push('properties');
  }
};

const handlePaneClick = () => {
  selectedNode.value = null;
};

// 添加连接开始和结束事件处理
const onConnectStart = (event) => {
  console.log('连接开始', event);
  // 重置连接处理标志
  connectionHandled.value = false;
};

const onConnectEnd = (event) => {
  // 如果连接已被handleConnect处理，则不显示警告
  if (!connectionHandled.value && event && !event.isValid) {
    ElMessage({
      message: '无效的连接！只能在歌手和歌曲之间创建连接。',
      type: 'warning',
      duration: 3000
    });
  }
  // 不再显示成功提示，因为handleConnect函数中已经处理了成功情况
};

// 添加权利链条数据缓存
const rightsChainCache = ref({
  data: null,
  timestamp: 0,
  ttl: 30000 // 缓存有效期30秒
});

// 优化检查歌手授权状态的函数 - 重命名为checkSongArtistAuthStatus以避免冲突
const checkSongArtistAuthStatus = async (artistId, songId) => {
  try {
    console.log(`检查歌手(${artistId})对歌曲(${songId})的授权状态...`);
    
    // 检查缓存是否有效
    const now = Date.now();
    let rightsChainData;
    
    if (rightsChainCache.value.data && (now - rightsChainCache.value.timestamp) < rightsChainCache.value.ttl) {
      console.log('使用缓存的权利链条数据');
      rightsChainData = rightsChainCache.value.data;
    } else {
      // 获取权利链条数据
      const albumId = route.params.id;
      console.log(`请求新的权利链条数据，专辑ID: ${albumId}`);
      const response = await api.get(`/rights-chain/albums/${albumId}/rights-chain`);
      rightsChainData = response.data;
      
      // 更新缓存
      rightsChainCache.value = {
        data: rightsChainData,
        timestamp: now,
        ttl: 30000
      };
      
      console.log('获取到新的权利链条数据，已更新缓存');
    }
    
    // 查找特定歌曲-歌手组合的授权状态
    let hasAuthorization = false;
    let authorizationFile = null;
    
    if (rightsChainData && rightsChainData.songs) {
      const songData = rightsChainData.songs.find(s => s.id === songId);
      if (songData && songData.artists) {
        const artistData = songData.artists.find(a => a.id === artistId);
        if (artistData && artistData.authorization && artistData.authorization.authorizationFile) {
          hasAuthorization = true;
          authorizationFile = artistData.authorization.authorizationFile;
          console.log(`歌曲(${songId})的歌手(${artistId})有授权文件:`, authorizationFile);
        }
      }
    }
    
    return {
      hasAuthorization,
      authorizationFile
    };
  } catch (error) {
    console.error('检查授权状态失败:', error);
    return { hasAuthorization: false, authorizationFile: null };
  }
};

// 添加刷新权利链条缓存的函数
const refreshRightsChainCache = async () => {
  try {
    const albumId = route.params.id;
    console.log(`强制刷新权利链条数据，专辑ID: ${albumId}`);
    const response = await api.get(`/rights-chain/albums/${albumId}/rights-chain`);
    
    // 更新缓存
    rightsChainCache.value = {
      data: response.data,
      timestamp: Date.now(),
      ttl: 30000
    };
    
    console.log('权利链条数据已强制刷新');
    return rightsChainCache.value.data;
  } catch (error) {
    console.error('刷新权利链条数据失败:', error);
    throw error;
  }
};

// 修改handleConnect函数，添加授权状态检查
const handleConnect = async (params) => {
  // 设置标志，表示此次连接已被处理
  connectionHandled.value = true;
  
  // 获取源节点和目标节点
  const sourceNode = findNode(params.source);
  const targetNode = findNode(params.target);
  
  console.log('处理连接:', { 
    source: params.source, 
    sourceType: sourceNode?.type,
    sourceId: sourceNode?.id,
    target: params.target,
    targetType: targetNode?.type,
    targetId: targetNode?.id,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle
  });
  
  // 检查是否是从歌手连接到歌曲
  const isArtistToSong = sourceNode?.type === 'artist' && targetNode?.type === 'song';
  const isSongToArtist = sourceNode?.type === 'song' && targetNode?.type === 'artist';
  
  // 确定实际的歌手和歌曲节点
  let artistNode = isArtistToSong ? sourceNode : (isSongToArtist ? targetNode : null);
  let songNode = isArtistToSong ? targetNode : (isSongToArtist ? sourceNode : null);
  
  // 如果是歌手到歌曲的连接
  if (artistNode && songNode) {
    // 从节点ID中提取实际的数据库ID
    const artistIdMatch = artistNode.id.match(/artist-(\d+)/);
    const actualArtistId = artistIdMatch ? parseInt(artistIdMatch[1]) : null;
    
    const songIdMatch = songNode.id.match(/song-(\d+)/);
    const actualSongId = songIdMatch ? parseInt(songIdMatch[1]) : null;
    
    console.log('提取的实际ID:', {
      artistId: actualArtistId,
      songId: actualSongId,
      artistNodeId: artistNode.id,
      songNodeId: songNode.id
    });
    
    // 默认使用红色（未授权）
    let authColor = '#ef4444';
    let hasAuthorization = false;
    let authorizationFile = null;
    
    // 检查授权状态 - 使用实际的数据库ID
    try {
      const authStatus = await checkSongArtistAuthStatus(actualArtistId, actualSongId);
      hasAuthorization = authStatus.hasAuthorization;
      authorizationFile = authStatus.authorizationFile;
      
      // 如果已授权，使用绿色
      if (hasAuthorization) {
        authColor = '#10b981';
        console.log(`歌手(${actualArtistId})对歌曲(${actualSongId})已授权`);
      }
    } catch (error) {
      console.error('检查授权状态失败:', error);
    }
    
    // 创建连接线
  const edge = {
    id: `e${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: 'smoothstep',
      animated: false,
      label: '表演者',
      style: { stroke: authColor, strokeWidth: 2 },
      data: {
        artistId: actualArtistId, // 使用实际的数据库ID
        songId: actualSongId, // 使用实际的数据库ID
        hasAuthorization: hasAuthorization
      }
    };
    
    // 添加边到元素列表
  elements.value = [...elements.value, edge];
  
  // 保存边信息到localStorage
  saveEdgesToLocalStorage();
  
  // 更新歌手节点，添加需要上传的授权书信息
    const connectedSongs = getConnectedEdges(artistNode.id)
      .filter(edge => {
        const otherNodeId = edge.source === artistNode.id ? edge.target : edge.source;
        const otherNode = findNode(otherNodeId);
        return otherNode && otherNode.type === 'song';
      })
      .map(edge => {
        const otherNodeId = edge.source === artistNode.id ? edge.target : edge.source;
        return findNode(otherNodeId);
      });
    
    // 更新歌手节点显示连接的歌曲数量
    artistNode.data.connectedSongsCount = connectedSongs.length;
    
    // 初始化歌手节点的已授权和待授权歌曲数组
    if (!artistNode.data.authorizedSongs) {
      artistNode.data.authorizedSongs = [];
    }
    
    if (!artistNode.data.pendingAuthSongs) {
      artistNode.data.pendingAuthSongs = [];
    }
    
    // 根据授权状态更新歌曲列表
    if (hasAuthorization) {
      // 检查是否已存在于已授权列表
      const existsInAuthorized = artistNode.data.authorizedSongs.some(s => s.id === songNode.data.id);
      if (!existsInAuthorized) {
        // 添加到已授权歌曲列表
        artistNode.data.authorizedSongs.push({
          id: songNode.data.id,
          title: songNode.data.label,
          authFile: authorizationFile
        });
      }
      
      // 从待授权列表中移除（如果存在）
      const pendingIndex = artistNode.data.pendingAuthSongs.findIndex(s => s.id === songNode.data.id);
      if (pendingIndex !== -1) {
        artistNode.data.pendingAuthSongs.splice(pendingIndex, 1);
      }
    } else {
      // 检查是否已存在于待授权列表
      const existsInPending = artistNode.data.pendingAuthSongs.some(s => s.id === songNode.data.id);
      if (!existsInPending) {
        // 添加到待授权歌曲列表
        artistNode.data.pendingAuthSongs.push({
          id: songNode.data.id,
          title: songNode.data.label
        });
      }
      
      // 更新待上传授权书计数
      artistNode.data.pendingAuthCount = artistNode.data.pendingAuthSongs.length;
    }
    
    // 更新UI
          elements.value = [...elements.value];
      
      // 在状态栏显示成功提示
      showStatusMessage(`歌手 "${artistNode.data.label}" 已成为歌曲 "${songNode.data.label}" 的表演者`);
    
    // 保存歌手-歌曲关联到后端
    try {
      // 获取当前歌曲的所有关联歌手
      const allConnectedEdges = getConnectedEdges(songNode.id);
      
      // 确保包含当前正在添加的连接
      const currentEdge = {
        source: params.source,
        target: params.target
      };
      
      // 检查当前连接是否已经在连接列表中
      const hasCurrentEdge = allConnectedEdges.some(edge => 
        (edge.source === currentEdge.source && edge.target === currentEdge.target) || 
        (edge.source === currentEdge.target && edge.target === currentEdge.source)
      );
      
      // 如果当前连接不在列表中，手动添加当前歌手
      let allConnectedArtists;
      if (!hasCurrentEdge) {
        console.log('当前连接未在列表中，手动添加当前歌手');
        allConnectedArtists = [...getConnectedEdges(songNode.id)
          .filter(edge => {
            const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
            const otherNode = findNode(otherNodeId);
            return otherNode && otherNode.type === 'artist';
          })
          .map(edge => {
            const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
            return findNode(otherNodeId);
          }), artistNode]; // 添加当前歌手节点
      } else {
        allConnectedArtists = getConnectedEdges(songNode.id)
        .filter(edge => {
          const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
          const otherNode = findNode(otherNodeId);
          return otherNode && otherNode.type === 'artist';
        })
        .map(edge => {
          const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
          return findNode(otherNodeId);
        });
      }
      
      // 准备歌手数据 - 确保使用数据库中的实际ID
      const artistsData = [];
      
      // 对于每个关联的歌手，确保我们有完整的数据
      for (const artist of allConnectedArtists) {
        // 从节点ID中提取实际的数据库ID
        let actualArtistId;
        
        // 处理各种格式的ID
        if (typeof artist.id === 'string' && artist.id.startsWith('artist-')) {
          // 处理节点ID格式 "artist-数字"
          const artistIdMatch = artist.id.match(/artist-(\d+)/);
          actualArtistId = artistIdMatch ? parseInt(artistIdMatch[1]) : null;
        } else if (typeof artist.data.id === 'string' && artist.data.id.startsWith('artist-')) {
          // 处理data.id中的节点ID格式
          const artistIdMatch = artist.data.id.match(/artist-(\d+)/);
          actualArtistId = artistIdMatch ? parseInt(artistIdMatch[1]) : null;
        } else if (typeof artist.data.id === 'number') {
          // 处理数字ID，确保是整数
          actualArtistId = Number.isInteger(artist.data.id) ? artist.data.id : Math.floor(artist.data.id);
        } else if (typeof artist.data.id === 'string' && !isNaN(Number(artist.data.id))) {
          // 处理字符串数字
          actualArtistId = parseInt(artist.data.id);
        } else {
          // 如果无法确定ID，使用临时ID
          console.warn(`无法确定歌手 ${artist.data.label} 的ID，将使用临时ID`);
          actualArtistId = Math.floor(Date.now() / 1000);
        }
        
        // 如果缺少必要的数据，尝试从API获取
        if ((!artist.data.realName || !artist.data.label) && actualArtistId) {
          try {
            const artistData = await getArtistData(actualArtistId, songNode.data.id);
            if (artistData) {
              // 更新节点数据
              artist.data.realName = artistData.realName || artist.data.realName || '';
              artist.data.label = artistData.name || artist.data.label;
            }
          } catch (error) {
            console.error(`获取歌手(${actualArtistId})信息失败:`, error);
          }
        }
        
        artistsData.push({
          id: actualArtistId, // 使用实际的数据库ID
          name: artist.data.label || `歌手#${actualArtistId}`,
        realName: artist.data.realName || ''
        });
      }
      
      // 调用API保存歌手关联
      const albumId = route.params.id;
      const songId = songNode.data.id;
      
      console.log(`保存歌曲(${songId})的歌手关联:`, artistsData);
      
      // 后端API接受artists参数来更新Song.artists字段(JSON格式)
      const response = await api.put(`/albums/${albumId}/songs/${songId}/artists`, {
        artists: artistsData
      });
      
      console.log('保存歌手关联成功:', response.data);
    } catch (error) {
      console.error('保存歌手关联失败:', error);
      ElMessage.error('保存歌手关联失败: ' + (error.response?.data?.message || error.message));
    }
  } else {
    // 其他类型的连接使用默认颜色
    const edge = {
      id: `e${params.source}-${params.target}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: 'smoothstep',
      style: { stroke: '#4f46e5', strokeWidth: 2 }
    };
    elements.value = [...elements.value, edge];
  }
  
  // 设置一个定时器，在短时间后重置标志
  setTimeout(() => {
    connectionHandled.value = false;
  }, 100);
};

const onDragStart = (event, nodeType) => {
  event.dataTransfer.setData('application/vueflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const handleAudioSuccess = (response) => {
  if (selectedNode.value) {
    selectedNode.value.data.wavFile = response.filename;
    ElMessage.success('音频上传成功');
  }
};

const handleLyricsSuccess = (response) => {
  if (selectedNode.value) {
    selectedNode.value.data.lyricsFile = response.filename;
    ElMessage.success('歌词上传成功');
  }
};

const handleAuthSuccess = (response) => {
  if (selectedNode.value) {
    selectedNode.value.data.authFile = response.filename;
    
    // 更新关联的所有连接线的颜色
    const connectedEdges = getConnectedEdges(selectedNode.value.id);
    connectedEdges.forEach(edge => {
      // 更新边的颜色为绿色（授权成功）
      edge.style = { ...edge.style, stroke: '#10b981' };
    });
    
    // 清除待上传授权书计数
    selectedNode.value.data.pendingAuthCount = 0;
    
    // 更新UI
    elements.value = [...elements.value];
    
    ElMessage.success('授权书上传成功');
  }
};

// 处理对话框中封面点击事件
const handleDialogCoverClick = () => {
  if (canEdit.value) {
    console.log('对话框封面被点击，触发文件选择');
    // 确保文件输入框已经渲染
    nextTick(() => {
      if (dialogCoverFileInput.value) {
        dialogCoverFileInput.value.click();
      } else {
        console.error('找不到对话框封面文件上传元素');
      }
    });
  }
};

const saveAlbumInfo = async () => {
  try {
    submitting.value = true;
    
    // 如果有新的封面图片，先上传封面
    if (album.value.coverImageFile) {
      try {
        console.log('检测到新的封面图片，先上传封面');
        // 传入第二个参数为true，表示不显示成功消息
        await uploadCoverImage(album.value.coverImageFile, true);
      } catch (error) {
        console.error('上传封面图片失败:', error);
        ElMessage.error('上传封面图片失败: ' + error.message);
        submitting.value = false;
        return;
      }
    }
    
    // 保存其他专辑信息
    const response = await api.put(`/albums/${album.value.id}`, {
      title: album.value.title,
      releaseDate: album.value.releaseDate,
      description: album.value.description
    });
    
    if (response.data.success) {
      albumDialogVisible.value = false;
      ElMessage({
        message: '专辑信息更新成功',
        type: 'success',
        icon: 'Check',
        showClose: true
      });
      
      // 确保顶部栏封面更新
      if (album.value.coverImage) {
        album.value.coverUrl = `${STATIC_BASE_URL}/${album.value.coverImage}`;
        console.log('已更新顶部栏封面URL:', album.value.coverUrl);
      }
    } else {
      ElMessage.error(response.data.message || '保存失败');
    }
  } catch (error) {
    console.error('保存专辑信息错误:', error);
    ElMessage.error('保存失败');
  } finally {
    submitting.value = false;
  }
};

// 处理对话框中的封面变更
const handleDialogCoverFileSelected = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // 检查文件类型
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    ElMessage.error('只能上传图片文件!');
    return;
  }

  // 检查文件大小
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过10MB!');
    return;
  }

  // 创建临时URL用于预览
  album.value.coverImageFile = file;
  album.value.coverImagePreview = URL.createObjectURL(file);
  
  // 临时显示预览图
  const originalCoverUrl = album.value.coverUrl;
  album.value.coverUrl = album.value.coverImagePreview;
  
  console.log('已选择新封面图片，预览URL:', album.value.coverImagePreview);
};

// 初始化图形
const initializeGraph = () => {
  if (!album.value) return;
  
  const nodes = [];
  const edges = [];
  
  // 添加专辑节点
  const albumNode = {
    id: `album-${album.value.id}`,
    type: 'album',
    position: { x: 400, y: 50 },
    data: {
      label: album.value.title || '未命名专辑',
      releaseDate: album.value.releaseDate
    }
  };
  nodes.push(albumNode);
  
  // 添加现有的歌曲和歌手节点
  if (album.value.songs && album.value.songs.length > 0) {
    // 创建歌曲节点
    album.value.songs.forEach((song, index) => {
      elements.value.push({
        id: `song-${song.id}`,
        type: 'song',
        label: song.title,
        position: { x: 200, y: 100 + index * 120 },
        data: {
          label: song.title,
          genre: song.genre,
          language: song.language,
          wavFile: song.wavFile,
          lyricsFile: song.lyricsFile,
          translationLyricsFile: song.translationLyricsFile, // <--- 确保传递此字段
        },
      });
    });
  }
  
  elements.value = [...nodes, ...edges];
  
  setTimeout(() => {
    fitView();
  }, 300);
};

// 检查所有歌手节点的授权文件状态
const checkArtistAuthorizationStatus = async () => {
  console.log('检查所有歌手节点的授权文件状态...');
  
  // 获取所有歌手节点
  const artistNodes = elements.value.filter(el => el.type === 'artist');
  
  if (artistNodes.length === 0) {
    console.log('没有找到歌手节点');
    return;
  }
  
  console.log('找到歌手节点:', artistNodes.length);
  
  // 检查每个歌手节点的授权文件状态
  for (const node of artistNodes) {
    console.log(`检查歌手 "${node.data.label}" 的授权状态:`, node.data.authFile);
    
    // 如果没有授权文件信息，尝试从API获取
    if (!node.data.authFile) {
      try {
        // 获取歌手连接的所有歌曲
        const connectedEdges = getConnectedEdges(node.id);
        const connectedSongNodes = connectedEdges
          .map(edge => {
            const otherNodeId = edge.source === node.id ? edge.target : edge.source;
            const songNode = findNode(otherNodeId);
            return songNode && songNode.type === 'song' ? songNode : null;
          })
          .filter(Boolean);
        
        if (connectedSongNodes.length > 0) {
          console.log(`歌手 "${node.data.label}" 连接了 ${connectedSongNodes.length} 首歌曲`);
          
          // 选择第一首歌曲
          const songNode = connectedSongNodes[0];
          const songId = songNode.data.id;
          const artistId = node.data.id;
          
          // 尝试获取授权文件状态
          console.log(`尝试获取歌手 "${node.data.label}" 的授权文件状态 (专辑ID: ${album.value.id}, 歌曲ID: ${songId}, 歌手ID: ${artistId})`);
          
          try {
            // 使用正确的API端点获取授权状态
            const response = await api.get(`/rights-chain/albums/${album.value.id}/rights-chain`);
            console.log('获取权利链条响应:', response.data);
            
            if (response.data && response.data.songs) {
              // 查找对应的歌曲
              const song = response.data.songs.find(s => s.id === songId);
              if (song && song.artists) {
                // 查找对应的歌手
                const artist = song.artists.find(a => a.id === artistId);
                if (artist && artist.authorization && artist.authorization.authorizationFile) {
                  // 更新授权文件状态
                  node.data.authFile = artist.authorization.authorizationFile;
                  console.log(`更新歌手 "${node.data.label}" 的授权文件状态:`, node.data.authFile);
                  
                  // 更新连接线颜色
                  const connectedEdges = getConnectedEdges(node.id);
                  connectedEdges.forEach(edge => {
                    edge.style = { ...edge.style, stroke: '#10b981' }; // 绿色，表示已授权
                  });
                  
                  // 清除待上传授权书计数
                  node.data.pendingAuthCount = 0;
                }
              }
            }
          } catch (error) {
            console.error('获取权利链条失败:', error);
          }
        }
      } catch (error) {
        console.error(`获取歌手 "${node.data.label}" 授权状态时出错:`, error);
      }
    }
  }
  
  // 更新UI
  elements.value = [...elements.value];
};

// 监听封面更新事件
const setupCoverUpdateListener = () => {
  window.addEventListener('album-cover-updated', (event) => {
    console.log('收到封面更新事件:', event.detail);
    
    // 确保是当前专辑的封面更新
    if (album.value && event.detail.albumId === album.value.id) {
      // 强制更新顶部栏封面
      album.value.coverUrl = event.detail.coverUrl || `${STATIC_BASE_URL}/${event.detail.coverImage}`;
      console.log('强制更新顶部栏封面URL:', album.value.coverUrl);
    }
  });
};

// 组件卸载时移除事件监听器
onBeforeUnmount(() => {
  window.removeEventListener('album-cover-updated', () => {
    console.log('已移除封面更新事件监听器');
  });
});

// 组件挂载时获取专辑详情
onMounted(async () => {
  try {
    // 设置封面更新事件监听器
    setupCoverUpdateListener();
    
    await fetchAlbumDetail();
    
    // 检查歌手授权文件状态
    await checkArtistAuthorizationStatus();
      
    // 获取歌手列表
    await fetchArtistsList();
    
    // 检查本地存储中是否保存了不再提示的设置
    const tipsHidden = localStorage.getItem('connectionTipsHidden');
    if (tipsHidden === 'true') {
      connectionTipsVisible.value = false;
      doNotShowAgain.value = true;
    } else {
      // 显示连接提示
      connectionTipsVisible.value = true;
      
      // 5秒后自动隐藏连接提示
      setTimeout(() => {
        connectionTipsVisible.value = false;
              }, 5000);
      }
      
      // 检查问题面板折叠状态
      const savedPanelState = localStorage.getItem('problems_panel_collapsed');
      if (savedPanelState !== null) {
        problemsPanelCollapsed.value = savedPanelState === 'true';
      }
      
      // 检测问题
      await detectProblems();
      
    } catch (error) {
    console.error('组件挂载时出错:', error);
    ElMessage.error('加载专辑数据失败');
  }
});

// 添加到methods
const submitForReview = async () => {
  try {
    // 先检测问题
    await detectProblems();
    
    // 检查是否有严重问题(error级别)
    const hasErrors = problems.value.some(p => p.level === 'error');
    
    if (hasErrors) {
      // 如果有严重问题，显示错误信息并展开问题面板
      await ElMessageBox.alert(
        '专辑中存在严重问题，请先修复后再提交审核。',
        '无法提交审核',
        {
          confirmButtonText: '查看问题',
          type: 'error',
        }
      );
      
      // 展开问题面板
      showProblemsPanel();
      return;
    }
    
    // 如果没有严重问题，继续提交流程
    await ElMessageBox.confirm(
      '提交后专辑将进入审核流程，您将无法继续编辑专辑内容。确定要提交审核吗？',
      '提交确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 这里应该调用API提交专辑
    ElMessage.success('专辑已成功提交审核');
    // 重新加载专辑数据
    fetchAlbumDetail();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.toString());
    }
  }
};

const resubmitForReview = async () => {
  try {
    // 先检测问题
    await detectProblems();
    
    // 检查是否有严重问题(error级别)
    const hasErrors = problems.value.some(p => p.level === 'error');
    
    if (hasErrors) {
      // 如果有严重问题，显示错误信息并展开问题面板
      await ElMessageBox.alert(
        '专辑中存在严重问题，请先修复后再提交审核。',
        '无法提交审核',
        {
          confirmButtonText: '查看问题',
          type: 'error',
        }
      );
      
      // 展开问题面板
      showProblemsPanel();
      return;
    }
    
    await ElMessageBox.confirm(
      '重新提交后专辑将再次进入审核流程。您是否已经根据拒绝理由修改了内容？',
      '重新提交确认',
      {
        confirmButtonText: '已修改，确定提交',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 这里应该调用API重新提交专辑
    ElMessage.success('专辑已成功重新提交审核');
    // 重新加载专辑数据
    fetchAlbumDetail();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.toString());
    }
  }
};

// 为翻译歌词添加上传处理函数
const triggerTranslationLyricsUpload = () => {
  translationLyricsFileInput.value.click();
};

const handleTranslationLyricsUpload = async (event) => {
  if (!selectedNode.value) return;
  const file = event.target.files[0];
  if (!file) return;
  
  // 验证文件类型
  if (!file.name.toLowerCase().endsWith('.lrc')) {
    ElMessage.error('只能上传LRC格式的翻译歌词文件!');
    event.target.value = '';
    return;
  }

  // 验证文件大小
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过5MB!');
    event.target.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('translationLyricsFile', file);
  loading.value = true;

  try {
    const response = await api.post(`/albums/${album.value.id}/songs/${selectedNode.value.data.id}/lyrics`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    selectedNode.value.data.translationLyricsFile = response.data.filePath;
    ElMessage.success('翻译歌词上传成功');
  } catch (err) {
    console.error('翻译歌词上传失败:', err);
    ElMessage.error('翻译歌词上传失败');
  } finally {
    loading.value = false;
    event.target.value = '';
  }
};


// --> 新增：计算属性，获取连接的歌手 <--
const connectedArtists = computed(() => {
  if (!selectedNode.value || selectedNode.value.type !== 'song') {
    return [];
  }
  const edges = getConnectedEdges(selectedNode.value.id);
  return edges
    .map(edge => {
      // 确定连接的另一个节点是源还是目标
      const otherNodeId = edge.source === selectedNode.value.id ? edge.target : edge.source;
      const artistNode = findNode(otherNodeId);
      // 检查节点是否存在且类型为 'artist'
      if (artistNode && artistNode.type === 'artist') {
        return artistNode;
      }
      return null;
    })
    .filter(Boolean); // 过滤掉 null 值
});

// 修改：拖拽排序相关
const sortableArtists = ref([]);

// 新增：将connectedArtists同步到sortableArtists
watch(connectedArtists, (newArtists) => {
  sortableArtists.value = [...newArtists];
}, { immediate: true, deep: true });

// 添加歌手拖拽排序函数
const onArtistDragStart = (event, index) => {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index.toString());
  event.target.classList.add('dragging');
};

const onArtistDrop = async (event, dropIndex) => {
  event.preventDefault();
  const dragIndex = parseInt(event.dataTransfer.getData('text/plain'));
  if (dragIndex === dropIndex) return;
  
  // 重新排序
  const temp = sortableArtists.value[dragIndex];
  sortableArtists.value.splice(dragIndex, 1);
  sortableArtists.value.splice(dropIndex, 0, temp);
  
  // 保存排序结果
  if (selectedNode.value && selectedNode.value.type === 'song') {
    // 将排序后的歌手数据保存到歌曲节点
    if (!selectedNode.value.data.artistOrder) {
      selectedNode.value.data.artistOrder = [];
    }
    
    // 保存排序后的歌手ID顺序
    selectedNode.value.data.artistOrder = sortableArtists.value.map(artist => {
      // 处理可能的节点ID格式（如"artist-15"）
      if (typeof artist.id === 'string' && artist.id.startsWith('artist-')) {
        const match = artist.id.match(/artist-(\d+)/);
        if (match && match[1]) {
          return parseInt(match[1]);
        }
      }
      return artist.id;
    });
    
    // 显示成功消息
    ElMessage.success('歌手顺序已更新');
    
    // 更新UI
    elements.value = [...elements.value];
    
    // 保存更新后的歌手顺序到后端
    try {
      // 准备歌手数据，按照新的排序顺序
      const artistsData = sortableArtists.value.map(artist => {
        // 处理可能的节点ID格式（如"artist-15"）
        let artistId = artist.data.id;
        
        // 如果artist.id是节点ID格式，提取实际ID
        if (typeof artist.id === 'string' && artist.id.startsWith('artist-')) {
          const match = artist.id.match(/artist-(\d+)/);
          if (match && match[1]) {
            artistId = parseInt(match[1]);
          }
        }
        
        // 处理浮点数ID - 转换为整数
        if (typeof artistId === 'number' && !Number.isInteger(artistId)) {
          artistId = Math.floor(artistId);
        }
        
        // 处理字符串数字ID - 转换为整数
        if (typeof artistId === 'string' && !isNaN(parseInt(artistId))) {
          artistId = parseInt(artistId);
        }
        
        return {
          id: artistId,
        name: artist.data.label,
        realName: artist.data.realName || ''
        };
      });
      
      // 调用API保存歌手关联
      const albumId = route.params.id;
      const songId = selectedNode.value.data.id;
      
      console.log(`更新歌曲(${songId})的歌手顺序:`, artistsData);
      
      const response = await api.put(`/albums/${albumId}/songs/${songId}/artists`, {
        artists: artistsData
      });
      
      console.log('更新歌手顺序成功:', response.data);
    } catch (error) {
      console.error('更新歌手顺序失败:', error);
      ElMessage.error('更新歌手顺序失败: ' + (error.response?.data?.message || error.message));
    }
  }
};

const onArtistSortEnd = () => {
  // 拖拽结束时，更新歌曲节点中的Artists数组顺序
  if (selectedNode.value && selectedNode.value.type === 'song') {
    // 将排序后的歌手数据保存到歌曲节点
    if (!selectedNode.value.data.artistOrder) {
      selectedNode.value.data.artistOrder = [];
    }
    
    // 保存排序后的歌手ID顺序
    selectedNode.value.data.artistOrder = sortableArtists.value.map(artist => artist.id);
    
    // 显示成功消息
    ElMessage.success('歌手顺序已更新');
    
    // 更新UI
    elements.value = [...elements.value];
  }
};

// 添加处理边缘点击的函数
const handleEdgeClick = async (event) => {
  // 记录选中的边
  selectedEdge.value = event.edge;
  
  // 显示提示信息
  try {
    await ElMessageBox.confirm(
      '你要删除这个连接吗？',
      '删除连接',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true,
      }
    );
    
    // 用户确认删除
    await deleteConnection(selectedEdge.value.id);
  } catch (error) {
    // 用户取消，不做任何操作
    selectedEdge.value = null;
  }
};

// 添加删除连接的函数
const deleteConnection = async (edgeId) => {
  // 查找要删除的边
  const edgeToDelete = elements.value.find(el => el.id === edgeId);
  
  if (!edgeToDelete) return;
  
  // 如果是歌手到歌曲的连接，需要更新歌手节点的计数
  const sourceNode = findNode(edgeToDelete.source);
  const targetNode = findNode(edgeToDelete.target);
  
  // 检查是否是歌手到歌曲的连接
  const isArtistToSong = (sourceNode?.type === 'artist' && targetNode?.type === 'song') ||
                         (sourceNode?.type === 'song' && targetNode?.type === 'artist');
  
  if (isArtistToSong) {
    // 确定歌手节点和歌曲节点
    const artistNode = sourceNode?.type === 'artist' ? sourceNode : targetNode;
    const songNode = sourceNode?.type === 'song' ? sourceNode : targetNode;
    
    if (artistNode && artistNode.data && songNode && songNode.data) {
      // 从已授权歌曲列表中移除
      if (artistNode.data.authorizedSongs) {
        const authorizedIndex = artistNode.data.authorizedSongs.findIndex(s => s.id === songNode.data.id);
        if (authorizedIndex !== -1) {
          artistNode.data.authorizedSongs.splice(authorizedIndex, 1);
        }
      }
      
      // 从待授权歌曲列表中移除
      if (artistNode.data.pendingAuthSongs) {
        const pendingIndex = artistNode.data.pendingAuthSongs.findIndex(s => s.id === songNode.data.id);
        if (pendingIndex !== -1) {
          artistNode.data.pendingAuthSongs.splice(pendingIndex, 1);
        }
      }
      
      // 更新待上传授权书计数
      artistNode.data.pendingAuthCount = artistNode.data.pendingAuthSongs?.length || 0;
      
      // 保存更新后的歌手-歌曲关联到后端
      try {
        // 获取当前歌曲的所有关联歌手（不包括要删除的连接）
        const allConnectedArtists = getConnectedEdges(songNode.id)
          .filter(edge => {
            // 排除当前要删除的边
            if (edge.id === edgeId) return false;
            
            const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
            const otherNode = findNode(otherNodeId);
            return otherNode && otherNode.type === 'artist';
          })
          .map(edge => {
            const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
            return findNode(otherNodeId);
          });
        
        // 准备歌手数据
        const artistsData = allConnectedArtists.map(artist => ({
          id: artist.data.id,
          name: artist.data.label,
          realName: artist.data.realName || ''
        }));
        
        // 调用API保存歌手关联
        const albumId = route.params.id;
        const songId = songNode.data.id;
        
        console.log(`更新歌曲(${songId})的歌手关联，移除歌手(${artistNode.data.id}):`, artistsData);
        
        await api.put(`/albums/${albumId}/songs/${songId}/artists`, {
          artists: artistsData
        });
      } catch (error) {
        console.error('更新歌手关联失败:', error);
        ElMessage.error('更新歌手关联失败: ' + (error.response?.data?.message || error.message));
      }
    }
  }
  
      // 从元素数组中移除该边
    elements.value = elements.value.filter(el => el.id !== edgeId);
    
    // 更新localStorage中的边信息
    saveEdgesToLocalStorage();
    
    ElMessage.success('连接已删除');
  selectedEdge.value = null;
};

// 添加连接验证函数
const isValidConnection = ({ source, target }) => {
  const sourceNode = findNode(source);
  const targetNode = findNode(target);
  
  if (!sourceNode || !targetNode) return false;
  
  // 允许歌手和歌曲之间互相连接
  const isArtistToSong = (sourceNode.type === 'artist' && targetNode.type === 'song');
  const isSongToArtist = (sourceNode.type === 'song' && targetNode.type === 'artist');
  
  // 允许专辑到歌曲的连接
  const isAlbumToSong = (sourceNode.type === 'album' && targetNode.type === 'song');
  
  return isArtistToSong || isSongToArtist || isAlbumToSong;
};

// 添加提示显示状态
const connectionTipsVisible = ref(false); // 默认不显示，在onMounted中检查是否需要显示

// 添加触发授权书上传的方法
const triggerAuthUpload = () => {
  authFileInput.value.click();
};

// 添加触发WAV文件上传的方法
const triggerWavUpload = () => {
  wavFileInput.value.click();
};

// 添加触发歌词文件上传的方法
const triggerLyricsUpload = () => {
  lyricsFileInput.value.click();
};

// 添加WAV文件上传处理函数
const handleWavUpload = async (event) => {
  if (!selectedNode.value) return;
  const file = event.target.files[0];
  if (!file) return;
  
  // 验证文件类型
  const isWAV = file.type === 'audio/wav' || 
                file.type === 'audio/x-wav' || 
                file.type === 'audio/wave' || 
                file.name.toLowerCase().endsWith('.wav');
  
  if (!isWAV) {
    ElMessage.error('只能上传WAV格式的音频文件!');
    event.target.value = '';
    return;
  }

  // 验证文件大小
  const maxSize = 200 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过200MB!');
    event.target.value = '';
    return;
  }

  loading.value = true;
  
  try {
    // 获取歌曲关联的歌手
    const connectedArtistsData = connectedArtists.value.map(artist => {
      // 从节点ID中提取实际ID
      let artistId;
      if (typeof artist.id === 'string' && artist.id.startsWith('artist-')) {
        const match = artist.id.match(/artist-(\d+)/);
        artistId = match ? parseInt(match[1]) : null;
      } else {
        artistId = artist.data.id;
      }
      
      return {
        id: artistId,
        name: artist.data.label,
        realName: artist.data.realName || ''
      };
    });
    
    // 准备更新数据
    const updateData = {
      songId: selectedNode.value.data.id,
      title: selectedNode.value.data.label,
      genre: selectedNode.value.data.genre || '未知',
      language: selectedNode.value.data.language || '中文',
      wavFile: file,
      artists: connectedArtistsData
    };
    
    // 检查文件大小，超过10MB使用分片上传
    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
    let response;
    
    if (file.size > LARGE_FILE_THRESHOLD) {
      // 大文件使用分片上传
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      const chunkSize = 5 * 1024 * 1024; // 5MB分片
      const totalChunks = Math.ceil(file.size / chunkSize);
      const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 15);
      
      // 显示上传进度提示
      ElMessage({
        message: '正在上传大文件，请耐心等待...',
        type: 'info',
        duration: 3000
      });
      
      // 上传所有分片
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);
        
        // 将分片转换为Base64
        const fileToBase64 = (fileChunk) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64String = reader.result.split(',')[1];
              resolve(base64String);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(fileChunk);
          });
        };
        
        const base64Chunk = await fileToBase64(chunk);
        
        // 构建请求数据
        const chunkData = {
          fileId,
          chunkIndex: chunkIndex,
          totalChunks,
          fileName: file.name,
          fileType: file.type,
          chunkData: base64Chunk,
          songId: selectedNode.value.data.id
        };
        
        // 发送分片
        await axios.post(
          `${API_BASE_URL}/albums/${album.value.id}/upload-chunk-base64`,
          chunkData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        // 更新进度提示
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        if (progress % 20 === 0 || progress === 100) {
          ElMessage({
            message: `上传进度: ${progress}%`,
            type: 'info',
            duration: 1000
          });
        }
      }
      
      // 所有分片上传完成，请求合并
      const mergeData = {
        fileId,
        totalChunks,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        title: updateData.title,
        genre: updateData.genre,
        language: updateData.language,
        artists: JSON.stringify(updateData.artists),
        songId: updateData.songId
      };
      
      // 请求合并分片
      response = await axios.post(
        `${API_BASE_URL}/albums/${album.value.id}/songs/${selectedNode.value.data.id}/merge-wav`,
        mergeData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
    } else {
      // 小文件使用常规上传
      const formData = new FormData();
      formData.append('wavFile', file);
      formData.append('title', updateData.title);
      formData.append('genre', updateData.genre);
      formData.append('language', updateData.language);
      formData.append('artists', JSON.stringify(updateData.artists));
      
      // 发送请求
      response = await axios.put(
        `${API_BASE_URL}/albums/${album.value.id}/songs/${selectedNode.value.data.id}/wav`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
    }
    
    // 更新节点数据
    selectedNode.value.data.wavFile = response.data.wavFile || true;
    
    // 更新UI
    elements.value = [...elements.value];
    
    ElMessage.success('WAV文件上传成功');
  } catch (error) {
    console.error('WAV文件上传失败:', error);
    ElMessage.error(error.response?.data?.message || 'WAV文件上传失败');
  } finally {
    loading.value = false;
    event.target.value = ''; // 清空文件输入，允许再次上传相同文件
  }
};

// 添加歌词文件上传处理函数
const handleLyricsUpload = async (event) => {
  if (!selectedNode.value) return;
  const file = event.target.files[0];
  if (!file) return;

  // 验证文件类型
  if (!file.name.toLowerCase().endsWith('.lrc')) {
    ElMessage.error('只能上传LRC格式的歌词文件!');
    event.target.value = '';
    return;
  }

  // 验证文件大小
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过5MB!');
    event.target.value = '';
    return;
  }

  loading.value = true;

  try {
    // 准备表单数据
    const formData = new FormData();
    formData.append('lyrics', file);

    // 发送请求
    const response = await axios.post(
      `${API_BASE_URL}/albums/${album.value.id}/songs/${selectedNode.value.data.id}/lyrics`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    // 更新节点数据
    selectedNode.value.data.lyricsFile = response.data.filePath || true;

    // 更新UI
    elements.value = [...elements.value];

    ElMessage.success('歌词文件上传成功');
  } catch (error) {
    console.error('歌词文件上传失败:', error);
    ElMessage.error('歌词文件上传失败');
  } finally {
    loading.value = false;
    event.target.value = '';
  }
};

// 触发授权书上传
const triggerAuthFileUpload = (artistNodeId, songId) => {
  console.log('触发授权书上传:', { artistNodeId, songId });
  
  // 保存上下文信息
  authUploadContext.value = {
    artistNodeId,
    songId
  };
  
  // 确保文件输入框已经渲染
  nextTick(() => {
    if (authFileInput.value) {
      authFileInput.value.click();
    } else {
      console.error('找不到授权书文件上传元素');
      ElMessage.error('无法打开文件选择器');
    }
  });
};

// 处理带上下文的授权书上传
const handleAuthFileUploadWithContext = (event) => {
  const { artistNodeId, songId } = authUploadContext.value;
  if (!artistNodeId || !songId) {
    console.error('授权书上传缺少上下文信息');
    ElMessage.error('上传失败：缺少必要信息');
    return;
  }
  
  handleAuthFileUpload(event, artistNodeId, songId);
};

// 修改文件上传处理函数
const handleAuthFileUpload = async (event, nodeId = null, songId = null) => {
  // 获取文件
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  // 验证文件类型
  if (file.type !== 'application/pdf') {
    ElMessage.error('只能上传PDF文件');
    return;
  }

  // 验证文件大小
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过10MB');
    return;
  }

  // 确定节点ID
  const artistNodeId = nodeId || (selectedNode.value?.type === 'artist' ? selectedNode.value.id : null);
  if (!artistNodeId) {
    ElMessage.error('未选择歌手节点');
    return;
  }

  // 查找歌手节点
  const artistNode = findNode(artistNodeId);
  if (!artistNode || artistNode.type !== 'artist') {
    ElMessage.error('无效的歌手节点');
    return;
  }

  // 从节点ID中提取实际ID
  const artistIdMatch = artistNode.id.match(/artist-(\d+)/);
  if (!artistIdMatch) {
    ElMessage.error('无法解析歌手节点ID');
    return;
  }
  
  const artistId = parseInt(artistIdMatch[1]);
  const albumId = route.params.id;
  
  // 如果没有提供songId，尝试找到连接的歌曲
  let selectedSongId = songId;
  if (!selectedSongId) {
    // 查找与歌手相连的歌曲节点
    const connectedSongNodes = getConnectedEdges(artistNodeId)
      .map(edge => {
        const otherNodeId = edge.source === artistNodeId ? edge.target : edge.source;
        const songNode = findNode(otherNodeId);
        return songNode && songNode.type === 'song' ? songNode : null;
      })
      .filter(Boolean);
      
    if (connectedSongNodes.length === 0) {
      ElMessage.warning('该歌手未连接到任何歌曲，请先建立连接');
      return;
    }
    
    if (connectedSongNodes.length === 1) {
      const songNode = connectedSongNodes[0];
      const songIdMatch = songNode.id.match(/song-(\d+)/);
      if (!songIdMatch) {
        ElMessage.error('无法解析歌曲节点ID');
        return;
      }
      selectedSongId = parseInt(songIdMatch[1]);
    } else {
      // 如果连接了多个歌曲，显示选择对话框
      try {
        const result = await ElMessageBox.prompt(
          '请选择要上传授权书的歌曲',
          '选择歌曲',
          {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            inputType: 'select',
            inputValue: connectedSongNodes[0].id,
            inputPlaceholder: '请选择歌曲',
            inputOptions: connectedSongNodes.map(node => ({
              label: node.data.label,
              value: node.id
            }))
          }
        );
        
        if (result.value) {
          const selectedNode = connectedSongNodes.find(node => node.id === result.value);
          if (selectedNode) {
            const songIdMatch = selectedNode.id.match(/song-(\d+)/);
            if (!songIdMatch) {
              ElMessage.error('无法解析歌曲节点ID');
              return;
            }
            selectedSongId = parseInt(songIdMatch[1]);
          }
        } else {
          return; // 用户取消了选择
        }
      } catch (error) {
        return; // 用户取消了选择
      }
    }
  }

  // 开始上传
  loading.value = true;
  
  try {
    console.log('准备上传授权文件:', {
      albumId,
      songId: selectedSongId,
      artistId,
      fileName: file.name,
      fileSize: file.size
    });
    
    // 使用FormData上传文件
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    // 使用axios直接上传文件
    const response = await axios.post(
      `${API_BASE_URL}/rights-chain/albums/${albumId}/songs/${selectedSongId}/artists/${artistId}/authorization-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    console.log('授权文件上传成功:', response.data);
    
    // 刷新权利链条缓存
    await refreshRightsChainCache();
    
    // 更新节点数据
    if (artistNode) {
      // 获取授权文件路径
      const authFile = response.data.authorization?.authorizationFile || response.data.filePath || true;
      
      // 初始化已授权歌曲列表（如果不存在）
      if (!artistNode.data.authorizedSongs) {
        artistNode.data.authorizedSongs = [];
      }
      
      // 初始化待授权歌曲列表（如果不存在）
      if (!artistNode.data.pendingAuthSongs) {
        artistNode.data.pendingAuthSongs = [];
      }
      
      // 获取歌曲节点
      const songNode = findNode(`song-${selectedSongId}`);
      
      // 添加新授权的歌曲到已授权列表
      const existsInAuthorized = artistNode.data.authorizedSongs.some(s => s.id === selectedSongId);
      if (!existsInAuthorized && songNode) {
        artistNode.data.authorizedSongs.push({
          id: selectedSongId,
          title: songNode.data.label,
          authFile: authFile
        });
      }
      
      // 从待授权列表中移除
      const pendingIndex = artistNode.data.pendingAuthSongs.findIndex(s => s.id === selectedSongId);
      if (pendingIndex !== -1) {
        artistNode.data.pendingAuthSongs.splice(pendingIndex, 1);
      }
      
      // 更新待上传授权书计数
      artistNode.data.pendingAuthCount = artistNode.data.pendingAuthSongs.length;
      
      console.log('更新歌手节点数据:', artistNode.data);
    }
    
    // 更新关联的连接线的颜色
    const edgeToUpdate = elements.value.find(el => 
      el.id === `edge-artist-${artistId}-song-${selectedSongId}` || 
      el.id === `e${artistNodeId}-song-${selectedSongId}` ||
      el.id === `esong-${selectedSongId}-${artistNodeId}`
    );
    
    if (edgeToUpdate) {
      // 更新边的颜色为绿色（授权成功）
      edgeToUpdate.style = { ...edgeToUpdate.style, stroke: '#10b981' };
      if (edgeToUpdate.data) {
        edgeToUpdate.data.hasAuthorization = true;
      } else {
        edgeToUpdate.data = { hasAuthorization: true };
      }
      console.log('已更新连接线颜色:', edgeToUpdate);
    }
    
    // 更新UI
    elements.value = [...elements.value];
    
    ElMessage.success('授权书上传成功');
    
  } catch (error) {
    console.error('授权书上传失败:', error);
    
    // 打印更详细的错误信息
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    
    ElMessage.error('授权书上传失败: ' + (error.response?.data?.message || error.message));
  } finally {
    loading.value = false;
    event.target.value = ''; // 清空文件输入，允许再次上传相同文件
  }
};
  
  // 添加预览文件的方法
  const previewFile = (filePath) => {
    console.log('尝试预览文件:', filePath);
    
    if (!filePath) {
      ElMessage.warning('未找到授权文件');
      return;
    }
    
    // 检查filePath是否是字符串
    if (typeof filePath !== 'string') {
      console.error('文件路径不是字符串:', filePath);
      ElMessage.error('文件路径格式错误');
      return;
    }
    
    // 如果filePath只是一个标记值（如"已上传"），则无法预览
    if (filePath === '已上传' || filePath === true) {
      console.warn('文件路径只是一个标记值，无法预览');
      ElMessage.warning('无法预览文件，请刷新页面后重试');
      return;
    }
    
    try {
      // 确保文件路径格式正确
      let previewPath = filePath;
      
      // 统一处理路径分隔符为正斜杠
      previewPath = previewPath.replace(/\\/g, '/');
      
      // 如果路径不包含http或https前缀，添加API基础URL
      if (!previewPath.startsWith('http://') && !previewPath.startsWith('https://')) {
        // 使用完整的https://www.acmetone.com格式
        const baseUrl = STATIC_BASE_URL;
        
        // 确保路径以/开头
        if (!previewPath.startsWith('/')) {
          previewPath = '/' + previewPath;
        }
        
        // 正确拼接URL
        previewPath = baseUrl + previewPath;
      }
      
      console.log('生成的预览URL:', previewPath);
      
      previewUrl.value = previewPath;
      previewLoaded.value = false;
      previewError.value = null;
      previewDialogVisible.value = true;
    } catch (error) {
      console.error('生成预览URL时出错:', error);
      ElMessage.error('无法预览文件: ' + error.message);
    }
  };
  
  // 添加删除授权书的方法
  const deleteAuthFile = async (artistNodeId, songId) => {
    try {
      // 确认删除
      await ElMessageBox.confirm(
        '确定要删除此授权书吗？删除后需要重新上传。',
        '删除授权书',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      // 从节点ID中提取实际的数据库ID
      const artistIdMatch = artistNodeId.match(/artist-(\d+)/);
      if (!artistIdMatch) {
        ElMessage.error('无法解析歌手节点ID');
        return;
      }
      
      const artistId = parseInt(artistIdMatch[1]);
      const albumId = route.params.id;
      
      // 显示加载状态
      loading.value = true;
      
      // 调用删除授权书API
      await rightsChainService.deleteSongArtistAuthorization(albumId, songId, artistId);
      
      // 更新UI
      const artistNode = findNode(artistNodeId);
      if (artistNode) {
        // 找到对应的已授权歌曲
        const songIndex = artistNode.data.authorizedSongs.findIndex(s => s.id === songId);
        if (songIndex !== -1) {
          // 从已授权歌曲列表中移除
          const songToMove = artistNode.data.authorizedSongs[songIndex];
          artistNode.data.authorizedSongs.splice(songIndex, 1);
          
          // 添加到待授权歌曲列表
          if (!artistNode.data.pendingAuthSongs) {
            artistNode.data.pendingAuthSongs = [];
          }
          
          artistNode.data.pendingAuthSongs.push({
            id: songId,
            title: songToMove.title
          });
          
          // 更新待上传授权书计数
          artistNode.data.pendingAuthCount = artistNode.data.pendingAuthSongs.length;
        }
        
        // 更新连接线颜色
        const edgeToUpdate = elements.value.find(el => 
          (el.source === artistNodeId && el.target === `song-${songId}`) || 
          (el.source === `song-${songId}` && el.target === artistNodeId)
        );
        
        if (edgeToUpdate) {
          // 更新边的颜色为红色（未授权）
          edgeToUpdate.style = { ...edgeToUpdate.style, stroke: '#ef4444' };
          if (edgeToUpdate.data) {
            edgeToUpdate.data.hasAuthorization = false;
          }
        }
        
        // 强制更新UI
        elements.value = [...elements.value];
      }
      
      // 刷新权利链条缓存
      await refreshRightsChainCache();
      
      ElMessage.success('授权书已成功删除');
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除授权书失败:', error);
        ElMessage.error('删除授权书失败: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      loading.value = false;
    }
  };
  
  // 处理预览错误
  const handlePreviewError = () => {
    console.error('预览加载失败');
    previewError.value = '无法加载预览，请检查文件是否存在';
  };
  
  // 添加节点位置变化处理函数
  const onNodesChange = debounce(async (changes) => {
    // 过滤出位置变化的节点
    const positionChanges = changes.filter(change => 
      change.type === 'position' && 
      change.position && 
      change.dragging === false
    );
    
    // 如果没有位置变化，不处理
    if (positionChanges.length === 0) return;
    
    console.log('检测到节点位置变化:', positionChanges);
    
    // 收集需要保存的节点位置
    const positions = positionChanges.map(change => {
      const node = findNode(change.id);
      return {
        id: change.id,
        position: node.position
      };
    });
    
    // 保存节点位置
    try {
      console.log('准备保存节点位置变化:', positions);
      console.log('当前专辑ID:', route.params.id);
      
      // 调用API保存位置
      const result = await saveNodesPositions(route.params.id, positions);
              console.log('节点位置变化保存成功, 响应:', result);
        
        // 在状态栏显示成功提示
        showStatusMessage('节点位置已更新');
    } catch (error) {
      console.error('保存节点位置变化失败:', error);
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误数据:', error.response.data);
      }
      
      // 在状态栏显示错误提示
      showStatusMessage('保存节点位置失败', 'error');
    }
  }, 500); // 500ms防抖，避免频繁保存

  // 预览专辑授权文件
  const previewAlbumAuthFile = (filePath) => {
    previewFile(filePath);
  };

  // 删除专辑授权文件
  const deleteAlbumAuthFile = async (albumId) => {
    try {
      // 确认删除
      await ElMessageBox.confirm(
        '确定要删除专辑授权书吗？删除后需要重新上传。',
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      // 调用API删除授权书
      const response = await authorizationService.deleteAuthorizationFile(albumId);
      
      if (response.success||response.message==='授权书已成功删除') {
        ElMessage.success('授权书已成功删除');
        
              // 更新专辑数据
      if (album.value) {
        album.value.authorizationFile = null;
      }
      
      // 刷新权利链条
      await refreshRightsChainCache();
      } else {
        ElMessage.error(response.message || '删除授权书失败');
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除授权书时出错:', error);
        ElMessage.error('删除授权书时出错');
      }
    }
  };
  
  // 创建文件上传引用
  const albumAuthFileInput = ref(null);
  
  // 触发专辑授权文件上传
  const triggerAlbumAuthFileUpload = () => {
    // 创建一个隐藏的文件输入元素
    if (!albumAuthFileInput.value) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.style.display = 'none';
      input.onchange = handleAlbumAuthFileUpload;
      document.body.appendChild(input);
      albumAuthFileInput.value = input;
    }
    
    // 触发文件选择
    albumAuthFileInput.value.click();
  };
  
  // 处理专辑授权文件上传
  const handleAlbumAuthFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (file.type !== 'application/pdf') {
      ElMessage.error('只能上传PDF文件');
      return;
    }
    
    // 检查文件大小
    if (file.size > 10 * 1024 * 1024) { // 10MB
      ElMessage.error('文件大小不能超过10MB');
      return;
    }
    
    try {
      // 显示上传中
      loading.value = true;
      showStatusMessage('正在上传授权书...', 'info');
      
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
        fileReader.readAsDataURL(file);
      });
      
      // 获取token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未登录');
      }
      
      // 构建请求数据
      const requestData = {
        base64Data: base64Data,
        fileName: file.name
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
      
      ElMessage.success('授权书上传成功');
      
              // 更新专辑数据
        if (album.value) {
          album.value.authorizationFile = response.data.authorizationFile || response.data.filePath;
        }
        
        // 刷新权利链条
        await refreshRightsChainCache();
      
      // 清空文件输入
      if (albumAuthFileInput.value) {
        albumAuthFileInput.value.value = '';
      }
      
      showStatusMessage('授权书已上传', 'success');
    } catch (error) {
      console.error('上传授权书时出错:', error);
      
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
      showStatusMessage('上传授权书时出错', 'error');
    } finally {
      loading.value = false;
    }
  };
  
  // 添加debounce函数
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }
  
  // 添加删除节点的函数
  const handleDeleteNode = async (nodeId) => {
    try {
      // 找到要删除的节点
      const nodeToDelete = findNode(nodeId);
      if (!nodeToDelete) {
        console.error('找不到要删除的节点:', nodeId);
        return;
      }

      // 确认删除
      await ElMessageBox.confirm(
        `确定要删除${nodeToDelete.type === 'song' ? '歌曲' : '歌手'} "${nodeToDelete.data.label}" 吗？`,
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      // 找到与该节点相关的所有边
      const connectedEdges = getConnectedEdges(nodeId);
      const edgeIds = connectedEdges.map(edge => edge.id);
      
      // 删除相关的边
      if (edgeIds.length > 0) {
        // 如果是歌手节点，需要更新相关歌曲的歌手关联
        if (nodeToDelete.type === 'artist') {
          // 找出所有连接的歌曲节点
          const connectedSongs = connectedEdges
            .map(edge => {
              const otherNodeId = edge.source === nodeId ? edge.target : edge.source;
              const songNode = findNode(otherNodeId);
              return songNode && songNode.type === 'song' ? songNode : null;
            })
            .filter(Boolean);
          
          // 更新每首歌曲的歌手关联
          for (const songNode of connectedSongs) {
            try {
              // 获取当前歌曲的所有关联歌手（不包括要删除的歌手）
              const allConnectedArtists = getConnectedEdges(songNode.id)
                .filter(edge => {
                  const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
                  if (otherNodeId === nodeId) return false; // 排除要删除的歌手
                  
                  const otherNode = findNode(otherNodeId);
                  return otherNode && otherNode.type === 'artist';
                })
                .map(edge => {
                  const otherNodeId = edge.source === songNode.id ? edge.target : edge.source;
                  return findNode(otherNodeId);
                });
              
              // 准备歌手数据
              const artistsData = allConnectedArtists.map(artist => ({
                id: artist.data.id,
                name: artist.data.label,
                realName: artist.data.realName || ''
              }));
              
              // 调用API更新歌手关联
              const albumId = route.params.id;
              const songId = songNode.data.id;
              
              console.log(`更新歌曲(${songId})的歌手关联，移除歌手(${nodeToDelete.data.id}):`, artistsData);
              
              await api.put(`/albums/${albumId}/songs/${songId}/artists`, {
                artists: artistsData
              });
            } catch (error) {
              console.error(`更新歌曲(${songNode.data.id})的歌手关联失败:`, error);
            }
          }
        }
        
        // 删除边
        elements.value = elements.value.filter(el => !edgeIds.includes(el.id));
      }
      
      // 如果是歌曲节点，需要从后端删除歌曲
      if (nodeToDelete.type === 'song') {
        try {
          const albumId = route.params.id;
          const songId = nodeToDelete.data.id;
          
          // 调用API删除歌曲
          await api.delete(`/albums/${albumId}/songs/${songId}`);
          console.log(`歌曲(${songId})删除成功`);
        } catch (error) {
          console.error('删除歌曲失败:', error);
          ElMessage.error('删除歌曲失败: ' + (error.response?.data?.message || error.message));
          return; // 如果删除失败，不继续删除节点
        }
      }
      
      // 如果是歌手节点，不从后端删除歌手，只从流程图中移除
      
      // 删除节点
      elements.value = elements.value.filter(el => el.id !== nodeId);
      
      // 如果删除的是当前选中的节点，清除选中状态
      if (selectedNode.value && selectedNode.value.id === nodeId) {
        selectedNode.value = null;
      }
      
      ElMessage.success(`${nodeToDelete.type === 'song' ? '歌曲' : '歌手'}已删除`);
      
      // 保存节点位置
      const positions = elements.value
        .filter(el => el.position)
        .map(el => ({
          id: el.id,
          position: el.position
        }));
      
      try {
        await saveNodesPositions(route.params.id, positions);
      } catch (error) {
        console.error('保存节点位置失败:', error);
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除节点失败:', error);
        ElMessage.error('删除节点失败: ' + error.message);
      }
    }
  };

  // 添加保存节点位置的函数
  const saveNodePositions = async () => {
    try {
      // 收集所有节点的位置信息
      const positions = elements.value
        .filter(el => el.position && (el.type === 'song' || el.type === 'artist' || el.type === 'album'))
        .map(el => ({
          id: el.id,
          position: el.position
        }));
      
      if (positions.length === 0) return;
      
      console.log('准备保存节点位置:', positions);
      console.log('当前专辑ID:', route.params.id);
      
      // 调用API保存位置
      const result = await saveNodesPositions(route.params.id, positions);
      console.log('节点位置保存成功, 响应:', result);
      
      // 在状态栏显示成功提示
      showStatusMessage('节点位置已保存');
    } catch (error) {
      console.error('保存节点位置失败:', error);
      if (error.response) {
        console.error('错误状态码:', error.response.status);
        console.error('错误数据:', error.response.data);
      }
      
      // 在状态栏显示错误提示
      showStatusMessage('保存节点位置失败', 'error');
    }
  };

  // 显示状态栏消息的函数
  const showStatusMessage = (message, type = 'success', duration = 3000) => {
    // 清除之前的定时器
    if (statusMessageTimer.value) {
      clearTimeout(statusMessageTimer.value);
      statusMessageTimer.value = null;
    }
    
    // 设置消息，根据类型添加前缀
    let formattedMessage = message;
    if (type === 'error') {
      formattedMessage = `❌ ${message}`;
    } else if (type === 'warning') {
      formattedMessage = `⚠️ ${message}`;
    } else if (type === 'success') {
      formattedMessage = `✅ ${message}`;
    } else if (type === 'info') {
      formattedMessage = `ℹ️ ${message}`;
    }
    
    // 检测结果消息会永久显示
    let isPermanentMessage = message.includes('检测完成') || message.includes('个错误') || message.includes('个警告');
    
    // 更新状态消息
    statusMessage.value = formattedMessage;
    
    // 只有非永久消息才会自动消失
    if (!isPermanentMessage && duration > 0) {
      statusMessageTimer.value = setTimeout(() => {
        // 确保不会清除检测结果消息
        if (!statusMessage.value.includes('检测完成')) {
          statusMessage.value = '';
        }
      }, duration);
    }
  };
  
  // 添加获取歌手数据的辅助函数
  const getArtistData = async (artistId, songId) => {
    try {
      console.log(`尝试获取歌手(${artistId})数据，歌曲ID: ${songId}`);
      
      // 验证参数
      if (!artistId || isNaN(Number(artistId))) {
        console.error(`无效的歌手ID: ${artistId}`);
        return null;
      }
      
      // 确保使用整数ID
      const normalizedArtistId = typeof artistId === 'string' ? parseInt(artistId) : artistId;
      
      // 添加albumId和songId参数，以便后端验证权限
      const response = await api.get(`/artists/${normalizedArtistId}`, {
        params: {
          albumId: route.params.id,
          songId: songId
        }
      });
      
      if (response.data) {
        console.log(`成功获取歌手(${normalizedArtistId})数据:`, response.data.name);
        return response.data;
      } else {
        console.warn(`API返回了空的歌手(${normalizedArtistId})数据`);
        return null;
      }
    } catch (error) {
      // 详细记录错误信息
      console.error(`获取歌手(${artistId})数据失败:`, error);
      
      if (error.response) {
        // 服务器响应了错误状态码
        console.error(`错误状态码: ${error.response.status}`);
        console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
        
        // 如果是权限问题，显示更友好的错误消息
        if (error.response.status === 403) {
          ElMessage.warning(`没有权限查看歌手(${artistId})信息`);
        } else if (error.response.status === 404) {
          ElMessage.warning(`歌手(${artistId})不存在`);
        }
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error('请求已发送但服务器未响应');
        ElMessage.error('网络错误，无法连接到服务器');
      } else {
        // 请求设置出错
        console.error(`请求设置错误: ${error.message}`);
      }
      
      return null;
    }
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
      
      // 处理浮点数ID - 转换为整数
      if (typeof artist.id === 'number' && !Number.isInteger(artist.id)) {
        const intId = Math.floor(artist.id);
        console.log(`歌手 ${artist.name} 的浮点数ID ${artist.id} 转换为整数 ${intId}`);
        artist.id = intId;
      }
      
      // 处理字符串数字ID - 转换为整数
      if (typeof artist.id === 'string' && !isNaN(parseInt(artist.id))) {
        const intId = parseInt(artist.id);
        console.log(`歌手 ${artist.name} 的字符串ID ${artist.id} 转换为整数 ${intId}`);
        artist.id = intId;
      }
      
      // 检查ID是否为有效的数字
      if (typeof artist.id !== 'number' || isNaN(artist.id)) {
        console.warn(`歌手 ${artist.name} 的ID无效:`, artist.id);
        // 生成临时ID
        artist.id = Math.floor(Date.now() / 1000) + index;
        console.log(`为歌手 ${artist.name} 生成临时ID: ${artist.id}`);
      }
    });
    
    // 记录拖拽后的歌手ID顺序
    const currentArtistIds = songForm.artists.map(artist => artist.id);
    
    console.log('拖拽后的歌手ID顺序:', currentArtistIds);
    console.log('歌手对象完整结构:', JSON.parse(JSON.stringify(songForm.artists)));
    
    // 无需额外操作，在提交表单时会将有序的歌手列表发送到后端
    // 后端会根据传入的顺序更新artists JSON字段
  };

  // 添加歌手搜索
  const artistSearchQuery = ref('');
  const artistsLoading = ref(false);
  const artistsList = ref([]);
  const filteredArtistsList = ref([]);
  const addArtistDialogVisible = ref(false);
  const addArtistFormRef = ref(null);
  const addingArtist = ref(false);

  // 获取歌手列表
  const fetchArtistsList = async () => {
    artistsLoading.value = true;
    try {
      // 获取所有歌手
      const response = await api.get('/artist-edit-requests/artists');
      artistsList.value = response.data.map(artist => ({
        ...artist,
        platforms: artist.platforms || {
          netease: artist.netease || '',
          qq: artist.qq || '',
          kugou: artist.kugou || '',
          kuwo: artist.kuwo || '',
          qishui: artist.qishui || '',
          spotify: artist.spotify || '',
          youtube: artist.youtube || '',
          appleMusic: artist.appleMusic || '',
          soundCloud: artist.soundCloud || ''
        }
      }));
      filterArtists();
    } catch (error) {
      console.error('获取歌手列表失败:', error);
      ElMessage.error('获取歌手列表失败');
    } finally {
      artistsLoading.value = false;
    }
  };

  // 过滤歌手列表
  const filterArtists = () => {
    if (!artistSearchQuery.value) {
      filteredArtistsList.value = [...artistsList.value];
      return;
    }
    
    const query = artistSearchQuery.value.toLowerCase();
    filteredArtistsList.value = artistsList.value.filter(
      artist => artist.name.toLowerCase().includes(query) || 
               (artist.realName && artist.realName.toLowerCase().includes(query))
    );
  };

  // 显示添加歌手对话框
  const showAddArtistDialog = () => {
    addArtistForm.value = {
      name: '',
      realName: '',
      id_number: '',
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
    addArtistDialogVisible.value = true;
  };
  
  // 验证平台链接
  const validateArtistPlatformUrl = (platform) => {
    const url = addArtistForm.value.platforms[platform];
    addArtistForm.value.platformsValid[platform] = validatePlatformUrl(url, platform);
  };

  // 将歌手添加到流程图
  const addArtistToFlow = (artist) => {
    // 计算新节点位置 - 在视图中心
    const { x, y } = project({
      x: flowWrapper.value.clientWidth / 2,
      y: flowWrapper.value.clientHeight / 2
    });
    
    // 创建新的歌手节点
    const newArtistNode = {
      id: `artist-${artist.id}`,
      type: 'artist',
      position: { x, y },
      data: {
        id: artist.id,
        label: artist.name,
        realName: artist.realName || '',
        authorizedSongs: [],
        pendingAuthSongs: [],
        pendingAuthCount: 0,
        platforms: artist.platforms || {
          netease: artist.netease || '',
          qq: artist.qq || '',
          kugou: artist.kugou || '',
          kuwo: artist.kuwo || '',
          spotify: artist.spotify || '',
          youtube: artist.youtube || '',
          appleMusic: artist.appleMusic || '',
          soundCloud: artist.soundCloud || ''
        }
      }
    };
    
    // 检查节点是否已存在
    const existingNode = elements.value.find(el => el.id === newArtistNode.id);
    if (existingNode) {
      ElMessage.warning(`歌手 "${artist.name}" 已存在于流程图中`);
      return;
    }
    
    // 添加节点到Vue Flow
    addNodes([newArtistNode]);
    elements.value.push(newArtistNode);
    
    // 保存节点位置
    saveNodePositions();
    
    ElMessage.success(`已添加歌手 "${artist.name}" 到流程图`);
  };

  // 歌手拖拽开始
  const onArtistItemDragStart = (event, artist) => {
    event.dataTransfer.effectAllowed = 'move';
    // 设置拖拽数据，包含歌手信息
    event.dataTransfer.setData('application/json', JSON.stringify(artist));
    event.dataTransfer.setData('application/vueflow-artist', 'true');
    event.target.classList.add('dragging');
  };

  // 提交新歌手
  const submitNewArtist = async () => {
    if (!addArtistFormRef.value) return;
    
    try {
      // 验证表单
      await addArtistFormRef.value.validate();
      
      // 验证所有平台链接
      let hasInvalidUrl = false;
      Object.keys(addArtistForm.value.platforms).forEach(platform => {
        if (addArtistForm.value.platforms[platform]) {
          const isValid = validatePlatformUrl(addArtistForm.value.platforms[platform], platform);
          addArtistForm.value.platformsValid[platform] = isValid;
          if (!isValid) hasInvalidUrl = true;
        }
      });
      
      // 如果有无效的链接，提示错误并中断提交
      if (hasInvalidUrl) {
        ElMessage.error('请修正无效的平台链接');
        return;
      }
      
      addingArtist.value = true;
      
      // 准备歌手数据
      const artistData = {
        name: addArtistForm.value.name,
        realName: addArtistForm.value.realName,
        id_number: addArtistForm.value.id_number,
        // 添加平台链接数据
        netease: addArtistForm.value.platforms.netease || null,
        qq: addArtistForm.value.platforms.qq || null,
        kugou: addArtistForm.value.platforms.kugou || null,
        kuwo: addArtistForm.value.platforms.kuwo || null,
        qishui: addArtistForm.value.platforms.qishui || null,
        spotify: addArtistForm.value.platforms.spotify || null,
        youtube: addArtistForm.value.platforms.youtube || null,
        appleMusic: addArtistForm.value.platforms.appleMusic || null,
        soundCloud: addArtistForm.value.platforms.soundCloud || null
      };
      
      // 调用API创建歌手
      const response = await api.post('/artists', artistData);
      
      if (response.data && response.data.id) {
        ElMessage.success(`歌手 "${response.data.name}" 创建成功`);
        
        // 添加到歌手列表
        const newArtist = {
          ...response.data,
          platforms: {
            netease: response.data.netease || '',
            qq: response.data.qq || '',
            kugou: response.data.kugou || '',
            kuwo: response.data.kuwo || '',
            qishui: response.data.qishui || '',
            spotify: response.data.spotify || '',
            youtube: response.data.youtube || '',
            appleMusic: response.data.appleMusic || '',
            soundCloud: response.data.soundCloud || ''
          }
        };
        
        artistsList.value.unshift(newArtist);
        filterArtists();
        
        // 直接将新歌手添加到流程图中
        addArtistToFlow(newArtist);
        
        // 关闭对话框
        addArtistDialogVisible.value = false;
      } else {
        ElMessage.error('创建歌手失败');
      }
    } catch (error) {
      console.error('创建歌手失败:', error);
      ElMessage.error(error.response?.data?.message || '创建歌手失败');
    } finally {
      addingArtist.value = false;
    }
  };

  const addArtistForm = ref({
    name: '',
    realName: '',
    id_number: '',
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

  const addArtistRules = ref({
    name: [
      { required: true, message: '请输入歌手艺名', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符之间', trigger: 'blur' }
    ],
    realName: [
      { required: true, message: '请输入歌手真实姓名', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符之间', trigger: 'blur' }
    ],
    id_number: [
      { required: true, message: '请输入歌手身份证号码', trigger: 'blur' },
      { pattern: /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[0-1])\d{3}[\dX]$/, message: '请输入有效的身份证号码', trigger: 'blur' }
    ]
  });

  // 添加保存边信息到localStorage的函数
  const saveEdgesToLocalStorage = () => {
    try {
      // 收集所有边的信息
      const edges = elements.value
        .filter(el => el.source && el.target) // 只选择边
        .map(el => ({
          id: el.id,
          source: el.source,
          target: el.target,
          sourceHandle: el.sourceHandle || null,
          targetHandle: el.targetHandle || null,
          type: el.type || 'default',
          // 只保留必要的样式信息，避免循环引用
          style: el.style ? {
            stroke: el.style.stroke,
            strokeWidth: el.style.strokeWidth
          } : {},
          // 只保留必要的数据，避免循环引用
          data: el.data ? {
            artistId: el.data.artistId,
            songId: el.data.songId,
            hasAuthorization: el.data.hasAuthorization,
            label: el.data.label
          } : {}
        }));
      
      if (edges.length === 0) return;
      
      console.log('保存边信息到localStorage:', edges);
      
      // 使用专辑ID作为key，确保不同专辑的边信息不会混淆
      const localEdgesKey = `album-${route.params.id}-edges`;
      localStorage.setItem(localEdgesKey, JSON.stringify(edges));
      
      console.log('边信息已保存到localStorage');
    } catch (error) {
      console.error('保存边信息到localStorage失败:', error);
    }
  };

  // 修复查找与歌手相连的歌曲节点的函数
  const findConnectedSongNodes = (artistNodeId) => {
    // 查找所有与该歌手相连的边
    const connectedEdges = elements.value.filter(el => 
      (el.source === artistNodeId || el.target === artistNodeId) && 
      el.type === 'edge'
    );
    
    const connectedSongNodes = [];
    
    for (const edge of connectedEdges) {
      const otherNodeId = edge.source === artistNodeId ? edge.target : edge.source;
      const otherNode = elements.value.find(el => el.id === otherNodeId);
      
      if (otherNode && otherNode.type === 'song') {
        connectedSongNodes.push(otherNode);
      }
    }
    
    console.log(`歌手节点${artistNodeId}连接的歌曲:`, connectedSongNodes.map(node => node.id));
    return connectedSongNodes;
  };

  // 添加问题面板相关的状态
  const problems = ref([]);
  const problemsVisible = ref(true);
  const problemsPanelCollapsed = ref(true); // 默认折叠

  // 切换问题面板折叠状态
  const toggleProblemsPanelCollapse = () => {
    // 添加动画效果
    const panel = document.querySelector('.problems-panel');
    if (panel) {
      // 如果当前是折叠状态，准备展开
      if (problemsPanelCollapsed.value) {
        // 先设置状态，触发CSS过渡
        problemsPanelCollapsed.value = false;
      } else {
        // 如果当前是展开状态，准备折叠
        problemsPanelCollapsed.value = true;
      }
      
      // 保存状态到本地存储，以便下次打开时保持相同状态
      localStorage.setItem('problems_panel_collapsed', problemsPanelCollapsed.value ? 'true' : 'false');
    } else {
      // 如果找不到面板元素，简单地切换状态
      problemsPanelCollapsed.value = !problemsPanelCollapsed.value;
    }
  };

  // 导航到问题相关的节点
  const navigateToNode = (problem) => {
    if (problem.nodeId) {
      // 查找节点
      const node = findNode(problem.nodeId);
      if (node) {
        // 选中节点
        selectedNode.value = node;
        
        // 居中显示节点
        const { fitView, setCenter } = useVueFlow();
        setCenter(node.position.x, node.position.y, { duration: 800, zoom: 1.2 });
        
        // 高亮显示节点
        highlightNode(problem.nodeId);
      }
    } else if (problem.edgeId) {
      // 查找边
      const edge = elements.value.find(el => el.id === problem.edgeId);
      if (edge) {
        // 选中边
        selectedEdge.value = edge;
        
        // 查找边连接的节点
        const sourceNode = findNode(edge.source);
        const targetNode = findNode(edge.target);
        
        if (sourceNode && targetNode) {
          // 计算边的中心点
          const centerX = (sourceNode.position.x + targetNode.position.x) / 2;
          const centerY = (sourceNode.position.y + targetNode.position.y) / 2;
          
          // 居中显示边
          const { setCenter } = useVueFlow();
          setCenter(centerX, centerY, { duration: 800, zoom: 1.2 });
          
          // 高亮显示边
          highlightEdge(problem.edgeId);
        }
      }
    }
  };

  // 高亮显示节点
  const highlightNode = (nodeId) => {
    // 移除所有高亮
    elements.value.forEach(el => {
      if (el.class) {
        el.class = el.class.replace(' highlight-element', '');
      }
    });
    
    // 添加高亮到指定节点
    const node = findNode(nodeId);
    if (node) {
      if (node.class) {
        node.class += ' highlight-element';
      } else {
        node.class = 'highlight-element';
      }
      
      // 更新元素以触发重新渲染
      elements.value = [...elements.value];
      
      // 3秒后移除高亮
      setTimeout(() => {
        node.class = node.class.replace(' highlight-element', '');
        elements.value = [...elements.value];
      }, 3000);
    }
  };

  // 高亮显示边
  const highlightEdge = (edgeId) => {
    // 移除所有高亮
    elements.value.forEach(el => {
      if (el.class) {
        el.class = el.class.replace(' highlight-element', '');
      }
    });
    
    // 添加高亮到指定边
    const edge = elements.value.find(el => el.id === edgeId);
    if (edge) {
      if (edge.class) {
        edge.class += ' highlight-element';
      } else {
        edge.class = 'highlight-element';
      }
      
      // 更新元素以触发重新渲染
      elements.value = [...elements.value];
      
      // 3秒后移除高亮
      setTimeout(() => {
        edge.class = edge.class.replace(' highlight-element', '');
        elements.value = [...elements.value];
      }, 3000);
    }
  };

  // 计算问题数量
  const problemCount = computed(() => problems.value.length);

  // 检查是否有错误级别的问题
  const hasErrors = computed(() => problems.value.some(p => p.level === 'error'));

  // 对问题进行排序，错误 > 警告 > 信息
  const sortedProblems = computed(() => {
    return [...problems.value].sort((a, b) => {
      const levelOrder = { error: 0, warning: 1, info: 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  });

  // 检测流程图中的问题
  const detectProblems = async () => {
    const newProblems = [];
    
    // 重置问题列表
    problems.value = [];
    
    // 在状态栏显示检测中的消息，这个消息会被检测结果替换
    showStatusMessage('正在检测问题...', 'info');
    
    // 检查专辑授权书 - 设置为严重级别(error)
    if (album.value && !album.value.authorizationFile) {
      newProblems.push({
        level: 'error', // 专辑授权书问题设为严重级别
        message: '专辑没有上传授权文件',
        location: `专辑: ${album.value.title || '未命名专辑'}`,
        nodeId: `album-${album.value.id}`,
        fixable: true,
        fix: () => {
          // 打开专辑授权文件上传对话框
          albumDialogVisible.value = true;
        }
      });
    }
    
    try {
      // 获取最新的专辑数据，包含歌曲和歌手关联信息
      const albumId = route.params.id;
      const response = await api.get(`/albums/${albumId}`);
      const albumData = response.data;
      
      console.log('问题检测 - 获取到的专辑数据:', albumData);
      
      if (albumData && albumData.songs) {
        // 检查所有歌曲节点是否有歌手
        const songNodes = elements.value.filter(el => el.type === 'song');
        
        for (const songNode of songNodes) {
          // 从节点ID中提取实际ID
          const songIdMatch = songNode.id.match(/song-(\d+)/);
          if (!songIdMatch) continue;
          
          const songId = parseInt(songIdMatch[1]);
          
          // 在API返回的数据中查找该歌曲
          const songData = albumData.songs.find(s => s.id === songId);
          
          if (songData) {
            // 检查音频文件 - 严重级别(error)
            if (!songData.wavFile) {
              newProblems.push({
                level: 'error',
                message: `歌曲 "${songNode.data.label}" 没有上传音频文件`,
                location: `节点ID: ${songNode.id}`,
                nodeId: songNode.id,
                fixable: true,
                fix: () => {
                  // 选中节点并打开属性面板
                  selectedNode.value = songNode;
                  wavFileInput.value.click();
                }
              });
            }
            
            // 检查歌词文件（仅对非纯音乐检查）- 严重级别(error)
            if (songData.language !== '纯音乐' && !songData.lyricsFile) {
              newProblems.push({
                level: 'error',
                message: `歌曲 "${songNode.data.label}" 没有上传歌词文件`,
                location: `节点ID: ${songNode.id}`,
                nodeId: songNode.id,
                fixable: true,
                fix: () => {
                  // 选中节点并打开属性面板
                  selectedNode.value = songNode;
                  lyricsFileInput.value.click();
                }
              });
            }
            
            // 检查翻译歌词文件（仅对英文和其他语言检查）- 警告级别(warning)
            if (['英文', '其他语言'].includes(songData.language) && !songData.translationLyricsFile) {
              newProblems.push({
                level: 'warning',
                message: `歌曲 "${songNode.data.label}" 没有上传翻译歌词文件`,
                location: `节点ID: ${songNode.id}`,
                nodeId: songNode.id,
                fixable: true,
                fix: () => {
                  // 选中节点并打开属性面板
                  selectedNode.value = songNode;
                  translationLyricsFileInput.value.click();
                }
              });
            }
            
            // 检查歌曲是否有关联歌手
            const hasArtists = songData.artists && 
                              (Array.isArray(songData.artists) ? 
                                songData.artists.length > 0 : 
                                Object.keys(songData.artists).length > 0);
            
            console.log(`问题检测 - 歌曲(${songId})${songData.title}的歌手关联情况:`, {
              artists: songData.artists,
              hasArtists: hasArtists
            });
            
            if (!hasArtists) {
              newProblems.push({
                level: 'error',
                message: `歌曲 "${songNode.data.label}" 没有关联歌手`,
                location: `节点ID: ${songNode.id}`,
                nodeId: songNode.id,
                fixable: false
              });
            }
          }
        }
        
        // 检查所有歌手节点是否有歌曲
        const artistNodes = elements.value.filter(el => el.type === 'artist');
        
        for (const artistNode of artistNodes) {
          // 从节点ID中提取实际ID
          const artistIdMatch = artistNode.id.match(/artist-(\d+)/);
          if (!artistIdMatch) continue;
          
          const artistId = parseInt(artistIdMatch[1]);
          
          // 检查是否有歌曲关联到该歌手
          let hasAssociatedSongs = false;
          
          for (const song of albumData.songs) {
            // 检查歌曲的artists字段是否包含该歌手ID
            let artists = song.artists;
            
            // 记录原始artists值用于调试
            const originalArtists = artists;
            
            // 处理可能的JSON字符串格式
            if (typeof artists === 'string') {
              try {
                artists = JSON.parse(artists);
                console.log(`解析歌曲(${song.id})的artists字符串:`, {
                  原始值: originalArtists,
                  解析后: artists
                });
              } catch (error) {
                console.error(`解析歌曲(${song.id})的artists字符串失败:`, error);
                // 保持原始值
              }
            }
            
            // 检查各种可能的格式
            if (artists) {
              if (Array.isArray(artists)) {
                // 处理纯数字数组 [1, 2, 3]
                hasAssociatedSongs = artists.some(a => {
                  if (typeof a === 'object' && a !== null) {
                    return a.id === artistId || a.id === String(artistId);
                  } else {
                    // 处理纯数字或字符串ID
                    return a === artistId || a === String(artistId) || parseInt(a) === artistId;
                  }
                });
              } else if (typeof artists === 'object') {
                // 处理对象格式 {0: {id: 1}, 1: {id: 2}}
                hasAssociatedSongs = Object.values(artists).some(a => {
                  if (typeof a === 'object' && a !== null) {
                    return a.id === artistId || a.id === String(artistId);
                  } else {
                    return a === artistId || a === String(artistId) || parseInt(a) === artistId;
                  }
                });
              }
            }
            
            // 添加详细的调试日志
            console.log(`检查歌曲(${song.id})${song.title}是否关联歌手(${artistId}):`, {
              原始artists值: originalArtists,
              处理后artists值: artists,
              歌手ID: artistId,
              是否关联: hasAssociatedSongs
            });
            
            if (hasAssociatedSongs) break;
          }
          
          console.log(`问题检测 - 歌手(${artistId})${artistNode.data.label}的歌曲关联情况:`, {
            hasAssociatedSongs: hasAssociatedSongs
          });
          
          if (!hasAssociatedSongs) {
            newProblems.push({
              level: 'warning', // 歌手没有关联歌曲设为警告级别
              message: `歌手 "${artistNode.data.label}" 没有关联歌曲`,
              location: `节点ID: ${artistNode.id}`,
              nodeId: artistNode.id,
              fixable: false
            });
          }
        }
      }
      
      // 检查所有连接是否有授权
      // 获取权利链条数据
      try {
        const rightsChainData = await api.get(`/rights-chain/albums/${albumId}/rights-chain`);
        console.log('问题检测 - 获取到的权利链条数据:', rightsChainData.data);
        
        if (rightsChainData.data && rightsChainData.data.songs) {
          // 首先从专辑数据中获取所有歌曲-歌手关联
          for (const songData of albumData.songs) {
            const songId = songData.id;
            const songNode = elements.value.find(el => el.type === 'song' && el.id === `song-${songId}`);
            if (!songNode) continue;
            
            // 获取歌曲关联的所有歌手
            const songArtists = Array.isArray(songData.artists) ? songData.artists : 
                              (typeof songData.artists === 'object' ? Object.values(songData.artists) : []);
            
            // 跳过没有歌手的歌曲
            if (!songArtists || songArtists.length === 0) continue;
            
            console.log(`检查歌曲 "${songData.title}" 的歌手授权情况:`, songArtists);
            
            // 在权利链条数据中查找该歌曲
            const rightsChainSongData = rightsChainData.data.songs.find(s => s.id === songId);
            const rightsChainArtists = rightsChainSongData?.artists || [];
            
            // 对每个关联的歌手检查授权状态
            for (const artistData of songArtists) {
              // 获取歌手ID（处理不同的数据结构）
              const artistId = typeof artistData === 'object' ? artistData.id : artistData;
              if (!artistId) continue;
              
              // 查找歌手节点
              const artistNode = elements.value.find(el => el.type === 'artist' && el.id === `artist-${artistId}`);
              if (!artistNode) continue;
              
              // 在权利链条数据中查找该歌手的授权信息
              const artistAuthData = rightsChainArtists.find(a => a.id === artistId);
              const hasAuthorization = artistAuthData && artistAuthData.authorization && artistAuthData.authorization.authorizationFile;
              
              // 如果没有授权，添加警告
              if (!hasAuthorization) {
                console.log(`歌手 "${artistNode.data.label}" 对歌曲 "${songNode.data.label}" 未授权`);
                
                newProblems.push({
                  level: 'warning', // 歌手授权书问题设为警告级别
                  message: `歌手 "${artistNode.data.label}" 对歌曲 "${songNode.data.label}" 未授权`,
                  location: `歌手ID: ${artistId}, 歌曲ID: ${songId}`,
                  nodeId: artistNode.id,
                  songId: songId,
                  artistId: artistId,
                  fixable: true,
                  fix: () => {
                    // 打开授权文件上传对话框
                    handleAuthFileUpload({
                      target: { files: [null] }
                    }, artistNode.id, songId);
                  }
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('获取权利链条数据失败:', error);
      }
    } catch (error) {
      console.error('获取专辑数据失败:', error);
    }
    
    // 更新问题列表
    problems.value = newProblems;
    
    console.log('检测到的问题:', problems.value);
    
    // 在状态栏显示检测结果
    if (problems.value.length === 0) {
      showStatusMessage('检测完成: 没有发现问题 ✓', 'success');
    } else {
      const errorCount = problems.value.filter(p => p.level === 'error').length;
      const warningCount = problems.value.filter(p => p.level === 'warning').length;
      
      if (errorCount > 0) {
        showStatusMessage(`检测完成: ${errorCount} 个错误, ${warningCount} 个警告`, 'error');
      } else {
        showStatusMessage(`检测完成: ${warningCount} 个警告`, 'warning');
      }
    }
  };

  // 刷新问题列表
  const refreshProblems = () => {
    showStatusMessage('正在刷新问题列表...', 'info');
    detectProblems();
  };

  // 应用快速修复
  const applyQuickFix = (problem) => {
    if (problem.fixable && problem.fix) {
      showStatusMessage('正在应用修复...', 'info');
      problem.fix();
      // 延迟刷新问题列表，确保修复操作完成
      setTimeout(() => {
        refreshProblems();
      }, 500);
    }
  };

  // 监听元素变化，自动检测问题
  watch(elements, () => {
    // 使用防抖，避免频繁调用API
    clearTimeout(detectProblemsTimer.value);
    detectProblemsTimer.value = setTimeout(() => {
      detectProblems();
    }, 1000);
  }, { deep: true });

  // 在组件挂载后初始化问题检测
  onMounted(() => {
    // 从本地存储中获取问题面板折叠状态
    const savedPanelState = localStorage.getItem('problems_panel_collapsed');
    if (savedPanelState !== null) {
      problemsPanelCollapsed.value = savedPanelState === 'true';
    }
    
    // 延迟执行以确保图表已加载
    setTimeout(() => {
      detectProblems();
    }, 2000); // 增加延迟时间，确保所有数据都已加载
  });

  // 添加防抖定时器
  const detectProblemsTimer = ref(null);

  // 添加不再提示的变量
const doNotShowAgain = ref(false);

// 添加隐藏连接提示的方法
const hideConnectionTips = () => {
  connectionTipsVisible.value = false;
  
  // 如果用户选择不再提示，保存到本地存储
  if (doNotShowAgain.value) {
    localStorage.setItem('connectionTipsHidden', 'true');
  }
};

// 监听不再提示复选框变化
watch(doNotShowAgain, (newVal) => {
  if (newVal) {
    localStorage.setItem('connectionTipsHidden', 'true');
  }
});
</script>

<style scoped>
@import url('/css/albumFlowEditer.css');

/* 按钮样式统一 */
.delete-btn {
  padding: 0 6px;
  height: 20px;
  min-height: unset;
  font-size: 12px;
  flex-shrink: 0;
  min-width: 36px;
}

/* 歌曲操作按钮容器 */
.song-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* 授权书状态样式 */
.auth-file-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.success-icon {
  color: #67c23a;
}

.warning-icon {
  color: #e6a23c;
}

.auth-actions {
  display: flex;
  gap: 8px;
}

/* 节点中的授权书状态 */
.node-auth {
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(103, 194, 58, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-auth.missing {
  background-color: rgba(230, 162, 60, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.missing-auth {
  color: #e6a23c;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.upload-btn {
  padding: 2px 8px;
  height: 24px;
  font-size: 12px;
  margin-left: 8px;
}

.view-btn {
  padding: 2px 6px;
  font-size: 12px;
}

  </style>  