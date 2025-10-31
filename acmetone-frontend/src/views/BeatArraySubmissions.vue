<template>
  <div class="beat-array-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <h2>节奏阵列投稿管理</h2>
          <div class="header-actions" v-if="beatArrayStore.isLoggedIn">
            <el-button type="primary" @click="showEmailSettings" size="small" icon="Setting">邮件模板设置</el-button>
            <span class="login-info">已登录账号: {{ beatArrayStore.loginEmail }}</span>
            <el-button type="danger" @click="handleLogout" size="small">登出</el-button>
          </div>
        </div>
      </template>

      <!-- 登录表单 -->
      <div v-if="!beatArrayStore.isLoggedIn" class="login-form">
        <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" label-width="100px">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="loginForm.email" placeholder="请输入节奏阵列平台邮箱"></el-input>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleLogin" :loading="beatArrayStore.loading">登录</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 投稿列表 -->
      <div v-else class="submissions-list">
        <!-- 厂牌选择器 -->
        <div class="label-selector">
          <div class="label-selector-header">
            <el-icon><Collection /></el-icon>
            <span>选择审核厂牌</span>
          </div>
          <div class="label-cards-container">
            <div v-if="beatArrayStore.labels && beatArrayStore.labels.length > 0" class="label-cards">
              <div 
                v-for="label in beatArrayStore.labels" 
                :key="label.id"
                class="label-card-item"
                :class="{ 'active': selectedLabelId === label.id }"
                @click="handleLabelChange(label.id)"
              >
                <div class="label-card-content">
                  <div class="label-badge" :class="{ 'root-admin': label.roleType === 'LabelRootAdmin' }">
                    {{ label.roleType === 'LabelRootAdmin' ? '主理人' : '管理员' }}
                  </div>
                  <div class="label-info">
                    <div class="label-name">{{ label.nameZh }}</div>
                    <div class="label-name-en">{{ label.nameEn }}</div>
                  </div>
                </div>
                <div class="label-selected-indicator" v-if="selectedLabelId === label.id">
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </div>
            <div v-else class="no-labels">
              暂无可管理的厂牌
            </div>
          </div>
        </div>

        <!-- 当前厂牌信息 -->
        <div class="current-label-info" v-if="beatArrayStore.currentLabel">
          <h3>
            <el-icon><Star /></el-icon>
            当前审核厂牌: 
            <span class="label-zh">{{ beatArrayStore.currentLabel.nameZh }}</span>
            <span class="label-en">{{ beatArrayStore.currentLabel.nameEn }}</span>
          </h3>
        </div>
        
        <!-- 筛选和排序工具栏 -->
        <div class="toolbar">
          <div class="filter-controls">
            <div class="filter-group status-filter-group">
              <span class="filter-label">状态</span>
              <div class="apple-segmented-control">
                <div 
                  class="segmented-item" 
                  :class="{ 'active': statusFilter === 'all' }"
                  @click="handleStatusFilter('all')"
                >
                  <div class="segmented-text">全部</div>
                  <span class="item-count" v-if="statusCounts.all > 0">{{ statusCounts.all }}</span>
                </div>
                <div 
                  class="segmented-item" 
                  :class="{ 'active': statusFilter === '0' }"
                  @click="handleStatusFilter('0')"
                >
                  <div class="segmented-text">待审核</div>
                  <span class="item-count" v-if="statusCounts['0'] > 0">{{ statusCounts['0'] }}</span>
                </div>
                <div 
                  class="segmented-item" 
                  :class="{ 'active': statusFilter === '1' }"
                  @click="handleStatusFilter('1')"
                >
                  <div class="segmented-text">审核中</div>
                  <span class="item-count" v-if="statusCounts['1'] > 0">{{ statusCounts['1'] }}</span>
                </div>
                <div 
                  class="segmented-item" 
                  :class="{ 'active': statusFilter === '2' }"
                  @click="handleStatusFilter('2')"
                >
                  <div class="segmented-text">已通过</div>
                  <span class="item-count" v-if="statusCounts['2'] > 0">{{ statusCounts['2'] }}</span>
                </div>
                <div 
                  class="segmented-item" 
                  :class="{ 'active': statusFilter === '-1' }"
                  @click="handleStatusFilter('-1')"
                >
                  <div class="segmented-text">未通过</div>
                  <span class="item-count" v-if="statusCounts['-1'] > 0">{{ statusCounts['-1'] }}</span>
                </div>
              </div>
            </div>
            
            <div class="advanced-filters">
              <div class="advanced-filters-toggle" @click="showAdvancedFilters = !showAdvancedFilters">
                <span>高级筛选</span>
                <el-icon class="toggle-icon" :class="{ 'is-active': showAdvancedFilters }">
                  <ArrowDown />
                </el-icon>
              </div>
              
              <div class="advanced-filters-content" v-show="showAdvancedFilters">
                <div class="filter-group">
                  <span class="filter-label">类型</span>
                  <el-select v-model="typeFilter" placeholder="选择类型" clearable @change="applyFilters" class="apple-select">
                    <el-option v-for="type in availableTypes" :key="type" :label="type" :value="type"></el-option>
                  </el-select>
                </div>
                
                <div class="filter-group">
                  <span class="filter-label">风格</span>
                  <el-select v-model="genreFilter" placeholder="选择风格" clearable @change="applyFilters" class="apple-select">
                    <el-option v-for="genre in availableGenres" :key="genre" :label="genre" :value="genre"></el-option>
                  </el-select>
                </div>
                
                <div class="filter-group">
                  <span class="filter-label">关键词</span>
                  <div class="search-input-wrapper">
                    <el-input 
                      v-model="searchQuery" 
                      placeholder="搜索标题/作者/用户" 
                      @input="applyFilters"
                      clearable
                      class="apple-input"
                    >
                      <template #prefix>
                        <el-icon><Search /></el-icon>
                      </template>
                    </el-input>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="toolbar-actions">
          <div class="sort-controls">
              <span class="sort-label">排序</span>
              <el-select v-model="sortOption" @change="handleSortChange" size="default" class="apple-select">
              <el-option label="创建时间 ↓" value="createdTime_desc"></el-option>
              <el-option label="创建时间 ↑" value="createdTime_asc"></el-option>
              <el-option label="更新时间 ↓" value="updatedTime_desc"></el-option>
              <el-option label="更新时间 ↑" value="updatedTime_asc"></el-option>
            </el-select>
          </div>
            
            <div class="toolbar-buttons">
              <el-button 
                type="default" 
                @click="resetFilters" 
                :disabled="!isFiltered"
                class="apple-button reset-button"
              >
                <el-icon><Delete /></el-icon>
                重置筛选
              </el-button>
              <el-button 
                type="primary" 
                @click="refreshSubmissions" 
                :loading="beatArrayStore.loading"
                class="apple-button refresh-button"
              >
                <el-icon><RefreshRight /></el-icon>
                刷新列表
              </el-button>
            </div>
          </div>
        </div>

        <!-- 加载中状态 -->
        <div v-if="beatArrayStore.loading" class="loading-state">
          <div class="submission-cards-container">
            <div class="submission-card is-loading" v-for="i in 6" :key="i">
              <div class="submission-card-content">
                <div class="submission-card-header skeleton-header"></div>
                <div class="submission-main-info">
                  <div class="skeleton-title"></div>
                  <div class="skeleton-author"></div>
                </div>
                <div class="submission-meta">
                  <div class="skeleton-meta" v-for="j in 2" :key="j"></div>
                </div>
                <div class="submission-user">
                  <div class="skeleton-user"></div>
                </div>
                <div class="submission-card-footer">
                  <div class="skeleton-button"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <el-alert
          v-if="beatArrayStore.error"
          :title="beatArrayStore.error"
          type="error"
          :closable="false"
          show-icon
          class="error-alert"
        ></el-alert>

        <!-- 没有数据提示 -->
        <el-empty v-if="!beatArrayStore.loading && beatArrayStore.submissions.length === 0" description="暂无投稿数据"></el-empty>

        <!-- 投稿表格列表 -->
        <div v-if="!beatArrayStore.loading && beatArrayStore.submissions.length > 0" class="submission-cards-container">
          <div 
            v-for="submission in beatArrayStore.submissions" 
            :key="submission.id"
            class="submission-card"
        >
            <div class="submission-card-content">
              <div class="submission-card-header">
                <div class="submission-status">
                  <div class="status-indicator" :class="`status-${submission.status}`">
                    <el-icon v-if="submission.status === 0"><WarningFilled /></el-icon>
                    <el-icon v-else-if="submission.status === 1"><InfoFilled /></el-icon>
                    <el-icon v-else-if="submission.status === 2"><CircleCheckFilled /></el-icon>
                    <el-icon v-else-if="submission.status === -1"><CircleCloseFilled /></el-icon>
                  </div>
                  <div class="status-text">{{ getStatusText(submission.status) }}</div>
                </div>
                <div class="submission-date">
                  <el-icon><Calendar /></el-icon>
                  {{ formatDateTime(submission.createdTime) }}
                </div>
              </div>
              
              <div class="submission-main-info">
                <h3 class="submission-title-text">{{ submission.title }}</h3>
                <div class="submission-author-text">{{ submission.author }}</div>
              </div>
              
              <div class="submission-meta">
                <div class="meta-item">
                  <div class="meta-label">类型</div>
                  <div class="meta-value">{{ submission.type }}</div>
                </div>
                <div class="meta-item">
                  <div class="meta-label">风格</div>
                  <div class="meta-value">{{ submission.genre }}</div>
                </div>
              </div>
              
              <div class="submission-user">
                <div class="user-label">用户信息</div>
                <div class="user-name">{{ submission.user.name }}</div>
                <div class="user-email">{{ submission.user.mail }}</div>
              </div>
              
              <div class="submission-card-footer">
              <el-button 
                  type="primary" 
                size="small" 
                  @click="showDetails(submission)"
                  class="details-button-card"
                ><el-icon><Document /></el-icon>查看详情</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-container" v-if="beatArrayStore.total > 0">
          <el-pagination
            background
            layout="prev, pager, next, jumper"
            :total="beatArrayStore.total"
            :page-size="beatArrayStore.pageSize"
            :current-page="beatArrayStore.currentPage"
            @current-change="handlePageChange"
          ></el-pagination>
        </div>
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailsDialogVisible" title="投稿详细信息" width="50%" max-width="600px" class="submission-detail-dialog" :fullscreen="$screen.xs">
      <template v-if="selectedSubmission">
        <div class="submission-detail-container">
          <!-- 左侧信息区域 -->
          <div class="detail-left-column">
            <!-- 主要信息卡片 -->
            <div class="apple-card primary-info-card">
              <!-- 状态标签 -->
              <div class="status-tag-wrapper">
                <div class="status-tag" :class="`status-${selectedSubmission.status}`">
                  <span class="status-icon">
                    <el-icon v-if="selectedSubmission.status === 0"><WarningFilled /></el-icon>
                    <el-icon v-else-if="selectedSubmission.status === 1"><InfoFilled /></el-icon>
                    <el-icon v-else-if="selectedSubmission.status === 2"><CircleCheckFilled /></el-icon>
                    <el-icon v-else-if="selectedSubmission.status === -1"><CircleCloseFilled /></el-icon>
                  </span>
                  <span>{{ getStatusText(selectedSubmission.status) }}</span>
              </div>
            </div>

              <!-- 标题和作者 -->
              <h2 class="submission-title">{{ selectedSubmission.title }}</h2>
              <div class="submission-author">{{ selectedSubmission.author }}</div>
              
              <!-- 链接信息 -->
              <div class="submission-link-wrapper">
                <a :href="selectedSubmission.link" target="_blank" class="submission-link">
                  <el-icon><Link /></el-icon>
                  <span>{{ selectedSubmission.link }}</span>
                </a>
                <div v-if="selectedSubmission.code" class="extract-code">
                  提取码: {{ selectedSubmission.code }}
              </div>
              </div>
            </div>

            <!-- 简略信息卡片 -->
            <div class="apple-card brief-info-card">
              <div class="brief-info-grid">
                <div class="brief-info-item">
                  <div class="brief-info-label">风格</div>
                  <div class="brief-info-value">{{ selectedSubmission.genre }}</div>
              </div>
                <div class="brief-info-item">
                  <div class="brief-info-label">类型</div>
                  <div class="brief-info-value">{{ selectedSubmission.type }}</div>
                </div>
                <div class="brief-info-item">
                  <div class="brief-info-label">用户</div>
                  <div class="brief-info-value">{{ selectedSubmission.user.name }}</div>
                </div>
                <div class="brief-info-item">
                  <div class="brief-info-label">创建于</div>
                  <div class="brief-info-value">{{ formatDateTime(selectedSubmission.createdTime) }}</div>
                </div>
              </div>
            </div>

            <!-- 折叠面板 -->
            <el-collapse v-model="activeInfoCollapse" class="apple-collapse">
              <el-collapse-item title="更多信息" name="more">
                <div class="apple-card detailed-info-card">
                  <!-- 用户信息 -->
                  <div class="detailed-info-section">
                    <div class="detailed-info-title">用户信息</div>
                    <div class="detailed-info-grid">
                      <div class="detailed-info-item">
                        <div class="detailed-info-label">邮箱</div>
                        <div class="detailed-info-value">{{ selectedSubmission.user.mail }}</div>
              </div>
                      <div class="detailed-info-item">
                        <div class="detailed-info-label">更新时间</div>
                        <div class="detailed-info-value">{{ formatDateTime(selectedSubmission.updatedTime) }}</div>
                  </div>
                    </div>
                    <div v-if="selectedSubmission.user.about" class="detailed-info-about">
                      <div class="detailed-info-label">用户简介</div>
                      <div class="detailed-info-about-content">{{ selectedSubmission.user.about }}</div>
            </div>
        </div>

                  <!-- 其他属性 -->
                  <div class="detailed-info-section">
                    <div class="detailed-info-title">其他属性</div>
                    <div class="detailed-info-grid">
                      <div class="detailed-info-item">
                        <div class="detailed-info-label">人声认证</div>
                        <div class="detailed-info-value">
                          <el-tag :type="selectedSubmission.vocalCertification ? 'success' : 'info'" size="small">
                            {{ selectedSubmission.vocalCertification ? '是' : '否' }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                    <div v-if="selectedSubmission.mark" class="detailed-info-remark">
                      <div class="detailed-info-label">备注</div>
                      <div class="detailed-info-remark-content">{{ selectedSubmission.mark }}</div>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <!-- 右侧审核区域 -->
          <div class="detail-right-column">
            <!-- 审核信息卡片 -->
            <div v-if="selectedSubmission.comment || selectedSubmission.reason" class="apple-card review-info-card">
              <div class="review-info-title">审核信息</div>
              <div v-if="selectedSubmission.comment" class="review-info-content">
                <div class="review-info-label">审核意见</div>
                <div class="review-info-text">{{ selectedSubmission.comment }}</div>
              </div>
              <div v-if="selectedSubmission.reason" class="review-info-content">
                <div class="review-info-label">拒绝原因</div>
                <div class="review-info-text reject-reason">{{ selectedSubmission.reason }}</div>
              </div>
            </div>

            <!-- 审核操作区域 -->
            <div v-if="selectedSubmission.status === 0 || selectedSubmission.status === 1" class="apple-card review-action-card">
              <div class="review-action-title">审核操作</div>
              <el-form label-position="top">
                <el-form-item label="审核意见">
                  <el-input
                    v-model="reviewComment"
                    type="textarea"
                    :rows="6"
                    placeholder="请输入审核意见，可以先输入简单内容，再点击下方AI按钮美化"
                    class="apple-textarea"
                  ></el-input>
                  <div class="ai-helper-hint">提示：可以先输入简单审核意见，再点击AI按钮美化</div>
                  <div class="ai-buttons">
                    <el-button 
                      type="primary" 
                      size="small" 
                      @click="generateAiReview(true)" 
                      :loading="generatingApproveReview"
                      class="apple-button"
                    >
                      <el-icon><Edit /></el-icon> AI美化通过意见
                    </el-button>
                    <el-button 
                      type="danger" 
                      size="small" 
                      @click="generateAiReview(false)" 
                      :loading="generatingRejectReview"
                      class="apple-button"
                    >
                      <el-icon><Edit /></el-icon> AI美化拒绝意见
                    </el-button>
                  </div>
                </el-form-item>
              </el-form>
              <div class="action-buttons">
          <el-button 
            type="success" 
                  @click="handleApproveInDetails" 
            :loading="approving === selectedSubmission.id"
                  icon="Check"
                  size="large"
                  class="apple-button approve-button"
          >通过</el-button>
          <el-button 
            type="danger" 
                  @click="handleRejectInDetails" 
            :loading="rejecting === selectedSubmission.id"
                  icon="Close"
                  size="large"
                  class="apple-button reject-button"
          >拒绝</el-button>
              </div>
            </div>

            <!-- 审核状态卡片 -->
            <div v-else class="apple-card review-status-card">
              <div class="review-status-title">审核状态</div>
              <div class="review-status-content">
                <el-tag :type="getStatusType(selectedSubmission.status)" size="large" class="review-status-tag">
                  {{ getStatusText(selectedSubmission.status) }}
                </el-tag>
                <p class="review-status-message">
                  {{ selectedSubmission.status === 2 ? '该投稿已通过审核' : selectedSubmission.status === -1 ? '该投稿已被拒绝' : '该投稿状态已更新' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 邮件模板设置对话框 -->
    <el-dialog v-model="emailSettingsDialogVisible" title="邮件模板设置" width="800px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="通过通知模板" name="approved">
          <el-form label-position="top">
            <el-form-item label="是否启用">
              <el-switch v-model="emailSettings.approved.enabled" />
            </el-form-item>
            <el-form-item label="邮件主题">
              <div class="input-with-variables">
                <el-input v-model="emailSettings.approved.subject" placeholder="请输入邮件主题" />
                <el-tooltip content="点击显示可用变量" placement="top">
                  <el-button class="subject-variables-toggle" type="text" @click="toggleSubjectVariables('approved')">
                    <el-icon><InfoFilled /></el-icon>
                  </el-button>
                </el-tooltip>
                <div class="subject-variables" :class="{ 'show': showApprovedSubjectVariables }">
                  <div class="variables-hint">点击插入变量：</div>
                  <el-tag 
                    v-for="variable in ['title', 'author', 'labelNameZh', 'labelNameEn']" 
                    :key="variable"
                    class="clickable-tag"
                    @click="insertSubjectVariable('approved', variable)"
                  >
                    {{ formatVariable(variable) }}
                  </el-tag>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="邮件模板内容">
              <el-alert
                title="可用变量"
                type="info"
                :closable="false"
                description="{{title}} - 作品标题, {{author}} - 作者名称, {{labelNameZh}} - 厂牌中文名, {{labelNameEn}} - 厂牌英文名, {{comment}} - 审核意见"
              />
              <div class="template-variables">
                <div class="variables-hint">点击下方变量标签可插入到模板中：</div>
                <el-tag 
                  v-for="variable in ['title', 'author', 'labelNameZh', 'labelNameEn', 'comment']" 
                  :key="variable"
                  class="clickable-tag"
                  @click="insertVariable('approved', variable)"
                >
                  {{ formatVariable(variable) }}
                </el-tag>
              </div>
              <el-input
                v-model="emailSettings.approved.template"
                type="textarea"
                :rows="10"
                placeholder="请输入邮件模板内容"
              />
              <div class="preview-hint">👇 滚动查看下方的HTML邮件预览效果 👇</div>
            </el-form-item>
            <el-form-item label="HTML预览">
              <div class="email-preview-container">
                <div class="email-preview-header">
                  <div><strong>主题:</strong> {{ getProcessedSubject('approved') }}</div>
                  <div><strong>收件人:</strong> 示例用户 &lt;user@example.com&gt;</div>
                  <div class="preview-note">以下是收件人收到的邮件效果预览：</div>
                </div>
                <div class="email-preview-content" v-html="getApprovedEmailPreview()"></div>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="拒绝通知模板" name="rejected">
          <el-form label-position="top">
            <el-form-item label="是否启用">
              <el-switch v-model="emailSettings.rejected.enabled" />
            </el-form-item>
            <el-form-item label="邮件主题">
              <div class="input-with-variables">
                <el-input v-model="emailSettings.rejected.subject" placeholder="请输入邮件主题" />
                <el-tooltip content="点击显示可用变量" placement="top">
                  <el-button class="subject-variables-toggle" type="text" @click="toggleSubjectVariables('rejected')">
                    <el-icon><InfoFilled /></el-icon>
                  </el-button>
                </el-tooltip>
                <div class="subject-variables" :class="{ 'show': showRejectedSubjectVariables }">
                  <div class="variables-hint">点击插入变量：</div>
                  <el-tag 
                    v-for="variable in ['title', 'author', 'labelNameZh', 'labelNameEn']" 
                    :key="variable"
                    class="clickable-tag"
                    @click="insertSubjectVariable('rejected', variable)"
                  >
                    {{ formatVariable(variable) }}
                  </el-tag>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="邮件模板内容">
              <el-alert
                title="可用变量"
                type="info"
                :closable="false"
                description="{{title}} - 作品标题, {{author}} - 作者名称, {{labelNameZh}} - 厂牌中文名, {{labelNameEn}} - 厂牌英文名, {{reason}} - 拒绝原因"
              />
              <div class="template-variables">
                <div class="variables-hint">点击下方变量标签可插入到模板中：</div>
                <el-tag 
                  v-for="variable in ['title', 'author', 'labelNameZh', 'labelNameEn', 'reason']" 
                  :key="variable"
                  class="clickable-tag"
                  @click="insertVariable('rejected', variable)"
                >
                  {{ formatVariable(variable) }}
                </el-tag>
              </div>
              <el-input
                v-model="emailSettings.rejected.template"
                type="textarea"
                :rows="10"
                placeholder="请输入邮件模板内容"
              />
              <div class="preview-hint">👇 滚动查看下方的HTML邮件预览效果 👇</div>
            </el-form-item>
            <el-form-item label="HTML预览">
              <div class="email-preview-container">
                <div class="email-preview-header">
                  <div><strong>主题:</strong> {{ getProcessedSubject('rejected') }}</div>
                  <div><strong>收件人:</strong> 示例用户 &lt;user@example.com&gt;</div>
                  <div class="preview-note">以下是收件人收到的邮件效果预览：</div>
                </div>
                <div class="email-preview-content" v-html="getRejectedEmailPreview()"></div>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="emailSettingsDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveEmailSettings">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { useBeatArrayStore } from '../stores/beatArray';
import { 
  Setting, 
  InfoFilled, 
  Edit, 
  Collection, 
  Check, 
  Star, 
  Calendar, 
  User, 
  Message, 
  Link,
  Document,
  ChatLineRound,
  Close,
  WarningFilled,
  CircleCheckFilled,
  CircleCloseFilled,
  Search,
  Delete,
  RefreshRight,
  ArrowDown
} from '@element-plus/icons-vue';
import axios from 'axios';
import '@/assets/css/beatArraySubmissions.css';
import { useWindowSize } from '@vueuse/core';
import { genres } from '@/utils/constants';

// 初始化store
const beatArrayStore = useBeatArrayStore();

// 屏幕尺寸响应式判断
const { width } = useWindowSize();
const $screen = computed(() => {
  return {
    xs: width.value < 768,
    sm: width.value >= 768 && width.value < 992,
    md: width.value >= 992 && width.value < 1200,
    lg: width.value >= 1200
  };
});

// 厂牌选择
const selectedLabelId = ref(parseInt(localStorage.getItem('beatArraySelectedLabelId')) || 112);

// 筛选状态
const statusFilter = ref('all');
const typeFilter = ref('');
const genreFilter = ref('');
const searchQuery = ref('');
const showAdvancedFilters = ref(false);

// 状态计数
const statusCounts = computed(() => {
  if (!beatArrayStore._originalSubmissions) return { all: 0, '0': 0, '1': 0, '2': 0, '-1': 0 };
  
  const originals = beatArrayStore._originalSubmissions;
  const counts = {
    all: originals.length,
    '0': 0,
    '1': 0,
    '2': 0,
    '-1': 0
  };
  
  // 计算每个状态的数量
  originals.forEach(submission => {
    const status = submission.status.toString();
    if (counts[status] !== undefined) {
      counts[status]++;
    }
  });
  
  return counts;
});

// 可用的类型选项
const availableTypes = computed(() => {
  const types = new Set();
  beatArrayStore.submissions.forEach(submission => {
    if (submission.type) {
      types.add(submission.type);
    }
  });
  return Array.from(types).sort();
});

// 可用的流派选项
const availableGenres = computed(() => {
  return genres;
});

// 是否已经应用了筛选
const isFiltered = computed(() => {
  return statusFilter.value !== 'all' || 
         typeFilter.value !== '' || 
         genreFilter.value !== '' || 
         searchQuery.value.trim() !== '';
});

// 筛选方法
const handleStatusFilter = (status) => {
  statusFilter.value = status;
  
  // 如果还没有原始数据的副本，创建一个
  if (!beatArrayStore._originalSubmissions) {
    beatArrayStore._originalSubmissions = [...beatArrayStore.submissions];
  }
  
  applyFilters();
};

const applyFilters = () => {
  beatArrayStore.filterSubmissions({
    status: statusFilter.value === 'all' ? null : statusFilter.value,
    type: typeFilter.value,
    genre: genreFilter.value,
    query: searchQuery.value.trim()
  });
};

const resetFilters = () => {
  statusFilter.value = 'all';
  typeFilter.value = '';
  genreFilter.value = '';
  searchQuery.value = '';
  beatArrayStore.resetFilters();
};

// 登录表单
const loginForm = reactive({
  email: localStorage.getItem('beatArrayEmail') || '', // 尝试从localStorage获取之前的邮箱
  password: ''
});

// 登录表单规则
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6个字符', trigger: 'blur' }
  ]
};

// 引用
const loginFormRef = ref(null);

// 状态变量
const detailsDialogVisible = ref(false);
const emailSettingsDialogVisible = ref(false);
const selectedSubmission = ref(null);
const approving = ref(null);
const rejecting = ref(null);
const generatingApproveReview = ref(false);
const generatingRejectReview = ref(false);
const sortOption = ref('createdTime_desc'); // 默认按创建时间降序
const activeTab = ref('approved');
const showApprovedSubjectVariables = ref(false);
const showRejectedSubjectVariables = ref(false);
const reviewComment = ref(''); // 详情页面中的审核意见
const emailSettings = ref({
  approved: {
    enabled: true,
    subject: '',
    template: ''
  },
  rejected: {
    enabled: true,
    subject: '',
    template: ''
  }
});

// 计算属性
const sortOptionMap = {
  'createdTime_desc': { key: 'createdTime', method: -1 },
  'createdTime_asc': { key: 'createdTime', method: 1 },
  'updatedTime_desc': { key: 'updatedTime', method: -1 },
  'updatedTime_asc': { key: 'updatedTime', method: 1 }
};

// 方法
const handleLogin = async () => {
  if (!loginFormRef.value) return;
  
  try {
    await loginFormRef.value.validate();
    
    const result = await beatArrayStore.login(loginForm.email, loginForm.password);
    
    if (result.success) {
      ElMessage.success('登录成功');
      loginForm.password = ''; // 清空密码
      
      // 如果登录成功，同步厂牌ID
      if (beatArrayStore.labelId) {
        selectedLabelId.value = beatArrayStore.labelId;
      }
      
      console.log('登录成功后的厂牌列表:', beatArrayStore.labels);
      console.log('当前选中厂牌:', beatArrayStore.currentLabel);
    } else {
      ElMessage.error(result.message || '登录失败');
    }
  } catch (error) {
    console.error('登录表单验证错误:', error);
  }
};

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    beatArrayStore.logout();
    ElMessage.success('已退出登录');
  } catch (error) {
    // 用户取消了操作
  }
};

