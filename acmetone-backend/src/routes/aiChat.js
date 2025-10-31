const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const axios = require('axios');
const { ChatLog, User } = require('../models');
const rateLimit = require('express-rate-limit');

// API 配置
const API_CONFIG = {
  baseURL: 'https://api.siliconflow.cn/v1',
  apiKey: 'sk-tskigfapmhnfjicxkpzyxcvpfvlpsupiavgvyxczloetdjbg',
  model: 'Qwen/Qwen3-8B'
};

// 为游客创建请求限制器
const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP在15分钟内最多10次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: '请求过于频繁，请稍后再试或登录账号继续使用'
  },
  keyGenerator: (req) => {
    return req.ip; // 使用IP作为限制键
  }
});

// 为登录用户创建请求限制器 (更宽松)
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 每个用户在15分钟内最多50次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: '请求过于频繁，请稍后再试'
  },
  keyGenerator: (req) => {
    return req.user.id.toString(); // 使用用户ID作为限制键
  }
});

// 获取聊天历史
router.get('/history', auth, async (req, res) => {
  try {
    const logs = await ChatLog.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'userMessage', 'aiResponse', 'reasoningContent', 'status', 'createdAt']
    });
    
    res.json(logs);
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    res.status(500).json({ message: '获取聊天历史失败' });
  }
});

