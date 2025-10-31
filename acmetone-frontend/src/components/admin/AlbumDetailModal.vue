<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>专辑详情</h2>
        <button class="close-btn" @click="$emit('close')">
          <i class="el-icon-close"></i>
        </button>
      </div>
      
      <div class="modal-content">
        <div class="album-overview">
          <div class="album-cover-large">
            <img :src="album.coverImage" :alt="album.title" />
            <div class="album-type-badge">{{ album.type }}</div>
          </div>
          
          <div class="album-details">
            <h3>{{ album.title }}</h3>
            <p class="artist-name">{{ album.performer }}</p>
            <div class="detail-row">
              <span class="label">发行日期:</span>
              <span class="value">{{ formatDate(album.releaseDate) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">状态:</span>
              <span class="value status" :class="album.status">{{ getStatusText(album.status) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">提交者:</span>
              <span class="value">{{ album.submittedBy?.username || '未知' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">创建时间:</span>
              <span class="value">{{ formatDate(album.createdAt) }}</span>
            </div>
          </div>
        </div>
        
        <div class="album-description">
          <h4>专辑描述</h4>
          <p>{{ album.description }}</p>
        </div>
        
        <div class="songs-section" v-if="album.songs && album.songs.length">
          <h4>歌曲列表</h4>
          <div class="songs-list">
            <div v-for="(song, index) in album.songs" :key="song.id" class="song-item">
              <span class="song-number">{{ index + 1 }}</span>
              <span class="song-title">{{ song.title }}</span>
              <span class="song-duration">{{ song.duration || '--:--' }}</span>
            </div>
          </div>
        </div>
        
        <div class="review-section" v-if="album.status === 'pending'">
          <h4>审核操作</h4>
          <div class="review-form">
            <el-input
              v-model="reviewComment"
              type="textarea"
              placeholder="请输入审核意见..."
              :rows="3"
              maxlength="500"
              show-word-limit
            />
            <div class="review-actions">
              <el-button 
                type="success" 
                @click="handleReview('approved')"
                :loading="reviewing"
              >
                通过审核
              </el-button>
              <el-button 
                type="danger" 
                @click="handleReview('rejected')"
                :loading="reviewing"
              >
                驳回申请
              </el-button>
            </div>
          </div>
        </div>
        
        <div class="material-section" v-if="album.status === 'approved'">
          <h4>物料传递管理</h4>
          <div class="material-controls">
            <div class="material-status">
              <el-switch
                v-model="materialDelivered"
                active-text="已传递"
                inactive-text="未传递"
                @change="handleMaterialDelivery"
              />
              <span v-if="album.materialDeliveredAt" class="delivery-time">
                传递时间: {{ formatDate(album.materialDeliveredAt) }}
              </span>
            </div>

            <div class="material-actions">
              <el-button
                type="primary"
                size="small"
                @click="downloadAlbumMaterials"
                :loading="downloadLoading"
              >
                下载专辑物料
              </el-button>
              <el-button
                type="success"
                size="small"
                @click="downloadAuthFile"
                v-if="album.authorizationFile"
              >
                下载授权书
              </el-button>
              <el-button
                type="info"
                size="small"
                @click="generateMaterialPackage"
                :loading="packageLoading"
              >
                生成物料包
              </el-button>
            </div>
          </div>
        </div>
        
        <div class="history-section" v-if="album.reviewHistory && album.reviewHistory.length">
          <h4>审核历史</h4>
          <div class="history-list">
            <div v-for="history in album.reviewHistory" :key="history.id" class="history-item">
              <div class="history-header">
                <span class="reviewer">{{ history.reviewer }}</span>
                <span class="review-time">{{ formatDate(history.createdAt) }}</span>
              </div>
              <div class="history-action">
                <span class="action" :class="history.action">{{ getActionText(history.action) }}</span>
              </div>
              <div class="history-comment" v-if="history.comment">
                {{ history.comment }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <el-button @click="$emit('close')">关闭</el-button>
        <el-button type="primary" @click="openAlbumDetail">查看完整信息</el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AlbumDetailModal',
  props: {
    album: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      reviewComment: '',
      reviewing: false,
      materialDelivered: false,
      downloadLoading: false,
      packageLoading: false
    }
  },
  mounted() {
    this.materialDelivered = this.album.materialDelivered || false
  },
  methods: {
    handleOverlayClick() {
      this.$emit('close')
    },
    
    async handleReview(action) {
      if (action === 'rejected' && !this.reviewComment.trim()) {
        this.$message.warning('驳回申请时必须填写审核意见')
        return
      }
      
      this.reviewing = true
      try {
        await this.$emit('action', {
          action,
          albumIds: [this.album.id],
          comment: this.reviewComment
        })
      } finally {
        this.reviewing = false
      }
    },
    
    async handleMaterialDelivery(delivered) {
      try {
        // 调用物料传递API
        this.$message.success(delivered ? '物料传递状态已更新' : '物料传递状态已取消')
      } catch (error) {
        this.$message.error('更新物料传递状态失败')
        this.materialDelivered = !delivered // 回滚状态
      }
    },
    
    openAlbumDetail() {
      // 跳转到专辑详情页面
      this.$router.push(`/admin/albums/${this.album.id}`)
    },
    
    formatDate(date) {
      if (!date) return '--'
      return new Date(date).toLocaleString('zh-CN')
    },
    
    getStatusText(status) {
      const statusMap = {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回'
      }
      return statusMap[status] || status
    },
    
    getActionText(action) {
      const actionMap = {
        approved: '通过审核',
        rejected: '驳回申请',
        submitted: '提交审核'
      }
      return actionMap[action] || action
    },

    async downloadAlbumMaterials() {
      this.downloadLoading = true
      try {
        // 准备下载数据
        const materialData = {
          album: {
            id: this.album.id,
            title: this.album.title,
            performer: this.album.performer,
            description: this.album.description,
            releaseDate: this.album.releaseDate,
            type: this.album.type,
            coverImage: this.album.coverImage
          },
          songs: this.album.songs || [],
          authorizationFile: this.album.authorizationFile,
          downloadTime: new Date().toISOString()
        }

        // 生成JSON文件下载
        const blob = new Blob([JSON.stringify(materialData, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${this.album.title}_物料包.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        this.$message.success('物料下载成功')
      } catch (error) {
        this.$message.error('物料下载失败')
        console.error(error)
      } finally {
        this.downloadLoading = false
      }
    },

    async downloadAuthFile() {
      if (!this.album.authorizationFile) {
        this.$message.warning('该专辑没有授权书文件')
        return
      }

      try {
        // 创建下载链接
        const link = document.createElement('a')
        link.href = this.album.authorizationFile
        link.download = `${this.album.title}_授权书.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        this.$message.success('授权书下载成功')
      } catch (error) {
        this.$message.error('授权书下载失败')
        console.error(error)
      }
    },

    async generateMaterialPackage() {
      this.packageLoading = true
      try {
        // 模拟生成物料包的过程
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 生成完整的物料包
        const packageData = {
          albumInfo: {
            id: this.album.id,
            title: this.album.title,
            performer: this.album.performer,
            description: this.album.description,
            releaseDate: this.album.releaseDate,
            type: this.album.type
          },
          materials: {
            coverImage: this.album.coverImage,
            songs: this.album.songs || [],
            authorizationFile: this.album.authorizationFile
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: 'Admin System',
            packageVersion: '1.0'
          }
        }

        // 下载物料包
        const blob = new Blob([JSON.stringify(packageData, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${this.album.title}_完整物料包_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        this.$message.success('物料包生成并下载成功')
      } catch (error) {
        this.$message.error('物料包生成失败')
        console.error(error)
      } finally {
        this.packageLoading = false
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.album-overview {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.album-cover-large {
  position: relative;
  width: 160px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.album-cover-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-type-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.album-details {
  flex: 1;
}

.album-details h3 {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.artist-name {
  font-size: 16px;
  color: #666;
  margin: 0 0 16px 0;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.detail-row .label {
  font-weight: 500;
  color: #666;
  width: 80px;
  flex-shrink: 0;
}

.detail-row .value {
  color: #1a1a1a;
}

.detail-row .value.status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.detail-row .value.status.pending {
  background: #fff3cd;
  color: #856404;
}

.detail-row .value.status.approved {
  background: #d4edda;
  color: #155724;
}

.detail-row .value.status.rejected {
  background: #f8d7da;
  color: #721c24;
}

.album-description,
.songs-section,
.review-section,
.material-section,
.history-section {
  margin-bottom: 24px;
}

.album-description h4,
.songs-section h4,
.review-section h4,
.material-section h4,
.history-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.album-description p {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.songs-list {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.song-item:last-child {
  border-bottom: none;
}

.song-number {
  width: 30px;
  color: #999;
  font-size: 14px;
}

.song-title {
  flex: 1;
  color: #1a1a1a;
  font-weight: 500;
}

.song-duration {
  color: #999;
  font-size: 14px;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-actions {
  display: flex;
  gap: 12px;
}

.material-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.material-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.delivery-time {
  color: #666;
  font-size: 14px;
}

.material-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reviewer {
  font-weight: 500;
  color: #1a1a1a;
}

.review-time {
  color: #999;
  font-size: 12px;
}

.history-action .action {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.history-action .action.approved {
  background: #d4edda;
  color: #155724;
}

.history-action .action.rejected {
  background: #f8d7da;
  color: #721c24;
}

.history-comment {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #eee;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .album-overview {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .album-cover-large {
    width: 120px;
    height: 120px;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .detail-row .label {
    width: auto;
  }
  
  .review-actions {
    flex-direction: column;
  }
  
  .modal-footer {
    flex-direction: column;
  }
}
</style>