// 切换厂牌
const handleLabelChange = async (labelId) => {
  if (selectedLabelId.value === labelId) return; // 如果点击的是当前选中的厂牌，不做任何操作
  
  try {
    selectedLabelId.value = labelId; // 立即更新UI
    const result = await beatArrayStore.switchLabel(labelId);
    
    if (!result.success) {
      ElMessage.error(result.message || '切换厂牌失败');
      // 恢复之前的选择
      selectedLabelId.value = beatArrayStore.labelId;
    } else {
      ElMessage.success(`已切换到厂牌: ${beatArrayStore.currentLabel.nameZh}`);
    }
  } catch (error) {
    console.error('切换厂牌错误:', error);
    ElMessage.error('切换厂牌失败');
    // 恢复之前的选择
    selectedLabelId.value = beatArrayStore.labelId;
  }
};

const refreshSubmissions = async () => {
  try {
    const result = await beatArrayStore.fetchSubmissions();
    
    if (!result.success) {
      ElMessage.error(result.message || '刷新投稿列表失败');
    }
  } catch (error) {
    console.error('刷新投稿列表错误:', error);
    ElMessage.error('刷新投稿列表失败');
  }
};

const handlePageChange = async (page) => {
  try {
    const result = await beatArrayStore.updatePage(page);
    
    if (!result.success) {
      ElMessage.error(result.message || '切换页面失败');
    }
  } catch (error) {
    console.error('切换页面错误:', error);
    ElMessage.error('切换页面失败');
  }
};

