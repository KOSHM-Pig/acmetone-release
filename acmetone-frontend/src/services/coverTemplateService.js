import axios from 'axios';
import { API_BASE_URL } from '@/config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('用户未登录，无法执行此操作');
  }
  return { Authorization: `Bearer ${token}` };
};

export const coverTemplateService = {
  // Methods for managing templates
  async getAll() {
    try {
      const response = await axios.get(`${API_BASE_URL}/cover-templates`, { headers: getAuthHeaders() });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('获取模板失败');
    }
  },

  async create(templateData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/cover-templates`, templateData, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('创建模板失败');
    }
  },

  async update(id, templateData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/cover-templates/${id}`, templateData, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error)
    {
      throw error.response?.data || new Error('更新模板失败');
    }
  },

  async delete(id) {
    try {
      await axios.delete(`${API_BASE_URL}/cover-templates/${id}`, {
        headers: getAuthHeaders(),
      });
    } catch (error) {
      throw error.response?.data || new Error('删除模板失败');
    }
  },

  // Method for applying a template to an image
  async applyTemplate(payload) {
    // payload: { imageUrl, data, templateId?, definition? }
    try {
      const response = await axios.post(`${API_BASE_URL}/template-processor/apply-template`, payload, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('应用模板失败');
    }
  },

  async generateTemplateWithAi(prompt) {
    try {
      const response = await axios.post(`${API_BASE_URL}/ai-chat/generate-cover-template`, { prompt }, {
        headers: getAuthHeaders(),
      });
      if (response.data && response.data.success) {
        return response.data.template;
      }
      throw new Error(response.data.message || 'AI 生成模板失败');
    } catch (error) {
      throw error.response?.data || new Error('AI 生成模板请求失败');
    }
  },

  async generateTemplatePromptWithAi(keywords) {
    try {
      const response = await axios.post(`${API_BASE_URL}/ai-chat/generate-template-prompt`, { keywords }, {
        headers: getAuthHeaders(),
      });
      if (response.data && response.data.success) {
        return response.data.prompt;
      }
      throw new Error(response.data.message || 'AI 帮写失败');
    } catch (error) {
      throw error.response?.data || new Error('AI 帮写请求失败');
    }
  }
}; 