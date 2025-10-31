import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { useUserStore } from '@/stores/user';

const aiChatService = {
  async generateCreativePrompt(keywords) {
    const userStore = useUserStore();
    if (!userStore.token) {
      throw new Error('User is not authenticated.');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/ai-chat/generate-creative-prompt`,
        { keywords },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userStore.token}`,
          },
        }
      );
      
      if (response.data && response.data.success) {
        return response.data.prompt;
      } else {
        throw new Error(response.data.message || 'Failed to generate creative prompt.');
      }
    } catch (error) {
      console.error('Error in generateCreativePrompt service:', error);
      const message = error.response?.data?.message || error.message || 'An unknown error occurred.';
      throw new Error(message);
    }
  }
};

export default aiChatService; 