const handleSortChange = async () => {
  try {
    const { key, method } = sortOptionMap[sortOption.value];
    const result = await beatArrayStore.updateSort(key, method);
    
    if (!result.success) {
      ElMessage.error(result.message || '更新排序失败');
    }
  } catch (error) {
    console.error('更新排序错误:', error);
    ElMessage.error('更新排序失败');
  }
};

// 处理投稿审批 - 现在只用于显示详情
const showDetails = (submission) => {
  selectedSubmission.value = submission;
  detailsDialogVisible.value = true;
  reviewComment.value = ''; // 清空审核意见
};

// 在详情页面中处理通过操作
const handleApproveInDetails = async () => {
  try {
    if (!selectedSubmission.value) return;
  
    // 检查审核意见是否为空
    if (!reviewComment.value.trim()) {
      ElMessage.warning('请输入审核意见');
      return;
    }
    
    approving.value = selectedSubmission.value.id;
    
    // 获取当前选择的厂牌ID
    const labelId = selectedLabelId.value;
    
    // 处理投稿
    const result = await beatArrayStore.processSubmission(
      selectedSubmission.value.id, 
      'approve', 
      0, // 使用默认状态
      reviewComment.value, // 使用输入的审核意见
      labelId
    );
    
    if (result.success) {
      ElMessage.success('已通过该投稿');
      detailsDialogVisible.value = false;
      reviewComment.value = ''; // 清空审核意见
      await refreshSubmissions(); // 刷新列表
    } else {
      ElMessage.error(result.message || '操作失败');
    }
  } catch (error) {
    console.error('通过投稿出错:', error);
    ElMessage.error('通过投稿失败');
  } finally {
    approving.value = null;
  }
};