// 健康检查
router.get('/health', async (req, res) => {
  try {
    // 测试 AI API 连接
    const response = await axios.post(`${API_CONFIG.baseURL}/chat/completions`, {
      model: API_CONFIG.model,
      messages: [
        {
          role: "user",
          content: "Hello"
        }
      ],
      stream: false,
      max_tokens: 10
    }, {
      headers: {
        'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      status: 'ok',
      aiApiStatus: 'connected',
      model: API_CONFIG.model,
      message: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('[AI Chat] 健康检查失败:', error);
    
    res.status(500).json({
      status: 'error',
      aiApiStatus: 'disconnected',
      error: error.message
    });
  }
});

// 发送消息到 AI
router.post('/chat', auth, userLimiter, async (req, res) => {
  try {
    const { message, enableThinking = false } = req.body;
    
    if (!message) {
      return res.status(400).json({
        message: '消息内容不能为空'
      });
    }

    console.log(`[AI Chat] 用户 ${req.user.id} (${req.user.username}) 发送消息: ${message}, 启用思考: ${enableThinking}`);

    try {
      // 构建请求参数
      const requestParams = {
        model: API_CONFIG.model,
        messages: [
          {
            role: "user",
            content: message
          }
        ],
        stream: false,
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50
      };
      
      // 如果启用深度思考，添加相关参数
      if (enableThinking) {
        requestParams.enable_thinking = true;
        requestParams.thinking_budget = 4096;
      }
      
      const response = await axios.post(
        `${API_CONFIG.baseURL}/chat/completions`, 
        requestParams, 
        {
          headers: {
            'Authorization': `Bearer ${API_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      console.log(`[AI Chat] AI 回复: ${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}`);
      
      // 获取思考过程（如果有）
      let reasoningContent = null;
      if (enableThinking && response.data.choices[0].message.reasoning_content) {
        reasoningContent = response.data.choices[0].message.reasoning_content;
        console.log(`[AI Chat] 思考过程: ${reasoningContent.substring(0, 100)}${reasoningContent.length > 100 ? '...' : ''}`);
      }

      try {
        // 保存聊天记录
        await ChatLog.create({
          userId: req.user.id,
          userMessage: message,
          aiResponse: aiResponse,
          reasoningContent: reasoningContent || null,
          status: 'success'
        });
      } catch (dbError) {
        console.error('[AI Chat] 保存聊天记录失败:', dbError);
        // 即使保存失败，也继续返回 AI 回复
      }

      // 返回响应，包括思考过程（如果有）
      const responseData = {
        message: aiResponse
      };
      
      if (reasoningContent) {
        responseData.reasoning = reasoningContent;
      }

      res.json(responseData);
    } catch (apiError) {
      console.error('[AI Chat] API 请求失败:', apiError.message);
      if (apiError.response) {
        console.error('[AI Chat] API 响应:', apiError.response.status, apiError.response.data);
      }
      throw new Error('AI API 请求失败');
    }
  } catch (error) {
    console.error('[AI Chat] 请求失败:', error);
    
    // 记录错误
    if (req.user) {
      try {
        await ChatLog.create({
          userId: req.user.id,
          userMessage: req.body.message || '',
          aiResponse: error.message || '未知错误',
          status: 'error'
        });
      } catch (logError) {
        console.error('[AI Chat] 记录错误失败:', logError);
      }
    }

    res.status(500).json({
      message: 'AI 服务暂时不可用，请稍后再试'
    });
  }
});

// 发送消息到 AI (无需登录)
router.post('/chat/guest', guestLimiter, async (req, res) => {
  try {
    const { message, enableThinking = false } = req.body;
    
    if (!message) {
      return res.status(400).json({
        message: '消息内容不能为空'
      });
    }

    console.log(`[AI Chat] 游客 (${req.ip}) 发送消息: ${message}, 启用思考: ${enableThinking}`);

    try {
      // 构建请求参数
      const requestParams = {
        model: API_CONFIG.model,
        messages: [
          {
            role: "user",
            content: message
          }
        ],
        stream: false,
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50
      };
      
      // 如果启用深度思考，添加相关参数
      if (enableThinking) {
        requestParams.enable_thinking = true;
        requestParams.thinking_budget = 4096;
      }
      
      const response = await axios.post(
        `${API_CONFIG.baseURL}/chat/completions`, 
        requestParams, 
        {
          headers: {
            'Authorization': `Bearer ${API_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      console.log(`[AI Chat] AI 回复游客 (${req.ip}): ${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}`);
      
      // 获取思考过程（如果有）
      let reasoningContent = null;
      if (enableThinking && response.data.choices[0].message.reasoning_content) {
        reasoningContent = response.data.choices[0].message.reasoning_content;
        console.log(`[AI Chat] 思考过程: ${reasoningContent.substring(0, 100)}${reasoningContent.length > 100 ? '...' : ''}`);
      }

      // 返回响应，包括思考过程（如果有）
      const responseData = {
        message: aiResponse
      };
      
      if (reasoningContent) {
        responseData.reasoning = reasoningContent;
      }

      res.json(responseData);
    } catch (apiError) {
      console.error('[AI Chat] API 请求失败:', apiError.message);
      if (apiError.response) {
        console.error('[AI Chat] API 响应:', apiError.response.status, apiError.response.data);
      }
      throw new Error('AI API 请求失败');
    }
  } catch (error) {
    console.error('[AI Chat] 请求失败:', error);
    
    res.status(500).json({
      message: 'AI 服务暂时不可用，请稍后再试'
    });
  }
});

// 生成审核意见
router.post('/generate-review', auth, async (req, res) => {
  try {
    const { title, author, genre, type, isApprove = true, currentComment = '' } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 构建提示词
    let prompt = `请根据以下音乐作品信息，生成一个${isApprove ? '通过' : '拒绝'}的审核意见。`;
    prompt += `\n作品标题: ${title}`;
    
    if (author) prompt += `\n作者: ${author}`;
    if (genre) prompt += `\n风格: ${genre}`;
    if (type) prompt += `\n类型: ${type}`;
    
    // 添加用户当前输入的审核意见作为参考
    if (currentComment) {
      prompt += `\n用户已输入的审核意见: ${currentComment}`;
      prompt += `\n请在保留用户意见核心内容的基础上，对其进行美化、润色和适当拓展，使其更加专业、完整。`;
    } else {
      prompt += `\n请生成一个专业、有建设性的${isApprove ? '通过' : '拒绝'}意见，${isApprove ? '肯定作品的优点' : '指出作品的不足并给出改进建议'}。`;
    }
    
    prompt += `\n必须使用评委的语气，使用第二人称称呼制作人为"您"，语气要专业、权威但友好。`;
    
    // 添加示例
    if (isApprove) {
      prompt += `\n通过意见示例：
1. "经过评审团审核，您的作品《星空》展现了出色的编曲能力和独特的音乐视角。音色选择恰到好处，旋律流畅自然。期待您未来带来更多优秀作品。"
2. "恭喜您！评审团一致认为您的作品《海浪》在节奏把控和情感表达上达到了专业水准。您对音乐细节的处理令人印象深刻，符合我们厂牌的风格定位。"`;
    } else {
      prompt += `\n拒绝意见示例：
1. "感谢您投稿《雨天》。经评审团讨论，我们认为您的作品在混音方面还有提升空间，人声与背景音乐的平衡需要调整。建议您重新调整混音比例后再次提交。"
2. "评审团审核后认为，您的作品《山谷》在曲式结构上还需完善，过渡部分略显生硬。建议您重新编排过渡段落，增强作品的整体流畅性后再次投稿。"`;
    }
    
    prompt += `\n回复格式要求为JSON，包含以下字段：\n1. review: 审核意见内容（150字以内）`;

    // 调用SiliconFlow API
    const response = await axios.post(
      `${API_CONFIG.baseURL}/chat/completions`,
      {
        model: API_CONFIG.model,
        messages: [
          { 
            role: 'system', 
            content: '你是一个专业的音乐作品审核评委，擅长撰写简洁专业的审核意见，总是使用第二人称称呼制作人为"您"。' + 
                     (currentComment ? '你需要在保留用户原始意见核心内容的基础上进行美化和拓展。' : '')
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
        enable_thinking: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        }
      }
    );

    // 解析API响应
    const aiResponse = response.data.choices[0].message.content;
    const parsedResponse = JSON.parse(aiResponse);

    // 返回生成的审核意见
    return res.json({
      success: true,
      review: parsedResponse.review
    });
  } catch (error) {
    console.error('生成审核意见失败:', error);
    return res.status(500).json({
      success: false,
      message: '生成审核意见失败',
      error: error.message
    });
  }
});

router.post('/generate-creative-prompt', auth, async (req, res) => {
  try {
    const { keywords, language = 'en' } = req.body; // Default to English

    let systemPromptContent, userPromptContent;

    if (language === 'zh') {
      systemPromptContent = '你是一位专业的专辑封面创意总监。你的任务是为AI绘画工具生成生动、富有想象力、描述详细的提示词。';
      userPromptContent = `请生成一段用于AI绘画的专辑封面提示词。`;

      if (keywords) {
        userPromptContent += ` 专辑的关键词是："${keywords}"。请以此为灵感。`;
      } else {
        userPromptContent += ` 用户未提供任何关键词，请创作一个具有普遍艺术性的概念。`;
      }
      userPromptContent += `\n提示词应该描述一个场景、一种情绪和一种风格。请用具体、生动的语言，避免使用通用术语。生成的提示词本身必须是中文。你的回答必须是一个 JSON 对象，格式为 {"prompt": "你生成的提示词内容"}。不要包含其他说明。`;

    } else { // English
      systemPromptContent = 'You are an expert creative director for album art. You generate descriptive, one-paragraph prompts for an AI image generator.';
      userPromptContent = `You are a creative director specializing in album art. Your task is to generate a vivid, imaginative, and descriptive prompt for an AI image generator to create a stunning album cover.`;

      if (keywords) {
        userPromptContent += ` The album has some keywords associated with it: "${keywords}". Use these as inspiration.`;
      } else {
        userPromptContent += ` The user has not provided any keywords, so create a universally cool and artistic concept.`;
      }
      userPromptContent += `\nThe prompt should describe a scene, a mood, and a style. Be specific and avoid generic terms. The prompt should be a single, continuous sentence or a few comma-separated clauses. The generated prompt content inside the JSON must be in English. Your response MUST be a JSON object with the format {"prompt": "your generated prompt content"}. Do not return any other text.`;
    }

    const response = await axios.post(
      `${API_CONFIG.baseURL}/chat/completions`,
      {
        model: API_CONFIG.model,
        messages: [
          { role: 'system', content: systemPromptContent },
          { role: 'user', content: userPromptContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 200,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    const parsedResponse = JSON.parse(aiResponse);

    res.json({
      success: true,
      prompt: parsedResponse.prompt
    });

  } catch (error) {
    console.error('Failed to generate creative prompt:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate creative prompt.',
      error: error.message
    });
  }
});

router.post('/generate-cover-template', auth, async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required.' });
    }

    const availableFontFamilies = [
      'Aemstel', 'Aemstel LineHorizontal', 'Aemstel LineInside', 'Aemstel LineOutside', 'Aemstel Shadow',
      'AiDeep', 'Coliner', 'HarmonyOS Sans SC', 'Monoline', 'Roline', 'Serenity', 'Arial', 'Verdana'
    ];

    const systemPrompt = `You are an expert album cover designer AI. Your goal is to translate a user's creative brief into a structured JSON definition for a template that will be used on a 3000x3000 pixel canvas.

You MUST output a valid JSON object with the following structure:
{
  "name": "A creative name for the template based on the user's prompt.",
  "definition": {
    "layers": [ /* An array of 2 to 5 layer objects */ ]
  }
}

--- LAYER DEFINITION ---
Each object in the "layers" array can be a "text" or "rectangle" type.

**1. TEXT LAYER:**
{
  "type": "text",
  "placeholder": "Must be 'title', 'performers', or 'displayInfo'. Use 'title' and 'performers' for main elements.",
  "fontFamily": "MUST be one of the available fonts listed below.",
  "fontWeight": "A string for weight, e.g., '400' (normal), '700' (bold). See font hints.",
  "fontSize": "A number. Reasonable range is 40 (for displayInfo) to 450 (for main titles).",
  "color": "A hex color code, with optional alpha, e.g., '#FFFFFF' or '#000000B3'.",
  "textAlign": "Must be 'left', 'center', or 'right'.",
  "gravity": "The anchor point on the 3000x3000 canvas. Must be one of: 'northwest', 'north', 'northeast', 'west', 'center', 'east', 'southwest', 'south', 'southeast'. 'south' anchors to the bottom-middle.",
  "offsetX": "Horizontal nudge from the gravity point in pixels. Reasonable range: -800 to 800.",
  "offsetY": "Vertical nudge from the gravity point in pixels. Reasonable range: -800 to 800.",
  "letterSpacing": "(Optional) A number, typically from -10 to 50.",
  "lineHeight": "(Optional) A multiplier, typically from 1.0 to 2.0."
}

**2. RECTANGLE LAYER:**
{
  "type": "rectangle",
  "width": "Width in pixels, e.g., 3000.",
  "height": "Height in pixels, e.g., 250.",
  "color": "Fill color, e.g., '#00000080' for a semi-transparent black overlay to improve text readability.",
  "gravity": "Same as for text layers.",
  "offsetX": "Same as for text layers.",
  "offsetY": "Same as for text layers."
}

--- AVAILABLE FONTS & HINTS ---
You MUST use a font from this list: ${availableFontFamilies.join(', ')}
- **Coliner & HarmonyOS Sans SC:** Clean, modern fonts with many weights (e.g., '300', '400', '700', '900'). Excellent for minimalist and professional designs.
- **Aemstel family:** Artistic and decorative. Good for stylized, impactful titles.
- **Monoline, Roline, Serenity, AiDeep:** Other decorative fonts for specific moods.
- **Arial, Verdana:** Safe, standard choices.

--- DESIGN PRINCIPLES ---
1. Create a balanced, professional layout.
2. Ensure the 'title' and 'performers' placeholders are the primary focus.
3. If using light text, consider adding a dark rectangle layer behind it to ensure readability over any background image.
4. The 'displayInfo' placeholder should be small and unobtrusive.

--- EXAMPLE ---
User request: "A modern, bold template for an electronic album"
Your JSON response:
{
  "name": "Kinetic Typography",
  "definition": {
    "layers": [
      {
        "type": "text",
        "placeholder": "performers",
        "fontFamily": "HarmonyOS Sans SC",
        "fontWeight": "300",
        "fontSize": 80,
        "color": "#FFFFFF",
        "textAlign": "center",
        "gravity": "north",
        "offsetX": 0,
        "offsetY": 250
      },
      {
        "type": "text",
        "placeholder": "title",
        "fontFamily": "Coliner",
        "fontWeight": "800",
        "fontSize": 350,
        "color": "#FFFFFF",
        "textAlign": "center",
        "gravity": "center",
        "offsetX": 0,
        "offsetY": 0,
        "letterSpacing": 10
      }
    ]
  }
}
---

Now, generate the JSON for the following user prompt.`;

    const response = await axios.post(
      `${API_CONFIG.baseURL}/chat/completions`,
      {
        model: API_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 1024,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    const parsedResponse = JSON.parse(aiResponse);

    // Basic validation of the AI's response
    if (!parsedResponse.name || !parsedResponse.definition || !Array.isArray(parsedResponse.definition.layers)) {
      throw new Error('AI returned an invalid template structure.');
    }

    res.json({
      success: true,
      template: parsedResponse
    });

  } catch (error) {
    console.error('Failed to generate cover template:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate cover template.',
      error: error.message
    });
  }
});

router.post('/generate-template-prompt', auth, async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!keywords) {
      return res.status(400).json({ success: false, message: 'Keywords are required.' });
    }

    const systemPrompt = `You are a creative assistant helping a user brainstorm ideas for an album cover template. Based on the user's keywords, generate a concise and descriptive prompt in Chinese for a graphic designer AI. This prompt should guide the AI in creating a template. The response must be a JSON object with a single key "prompt".

Example keywords: "民谣，手写体"
Example output: { "prompt": "一个简约的，适合民谣专辑的封面模板，包含居中对齐的手写体风格标题和位于底部的表演者信息，整体感觉要温暖、质朴。" }`;

    const response = await axios.post(
      `${API_CONFIG.baseURL}/chat/completions`,
      {
        model: API_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: keywords }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    const parsedResponse = JSON.parse(aiResponse);

    res.json({
      success: true,
      prompt: parsedResponse.prompt
    });

  } catch (error) {
    console.error('Failed to generate template prompt:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template prompt.',
      error: error.message
    });
  }
});

// 新增API端点：生成专辑简介
router.post('/generate-album-description', auth, async (req, res) => {
  try {
    const { title, displayInfo, performers, type = '专辑' } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：专辑名称'
      });
    }

    // 构建系统提示词
    const systemPrompt = `你是一位专业的音乐专辑文案撰写人，擅长为各种风格的音乐专辑创作富有感染力的简介。
你的文案风格既要专业又要有情感共鸣，能够准确传达音乐的氛围和艺术家的理念。`;

    // 构建用户提示词，包含专辑简介模板
    let userPrompt = `请为以下专辑创作一段简介文案：

【专辑名】${title}
【专辑类型】${type}
`;

    if (performers) {
      userPrompt += `【专辑表演者】${performers}\n`;
    }
    
    if (displayInfo) {
      userPrompt += `【发行外显】${displayInfo}\n`;
    }

    userPrompt += `
请创作一段简短的诗意文字（7-8行，每行不超过15字），描述专辑的情感和主题。风格要有深度、情感丰富且富有文学性，类似下面的示例：

"我所倾注的爱与热忱
不一定能换来热切的回应
有时候，我真切的依赖
反而会成为利用我的武器
我不是所爱，我只是工具
而我不愿再为某个人而活着
我要走到阳光下，做回我自己"

然后，请按照以下固定格式添加制作信息（替换【】中的内容）：

- 【专辑名】

Released by 【发行外显】

制作统筹 : 【发行外显】

母带工程师 : 【专辑表演者】

混音工程师 : 【专辑表演者】

视觉设计 : 【专辑表演者】

总监制 : 【发行外显】音乐事业部门

音乐发行 : Acmetone极音记

出品 : 【发行外显】

你的回复必须严格按照这个格式，保留所有换行，不要添加任何其他文字或解释。不要在开头添加任何换行符。直接从诗意文字开始。`;

    // 调用AI API
    const response = await axios.post(
      `${API_CONFIG.baseURL}/chat/completions`,
      {
        model: API_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 500,
        enable_thinking: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        }
      }
    );

    let description = response.data.choices[0].message.content;
    
    // 格式化输出，确保符合要求的格式
    if (!description.includes("Released by")) {
      // 如果AI没有按照模板输出，我们手动构建格式
      const poeticLines = description.split('\n').filter(line => line.trim() !== '').slice(0, 8);
      const poeticContent = poeticLines.join('\n');
      
      description = `${poeticContent}\n\nReleased by ${displayInfo || '【发行外显】'}\n\n制作统筹 : ${displayInfo || '【发行外显】'}\n\n母带工程师 : ${performers || '【专辑表演者】'}\n\n混音工程师 : ${performers || '【专辑表演者】'}\n\n视觉设计 : ${performers || '【专辑表演者】'}\n\n总监制 : ${displayInfo || '【发行外显】'}音乐事业部门\n\n音乐发行 : Acmetone极音记\n\n出品 : ${displayInfo || '【发行外显】'}`;
    }
    
    // 清理前面多余的换行符和"- 【专辑名】"行
    description = description.trim();
    
    // 移除可能存在的"- 【专辑名】"或实际专辑名行
    const lines = description.split('\n');
    if (lines[0].includes('【专辑名】') || lines[0].includes(title)) {
      lines.shift();
      description = lines.join('\n').trim();
    }
    
    // 处理诗意文字部分，为每行添加额外的换行
    const parts = description.split('Released by');
    if (parts.length === 2) {
      const poeticPart = parts[0].trim();
      const infoPart = 'Released by' + parts[1];
      
      // 为诗意文字的每一行添加额外的换行
      const poeticLines = poeticPart.split('\n');
      const formattedPoeticPart = poeticLines.join('\n\n');
      
      // 重新组合内容
      description = formattedPoeticPart + '\n\n' + infoPart;
    }
    
    // 替换所有【】中的占位符为实际值
    if (displayInfo) {
      description = description.replace(/【发行外显】/g, displayInfo);
      description = description.replace(/【ASPIRE SOUND】/g, displayInfo);
      // 通用替换任何包含"发行"或"出品"相关的【】标记
      description = description.replace(/【[^】]*(?:发行|出品|统筹|监制)[^】]*】/g, displayInfo);
    }
    
    if (performers) {
      description = description.replace(/【专辑表演者】/g, performers);
      description = description.replace(/【KOSHM】/g, performers);
      // 通用替换任何包含"工程师"或"设计"相关的【】标记
      description = description.replace(/【[^】]*(?:工程师|设计)[^】]*】/g, performers);
    }
    
    if (title) {
      description = description.replace(/【专辑名】/g, title);
      description = description.replace(/【云奕之海】/g, title);
      // 只替换明确是专辑名的【】标记
      description = description.replace(/【[^】]*(?:专辑名|专辑|唱片)[^】]*】/g, title);
    }
    
    // 检查是否还有未替换的【】标记
    if (description.includes('【') && description.includes('】')) {
      console.log('警告: 仍有未替换的【】标记');
      
      // 根据上下文智能替换剩余的【】标记
      const remainingBrackets = description.match(/【([^】]*)】/g);
      if (remainingBrackets) {
        remainingBrackets.forEach(bracket => {
          const content = bracket.substring(1, bracket.length - 1);
          
          // 根据内容决定替换为什么值
          if (/ASPIRE|发行|出品|统筹|监制/.test(content)) {
            description = description.replace(bracket, displayInfo || '');
          } else if (/KOSHM|工程师|设计/.test(content)) {
            description = description.replace(bracket, performers || '');
          } else {
            // 默认替换为空字符串
            description = description.replace(bracket, '');
          }
        });
      }
    }
    
    // 记录聊天日志（如果用户已登录）
    if (req.user) {
      try {
        await ChatLog.create({
          userId: req.user.id,
          userMessage: userPrompt,
          aiResponse: description,
          reasoningContent: response.data.choices[0].message.reasoning_content || null,
          status: 'success'
        });
      } catch (dbError) {
        console.error('[AI Chat] 保存聊天记录失败:', dbError);
      }
    }

    res.json({
      success: true,
      description: description
    });

  } catch (error) {
    console.error('生成专辑简介失败:', error);
    res.status(500).json({
      success: false,
      message: '生成专辑简介失败',
      error: error.message
    });
  }
});

// 添加新API端点：识别平台链接
router.post('/identify-platform-links', auth, userLimiter, async (req, res) => {
  try {
    const { links } = req.body;
    
    if (!links || !Array.isArray(links) || links.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供至少一个链接'
      });
    }

    console.log(`[AI Chat] 用户 ${req.user.id} (${req.user.username}) 请求识别平台链接: ${links.length} 个链接`);

    // 构建系统提示词
    const systemPrompt = `你是一个专业的音乐平台链接识别专家，擅长识别和规范化各种音乐平台的艺术家页面链接。
你的任务是分析用户提供的链接列表，识别每个链接所属的平台，并将其规范化为标准格式。
你需要检测以下平台的链接：
1. 网易云音乐 (netease) - 格式: https://music.163.com/#/artist?id=数字ID
2. QQ音乐 (qq) - 格式: https://y.qq.com/n/ryqq/singer/字母数字ID
3. 酷狗音乐 (kugou) - 格式: https://www.kugou.com/singer/info/字母数字ID
4. 酷我音乐 (kuwo) - 格式: https://kuwo.cn/singer_detail/数字ID
5. 汽水音乐 (qishui) - 格式: https://qishui.douyin.com/s/字母数字ID
6. Spotify (spotify) - 格式: https://open.spotify.com/artist/字母数字ID
7. YouTube (youtube) - 格式: https://music.youtube.com/channel/字母数字ID
8. Apple Music (appleMusic) - 格式: https://music.apple.com/国家代码/artist/名称/ID
9. SoundCloud (soundCloud) - 格式: https://soundcloud.com/用户名

对于每个链接，你需要：
1. 识别它属于哪个平台
2. 验证链接格式是否正确
3. 如果格式不正确但可以修复，提供修复后的链接
4. 如果链接无法识别或无法修复，标记为无效

请以JSON格式返回结果，包含以下字段：
1. identified_links: 包含成功识别的平台链接对象，键为平台名称，值为链接
2. corrected_links: 包含已修正的平台链接对象，键为平台名称，值为修正后的链接
3. invalid_links: 无法识别或无法修复的链接列表
4. summary: 简短的识别结果摘要`;

    // 构建用户提示词
    const userPrompt = `请识别并验证以下链接列表，判断它们分别属于哪个音乐平台，并按要求返回JSON格式结果：
${links.map((link, index) => `${index + 1}. ${link}`).join('\n')}

请记住，你的回复必须是一个有效的JSON对象，包含identified_links、corrected_links、invalid_links和summary字段。`;

    try {
      // 调用AI API
      const response = await axios.post(
        `${API_CONFIG.baseURL}/chat/completions`,
        {
          model: API_CONFIG.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 1024,
          enable_thinking: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.apiKey}`
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      const parsedResponse = JSON.parse(aiResponse);
      
      // 记录思考过程
      const reasoningContent = response.data.choices[0].message.reasoning_content || null;
      
      // 记录聊天日志
      try {
        await ChatLog.create({
          userId: req.user.id,
          userMessage: JSON.stringify(links),
          aiResponse: aiResponse,
          reasoningContent: reasoningContent,
          status: 'success'
        });
      } catch (dbError) {
        console.error('[AI Chat] 保存聊天记录失败:', dbError);
      }

      console.log(`[AI Chat] 平台链接识别结果: 成功识别 ${Object.keys(parsedResponse.identified_links || {}).length} 个链接，修正 ${Object.keys(parsedResponse.corrected_links || {}).length} 个链接，无效 ${(parsedResponse.invalid_links || []).length} 个链接`);

      res.json({
        success: true,
        identified_links: parsedResponse.identified_links || {},
        corrected_links: parsedResponse.corrected_links || {},
        invalid_links: parsedResponse.invalid_links || [],
        summary: parsedResponse.summary || '链接识别完成'
      });

    } catch (apiError) {
      console.error('[AI Chat] API 请求失败:', apiError.message);
      if (apiError.response) {
        console.error('[AI Chat] API 响应:', apiError.response.status, apiError.response.data);
      }
      throw new Error('AI API 请求失败');
    }
  } catch (error) {
    console.error('[AI Chat] 识别平台链接失败:', error);
    
    res.status(500).json({
      success: false,
      message: '识别平台链接失败，请稍后再试',
      error: error.message
    });
  }
});

module.exports = router; 