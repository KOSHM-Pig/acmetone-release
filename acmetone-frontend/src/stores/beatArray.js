import { defineStore } from 'pinia';
import { 
  loginToBeatArray, 
  getSubmissions, 
  processSubmission, 
  checkBeatArrayLoginStatus,
  logoutFromBeatArray,
  getUserLabels,
  fetchEmailSettings,
  updateEmailSettings
} from '../utils/beatArrayService';

/**
 * 对厂牌列表进行排序
 * 主理人角色(LabelRootAdmin)的厂牌排在前面，同类角色按厂牌中文名称排序
 * @param {Array} labels - 厂牌列表
 * @returns {Array} - 排序后的厂牌列表
 */
const sortLabelsByRole = (labels) => {
  return labels.sort((a, b) => {
    // 首先按角色排序（主理人优先）
    if (a.roleType === 'LabelRootAdmin' && b.roleType !== 'LabelRootAdmin') {
      return -1;
    }
    if (a.roleType !== 'LabelRootAdmin' && b.roleType === 'LabelRootAdmin') {
      return 1;
    }
    // 如果角色相同，按厂牌中文名称排序
    return a.nameZh.localeCompare(b.nameZh, 'zh-CN');
  });
};

export const useBeatArrayStore = defineStore('beatArray', {
  state: () => ({
    isLoggedIn: false,
    loading: false,
    submissions: [],
    total: 0,
    currentPage: 1,
    pageSize: 10,
    sortKey: 'createdTime',
    sortMethod: -1,
    labelId: parseInt(localStorage.getItem('beatArraySelectedLabelId')) || 112, // 当前选择的厂牌ID
    labels: [], // 用户拥有的厂牌列表
    loginEmail: '', // 存储登录邮箱
    error: null,
    userInfo: null, // 用户信息
    filter: '', // 新增的筛选字段
    filteredLabels: [], // 新增的筛选后的厂牌列表
    _originalSubmissions: null // 用于筛选的原始投稿列表
  }),
  
  getters: {
    // 获取当前选中的厂牌信息
    currentLabel: (state) => {
      if (!state.labels.length) return null;
      return state.labels.find(label => label.id === state.labelId) || state.labels[0];
    }
  },
  
  actions: {
    /**
     * 初始化状态，检查登录状态
     */
    async init() {
      this.loading = true;
      try {
        // 检查是否已登录
        this.isLoggedIn = await checkBeatArrayLoginStatus();
        // 如果已登录，获取投稿列表
        if (this.isLoggedIn) {
          // 尝试从localStorage获取保存的邮箱
          this.loginEmail = localStorage.getItem('beatArrayEmail') || '';
          
          // 获取用户厂牌列表
          await this.fetchUserLabels();
          
          // 获取投稿列表
          await this.fetchSubmissions();
        }
      } catch (error) {
        console.error('初始化节奏阵列状态出错:', error);
        this.error = '初始化失败';
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 登录节奏阵列平台
     * @param {string} email - 邮箱
     * @param {string} password - 密码
     */
    async login(email, password) {
      this.loading = true;
      this.error = null;
      
      try {
        const result = await loginToBeatArray(email, password);
        
        if (result.success) {
          this.isLoggedIn = true;
          this.loginEmail = email;
          
          // 保存用户信息
          if (result.userInfo) {
            this.userInfo = result.userInfo;
          }
          
          // 保存厂牌列表
          if (result.labels && result.labels.length > 0) {
            // 对厂牌进行排序，主理人角色(LabelRootAdmin)的厂牌排在前面
            const sortedLabels = sortLabelsByRole(result.labels);
            
            this.labels = sortedLabels;
            
            // 如果本地没有选择厂牌，默认选择第一个
            if (!localStorage.getItem('beatArraySelectedLabelId') && this.labels.length > 0) {
              this.labelId = this.labels[0].id;
              localStorage.setItem('beatArraySelectedLabelId', this.labels[0].id);
            }
          }
          
          // 保存邮箱到localStorage，方便下次使用
          localStorage.setItem('beatArrayEmail', email);
          
          // 登录成功后获取投稿列表
          await this.fetchSubmissions();
          
          return { success: true, message: result.message };
        } else {
          this.error = result.message;
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('登录节奏阵列平台出错:', error);
        this.error = '登录请求失败';
        return { success: false, message: '登录请求失败' };
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 获取用户的厂牌列表
     */
    async fetchUserLabels() {
      if (!this.isLoggedIn) {
        this.error = '请先登录节奏阵列平台';
        return { success: false, message: '请先登录节奏阵列平台' };
      }
      
      try {
        
        const result = await getUserLabels();
        
        
        if (result.success) {
          // 对厂牌进行排序，主理人角色(LabelRootAdmin)的厂牌排在前面
          const sortedLabels = sortLabelsByRole(result.labels);
          
          this.labels = sortedLabels;
          this.userInfo = result.userInfo;
         
          
          // 如果没有选择厂牌或选择的厂牌不在列表中，默认选择第一个
          if ((!this.labelId || !this.labels.find(l => l.id === this.labelId)) && this.labels.length > 0) {
            this.labelId = this.labels[0].id;
            localStorage.setItem('beatArraySelectedLabelId', this.labels[0].id);
          }
          
          return { success: true, message: '获取厂牌列表成功' };
        } else {
          this.error = result.message;
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('获取用户厂牌列表出错:', error);
        this.error = '获取厂牌列表失败';
        return { success: false, message: '获取厂牌列表失败' };
      }
    },
    
    /**
     * 切换当前操作的厂牌
     * @param {number} labelId - 厂牌ID
     */
    async switchLabel(labelId) {
      if (!this.isLoggedIn) {
        this.error = '请先登录节奏阵列平台';
        return { success: false, message: '请先登录节奏阵列平台' };
      }
      
      // 验证厂牌ID是否在列表中
      if (!this.labels.find(l => l.id === labelId)) {
        this.error = '无效的厂牌ID';
        return { success: false, message: '无效的厂牌ID' };
      }
      
      this.labelId = labelId;
      localStorage.setItem('beatArraySelectedLabelId', labelId);
      
      // 切换厂牌后重置页码并刷新列表
      this.currentPage = 1;
      return await this.fetchSubmissions();
    },
    
    /**
     * 登出节奏阵列平台
     */
    logout() {
      logoutFromBeatArray();
      this.isLoggedIn = false;
      this.submissions = [];
      this.total = 0;
      this.userInfo = null;
      this.labels = []; // 清空厂牌列表
      // 不清除邮箱，方便下次登录
      
      // 清除本地存储的厂牌信息
      localStorage.removeItem('beatArrayLabels');
      localStorage.removeItem('beatArraySelectedLabelId');
      
    },
    
    /**
     * 获取投稿列表
     */
    async fetchSubmissions() {
      if (!this.isLoggedIn) {
        this.error = '请先登录节奏阵列平台';
        return { success: false, message: '请先登录节奏阵列平台' };
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        const params = {
          page: this.currentPage,
          pageSize: this.pageSize,
          sortKey: this.sortKey,
          sortMethod: this.sortMethod,
          labelId: this.labelId
        };
        
        const result = await getSubmissions(params);
        
        if (result.success) {
          this.submissions = result.list;
          this.total = result.total;
          
          // 保存原始数据副本用于筛选
          this._originalSubmissions = [...result.list];
          
          return { success: true, message: result.message };
        } else {
          this.error = result.message;
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('获取节奏阵列投稿列表出错:', error);
        this.error = '获取投稿列表失败';
        return { success: false, message: '获取投稿列表失败' };
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 更新分页信息并获取新的投稿列表
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     */
    async updatePage(page, pageSize = this.pageSize) {
      this.currentPage = page;
      this.pageSize = pageSize;
      return await this.fetchSubmissions();
    },
    
    /**
     * 更新排序信息并获取新的投稿列表
     * @param {string} key - 排序字段
     * @param {number} method - 排序方法（1:升序，-1:降序）
     */
    async updateSort(key, method) {
      this.sortKey = key;
      this.sortMethod = method;
      this.currentPage = 1; // 重置到第一页
      return await this.fetchSubmissions();
    },
    
    /**
     * 处理投稿审批
     * @param {string} submissionId - 投稿ID
     * @param {string} action - 审批动作（'approve'或'reject'）
     * @param {number} currentStatus - 当前状态（0:待审核, 1:审核中）
     * @param {string} comment - 审核意见（通过或拒绝的原因）
     */
    async processSubmission(submissionId, action, currentStatus = 0, comment = '', labelId = null) {
      if (!this.isLoggedIn) {
        this.error = '请先登录节奏阵列平台';
        return { success: false, message: '请先登录节奏阵列平台' };
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        // 从当前投稿列表中查找要处理的投稿详情
        const submission = this.submissions.find(item => item.id === submissionId);
        
        // 获取当前选中的厂牌信息
        const currentLabel = this.currentLabel;
        
        // 提取需要传递给邮件系统的信息
        const submissionInfo = submission ? {
          title: submission.title,
          author: submission.author,
          email: submission.user?.mail
        } : {};
        
        // 添加厂牌名称信息
        if (currentLabel) {
          submissionInfo.labelNameZh = currentLabel.nameZh || '节奏阵列';
          submissionInfo.labelNameEn = currentLabel.nameEn || 'Beat Array';
        }
        
        
        
        const result = await processSubmission(
          submissionId, 
          action, 
          currentStatus, 
          comment, 
          this.labelId,
          submissionInfo
        );
        
        if (result.success) {
          // 处理成功后刷新投稿列表
          await this.fetchSubmissions();
          return { success: true, message: result.message };
        } else {
          this.error = result.message;
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('处理节奏阵列投稿出错:', error);
        this.error = '处理投稿失败';
        return { success: false, message: '处理投稿失败' };
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取邮件模板设置
     * @returns {Promise<Object>} - 返回邮件设置
     */
    async fetchEmailSettings() {
      if (!this.isLoggedIn) {
        this.error = '请先登录节奏阵列平台';
        return { success: false, message: '请先登录节奏阵列平台' };
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        const result = await fetchEmailSettings();
        
        if (result.success) {
          return { 
            success: true, 
            settings: result.settings,
            message: '获取邮件设置成功' 
          };
        } else {
          this.error = result.message;
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('获取邮件设置出错:', error);
        this.error = '获取邮件设置失败';
        return { success: false, message: '获取邮件设置失败' };
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 更新邮件模板设置
     * @param {Object} settings - 邮件设置
     * @returns {Promise<Object>} - 返回更新结果
     */
    async updateEmailSettings(settings) {
      if (!this.isLoggedIn) {
        this.error = '请先登录节奏阵列平台';
        return { success: false, message: '请先登录节奏阵列平台' };
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        const result = await updateEmailSettings(settings);
        
        if (result.success) {
          return { success: true, message: '邮件设置更新成功' };
        } else {
          this.error = result.message;
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('更新邮件设置出错:', error);
        this.error = '更新邮件设置失败';
        return { success: false, message: '更新邮件设置失败' };
      } finally {
        this.loading = false;
      }
    },

    // 新增的筛选相关方法
    async applyFilter() {
      if (!this.isLoggedIn) {
        this.error = '请先登录节奏阵列平台';
        return { success: false, message: '请先登录节奏阵列平台' };
      }
      
      try {
        // 实现筛选逻辑
        this.filteredLabels = this.labels.filter(label => label.nameZh.includes(this.filter));
        return { success: true, message: '筛选成功' };
      } catch (error) {
        console.error('应用筛选出错:', error);
        this.error = '应用筛选失败';
        return { success: false, message: '应用筛选失败' };
      }
    },

    /**
     * 筛选投稿列表
     * @param {Object} filters - 筛选条件
     */
    filterSubmissions(filters) {
      this.loading = true;
      
      try {
        // 保存原始列表的副本
        if (!this._originalSubmissions) {
          this._originalSubmissions = [...this.submissions];
        }
        
        // 应用筛选
        let filtered = [...this._originalSubmissions];
        
        // 状态筛选
        if (filters.status !== null) {
          filtered = filtered.filter(item => item.status.toString() === filters.status);
        }
        
        // 类型筛选
        if (filters.type) {
          filtered = filtered.filter(item => item.type === filters.type);
        }
        
        // 风格筛选
        if (filters.genre) {
          filtered = filtered.filter(item => item.genre === filters.genre);
        }
        
        // 关键词搜索
        if (filters.query) {
          const query = filters.query.toLowerCase();
          filtered = filtered.filter(item => 
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.author && item.author.toLowerCase().includes(query)) ||
            (item.user && item.user.name && item.user.name.toLowerCase().includes(query)) ||
            (item.user && item.user.mail && item.user.mail.toLowerCase().includes(query))
          );
        }
        
        this.submissions = filtered;
        return { success: true, message: '筛选成功' };
      } catch (error) {
        console.error('筛选投稿出错:', error);
        return { success: false, message: '筛选失败' };
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * 重置筛选，恢复原始列表
     */
    resetFilters() {
      if (this._originalSubmissions) {
        this.submissions = [...this._originalSubmissions];
        this._originalSubmissions = null;
      }
      return { success: true, message: '重置筛选成功' };
    }
  }
}); 