// 在详情页面中处理拒绝操作
const handleRejectInDetails = async () => {
  try {
    if (!selectedSubmission.value) return;
    
    // 检查审核意见是否为空
    if (!reviewComment.value.trim()) {
      ElMessage.warning('请输入拒绝原因');
      return;
    }
    
    rejecting.value = selectedSubmission.value.id;
    
    // 获取当前选择的厂牌ID
    const labelId = selectedLabelId.value;
    
    // 处理投稿
    const result = await beatArrayStore.processSubmission(
      selectedSubmission.value.id, 
      'reject', 
      0, // 使用默认状态
      reviewComment.value, // 使用输入的拒绝原因
      labelId
    );
    
    if (result.success) {
      ElMessage.success('已拒绝该投稿');
      detailsDialogVisible.value = false;
      reviewComment.value = ''; // 清空审核意见
      await refreshSubmissions(); // 刷新列表
    } else {
      ElMessage.error(result.message || '操作失败');
    }
  } catch (error) {
    console.error('拒绝投稿出错:', error);
    ElMessage.error('拒绝投稿失败');
  } finally {
    rejecting.value = null;
  }
};

// 生成AI审核意见
const generateAiReview = async (isApprove) => {
  try {
    // 确保有选中的投稿
    if (!selectedSubmission.value) {
      ElMessage.warning('请先选择一个投稿');
      return;
    }
    
    // 设置加载状态
    if (isApprove) {
      generatingApproveReview.value = true;
    } else {
      generatingRejectReview.value = true;
    }

    // 准备请求数据
    const { title, author, genre, type } = selectedSubmission.value;
    
    // 获取用户当前输入的审核意见
    const currentComment = reviewComment.value.trim();
    
    // 调用后端API生成审核意见
    const response = await axios.post('/ai-chat/generate-review', {
      title,
      author,
      genre,
      type,
      isApprove,
      currentComment // 传递当前已输入的审核意见
    });
    
    if (response.data.success) {
      // 更新审核意见
      reviewComment.value = response.data.review;

      // 根据是否有原始输入给出不同提示
      if (currentComment) {
        ElMessage.success('已成功美化您输入的审核意见');
      } else {
        ElMessage.success('AI审核意见生成成功');
      }
    } else {
      ElMessage.error(response.data.message || 'AI审核意见生成失败');
    }
  } catch (error) {
    console.error('生成AI审核意见出错:', error);
    ElMessage.error('AI审核意见生成失败');
  } finally {
    generatingApproveReview.value = false;
    generatingRejectReview.value = false;
  }
};

// 辅助函数
const getStatusType = (status) => {
  const types = {
    '0': 'warning',  // 待审核
    '1': 'info',     // 审核中
    '2': 'success',  // 已通过
    '-1': 'danger'   // 未通过(已拒绝)
  };
  return types[status] || 'info';
};

const getStatusText = (status) => {
  const texts = {
    '0': '待审核',
    '1': '审核中',
    '2': '已通过',
    '-1': '未通过'
  };
  return texts[status] || '未知状态';
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// 显示邮件设置对话框
const showEmailSettings = async () => {
  try {
    // 显示加载中状态
    const loading = ElLoading.service({
      lock: true,
      text: '加载邮件设置中...',
      background: 'rgba(0, 0, 0, 0.7)'
    });
    
    // 获取邮件设置
    const result = await beatArrayStore.fetchEmailSettings();
    
    // 关闭加载状态
    loading.close();
    
    if (result.success) {
      // 更新本地邮件设置
      emailSettings.value = result.settings;
      // 显示对话框
      emailSettingsDialogVisible.value = true;
    } else {
      ElMessage.error(result.message || '获取邮件设置失败');
    }
  } catch (error) {
    console.error('获取邮件设置出错:', error);
    ElMessage.error('获取邮件设置出错');
  }
};

// 保存邮件设置
const saveEmailSettings = async () => {
  try {
    const result = await beatArrayStore.updateEmailSettings({
      approved: emailSettings.value.approved,
      rejected: emailSettings.value.rejected,
      labelId: selectedLabelId.value
    });
    
    if (result.success) {
      ElMessage.success('邮件设置已保存');
      emailSettingsDialogVisible.value = false;
    } else {
      ElMessage.error(result.message || '保存邮件设置失败');
    }
  } catch (error) {
    console.error('保存邮件设置出错:', error);
    ElMessage.error('保存邮件设置出错');
  }
};

// 生成HTML预览
const getApprovedEmailPreview = () => {
  // 示例数据
  const sampleData = {
    title: '晴天',
    author: '周杰伦',
    labelNameZh: '索尼音乐',
    labelNameEn: 'Sony Music',
    comment: '作品质量很好，符合我们的要求，已通过审核。'
  };
  
  // 替换主题中的变量
  let subject = emailSettings.value.approved.subject || '';
  Object.keys(sampleData).forEach(key => {
    subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), sampleData[key]);
  });
  
  // 替换模板变量
  let content = emailSettings.value.approved.template || '';
  Object.keys(sampleData).forEach(key => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), sampleData[key]);
  });
  
  // 将纯文本转换为HTML
  const htmlContent = content.split('\n').map(line => {
    if (!line.trim()) return '<p style="height: 10px;"></p>'; // 空行处理
    return `<p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 10px;">${line}</p>`;
  }).join('');
  
  // 添加邮件容器样式
  return `<div style="font-family: Arial, sans-serif; padding: 15px; border-radius: 5px; background-color: #fff;">
    <div class="email-preview-title">通过通知预览</div>
    ${htmlContent}
    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
      <p>此邮件由系统自动发送，请勿回复。</p>
      <p>&copy; ${new Date().getFullYear()} 极音记 版权所有</p>
    </div>
  </div>`;
};

// 生成拒绝邮件HTML预览
const getRejectedEmailPreview = () => {
  // 示例数据
  const sampleData = {
    title: '晴天',
    author: '周杰伦',
    labelNameZh: '索尼音乐',
    labelNameEn: 'Sony Music',
    reason: '作品不符合我们的风格要求，建议调整后再次投稿。'
  };
  
  // 替换主题中的变量
  let subject = emailSettings.value.rejected.subject || '';
  Object.keys(sampleData).forEach(key => {
    subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), sampleData[key]);
  });
  
  // 替换模板变量
  let content = emailSettings.value.rejected.template || '';
  Object.keys(sampleData).forEach(key => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), sampleData[key]);
  });
  
  // 将纯文本转换为HTML
  const htmlContent = content.split('\n').map(line => {
    if (!line.trim()) return '<p style="height: 10px;"></p>'; // 空行处理
    return `<p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 10px;">${line}</p>`;
  }).join('');
  
  // 添加邮件容器样式
  return `<div style="font-family: Arial, sans-serif; padding: 15px; border-radius: 5px; background-color: #fff;">
    <div class="email-preview-title">拒绝通知预览</div>
    ${htmlContent}
    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
      <p>此邮件由系统自动发送，请勿回复。</p>
      <p>&copy; ${new Date().getFullYear()} 极音记 版权所有</p>
    </div>
  </div>`;
};

// 插入模板变量
const insertVariable = (type, variable) => {
  // 直接使用模板类型来区分不同的文本框
  const variableText = '{{' + variable + '}}';
  
  if (type === 'approved') {
    // 获取当前光标位置
    const textarea = document.querySelector('textarea[placeholder="请输入邮件模板内容"]');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // 在光标位置插入变量
      emailSettings.value.approved.template = text.substring(0, start) + variableText + text.substring(end);
      
      // 聚焦并设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 10);
    } else {
      // 如果找不到文本框，直接追加到末尾
      emailSettings.value.approved.template += variableText;
    }
  } else {
    // 拒绝模板
    const textarea = document.querySelector('textarea[placeholder="请输入邮件模板内容"]:last-of-type');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // 在光标位置插入变量
      emailSettings.value.rejected.template = text.substring(0, start) + variableText + text.substring(end);
      
      // 聚焦并设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 10);
    } else {
      // 如果找不到文本框，直接追加到末尾
      emailSettings.value.rejected.template += variableText;
    }
  }
};

// 格式化变量
const formatVariable = (variable) => {
  return '{{' + variable + '}}';
};

// 插入主题变量
const insertSubjectVariable = (type, variable) => {
  // 直接使用模板类型来区分不同的文本框
  const variableText = '{{' + variable + '}}';
  
  if (type === 'approved') {
    // 获取当前光标位置
    const textarea = document.querySelector('textarea[placeholder="请输入邮件主题"]');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // 在光标位置插入变量
      emailSettings.value.approved.subject = text.substring(0, start) + variableText + text.substring(end);
      
      // 聚焦并设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 10);
    } else {
      // 如果找不到文本框，直接追加到末尾
      emailSettings.value.approved.subject += variableText;
    }
  } else {
    // 拒绝模板
    const textarea = document.querySelector('textarea[placeholder="请输入邮件主题"]:last-of-type');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // 在光标位置插入变量
      emailSettings.value.rejected.subject = text.substring(0, start) + variableText + text.substring(end);
      
      // 聚焦并设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableText.length, start + variableText.length);
      }, 10);
    } else {
      // 如果找不到文本框，直接追加到末尾
      emailSettings.value.rejected.subject += variableText;
    }
  }
};

// 切换主题变量面板
const toggleSubjectVariables = (type) => {
  if (type === 'approved') {
    showApprovedSubjectVariables.value = !showApprovedSubjectVariables.value;
    showRejectedSubjectVariables.value = false;
  } else {
    showRejectedSubjectVariables.value = !showRejectedSubjectVariables.value;
    showApprovedSubjectVariables.value = false;
  }
};

// 获取处理后的主题
const getProcessedSubject = (type) => {
  // 示例数据
  const sampleData = {
    title: '晴天',
    author: '周杰伦',
    labelNameZh: '索尼音乐',
    labelNameEn: 'Sony Music'
  };
  
  // 获取原始主题
  const originalSubject = type === 'approved' 
    ? emailSettings.value.approved.subject 
    : emailSettings.value.rejected.subject;
  
  // 替换变量
  let processedSubject = originalSubject || '';
  Object.keys(sampleData).forEach(key => {
    processedSubject = processedSubject.replace(new RegExp(`{{${key}}}`, 'g'), sampleData[key]);
  });
  
  return processedSubject;
};

// 添加折叠面板的状态控制
const activeInfoCollapse = ref(['more']);

// 生命周期钩子
onMounted(async () => {
  // 初始化节奏阵列状态
  await beatArrayStore.init();
  
  // 同步厂牌ID
  if (beatArrayStore.labelId) {
    selectedLabelId.value = beatArrayStore.labelId;
  }
  
  // 保存原始投稿列表以便筛选和计数
  if (beatArrayStore.submissions.length > 0 && !beatArrayStore._originalSubmissions) {
    beatArrayStore._originalSubmissions = [...beatArrayStore.submissions];
  }
});
</script>

<style scoped>
/* 基础样式保留在这里 */
.beat-array-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 其他基础样式... */

/* 高级样式已移至外部CSS文件: beatArraySubmissions.css */
</style> 