const express = require('express');
const router = express.Router();
const axios = require('axios');
const { auth } = require('../middleware/auth');

/**
 * 代理路由 - 用于处理第三方API请求，避免前端跨域问题
 * 目前支持的API:
 * - 网易云音乐歌手详情
 */

// 代理网易云音乐歌手详情API
router.get('/netease/artist', auth, async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: '请提供歌手ID' });
    }
    
    console.log('正在代理获取网易云音乐歌手信息，ID:', id);
    console.log('请求用户ID:', req.user.id, '用户名:', req.user.username);
    
    // 构建请求URL
    const apiUrl = `https://apis.netstart.cn/music/artist/detail?id=${id}`;
    console.log('请求网易云API:', apiUrl);
    
    // 发送请求到网易云API
    const response = await axios.get(apiUrl, {
      timeout: 10000, // 10秒超时
      headers: {
        // 避免发送不必要的头信息，尤其是避免传递authorization头
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });
    
    // 调试输出API响应
    console.log('网易云API响应状态码:', response.status);
    console.log('网易云API响应成功状态:', response.data.code === 200 ? '成功' : '失败');
    
    if (response.data && response.data.code === 200 && response.data.data && response.data.data.artist) {
      const artistData = response.data.data.artist;
      
      // 获取所有可能的图片字段
      const imageFields = ['avatar', 'avatarUrl', 'cover', 'img1v1Url', 'picUrl'];
      const availableImageFields = {};
      
      imageFields.forEach(field => {
        if (artistData[field]) {
          availableImageFields[field] = artistData[field];
        }
      });
      
      // 检查可能的其他图片字段
      Object.keys(artistData).forEach(key => {
        const value = artistData[key];
        if (typeof value === 'string' && 
            (value.includes('.jpg') || 
             value.includes('.png') || 
             value.includes('.jpeg')) && 
            !imageFields.includes(key)) {
          availableImageFields[key] = value;
          console.log(`发现额外的可能图片字段: ${key} = ${value}`);
        }
      });
      
      // 输出获取到的歌手信息关键字段
      console.log('获取到歌手信息:', {
        id: artistData.id,
        name: artistData.name,
        所有图片字段: availableImageFields,
        头像最终值: artistData.avatarUrl || artistData.avatar || artistData.cover || artistData.picUrl || artistData.img1v1Url || '无头像',
        别名数量: Array.isArray(artistData.alias) ? artistData.alias.length : 0,
        简介长度: artistData.briefDesc ? artistData.briefDesc.length : 0
      });
      
      // 分析API响应对象的完整结构，方便调试
      const logApiStructure = (data, prefix = '', maxDepth = 2, currentDepth = 0) => {
        if (currentDepth > maxDepth) return;
        
        if (typeof data === 'object' && data !== null) {
          Object.keys(data).forEach(key => {
            const value = data[key];
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null) {
              console.log(`${newPrefix}: [${Array.isArray(value) ? 'Array' : 'Object'}]`);
              logApiStructure(value, newPrefix, maxDepth, currentDepth + 1);
            } else if (typeof value === 'string' && 
                      (value.includes('.jpg') || 
                       value.includes('.png') || 
                       value.includes('.jpeg') || 
                       value.includes('img') || 
                       value.includes('avatar') || 
                       value.includes('image'))) {
              console.log(`${newPrefix}: "${value.substring(0, 100)}..."`);
            }
          });
        }
      };
      
      console.log('API响应结构分析:');
      logApiStructure(response.data);
    } else {
      console.warn('网易云API返回无效数据结构:', {
        hasData: !!response.data,
        code: response.data?.code,
        hasArtistData: !!(response.data?.data?.artist)
      });
    }
    
    // 直接返回API响应
    return res.json(response.data);
  } catch (error) {
    console.error('代理网易云音乐API失败:', error);
    
    // 输出详细错误信息
    if (error.response) {
      console.error('API响应错误状态码:', error.response.status);
      console.error('API响应错误数据:', error.response.data);
      console.error('API响应错误头信息:', error.response.headers);
    } else if (error.request) {
      console.error('API请求已发送但未收到响应:', error.request);
    } else {
      console.error('API请求错误:', error.message);
    }
    
    // 检查是否有响应
    if (error.response) {
      return res.status(error.response.status).json({
        message: '获取网易云音乐数据失败',
        error: error.response.data
      });
    }
    
    // 请求失败，可能是网络问题或超时
    return res.status(500).json({
      message: '获取网易云音乐数据失败',
      error: error.message
    });
  }
});

// 批量获取网易云音乐歌手信息
router.post('/netease/artists', auth, async (req, res) => {
  try {
    const { artistIds } = req.body;
    
    if (!artistIds || !Array.isArray(artistIds) || artistIds.length === 0) {
      return res.status(400).json({ message: '请提供有效的歌手ID列表' });
    }
    
    console.log(`批量获取网易云音乐歌手信息，共 ${artistIds.length} 个歌手`);
    console.log('请求用户ID:', req.user.id, '用户名:', req.user.username);
    console.log('歌手ID列表:', artistIds);
    
    // 限制并发请求数量，避免过多请求
    const MAX_CONCURRENT = 5;
    const results = [];
    const chunks = [];
    
    // 将请求分组
    for (let i = 0; i < artistIds.length; i += MAX_CONCURRENT) {
      chunks.push(artistIds.slice(i, i + MAX_CONCURRENT));
    }
    
    console.log(`将请求分为 ${chunks.length} 组处理，每组最多 ${MAX_CONCURRENT} 个请求`);
    
    // 逐组处理请求
    for (const [chunkIndex, chunk] of chunks.entries()) {
      console.log(`处理第 ${chunkIndex + 1}/${chunks.length} 组请求，包含 ${chunk.length} 个歌手ID`);
      
      const chunkPromises = chunk.map(async (id) => {
        try {
          console.log(`获取歌手ID: ${id} 的信息`);
          const apiUrl = `https://apis.netstart.cn/music/artist/detail?id=${id}`;
          
          const response = await axios.get(apiUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }
          });
          
          if (response.data && response.data.code === 200 && response.data.data && response.data.data.artist) {
            const artistData = response.data.data.artist;
            
            // 输出歌手关键信息
            console.log(`成功获取歌手 ${artistData.name}(ID:${id}) 的信息`);
            
            // 检查头像字段
            const avatar = artistData.avatar || '无';
            const avatarUrl = artistData.avatarUrl || '无';
            const cover = artistData.cover || '无';
            const finalAvatarUrl = artistData.avatarUrl || artistData.avatar || artistData.cover || '无';
            
            console.log(`歌手 ${artistData.name}(ID:${id}) 头像信息:`, {
              avatar字段: avatar,
              avatarUrl字段: avatarUrl,
              cover字段: cover,
              最终使用头像: finalAvatarUrl
            });
            
            return {
              id,
              success: true,
              data: artistData
            };
          }
          
          console.warn(`获取歌手ID:${id} 信息失败，API返回无效数据`);
          return {
            id,
            success: false,
            error: '无效的API响应数据'
          };
        } catch (error) {
          console.error(`获取歌手 ID:${id} 信息失败:`, error.message);
          
          // 详细记录错误信息
          if (error.response) {
            console.error(`歌手ID:${id} 错误状态码:`, error.response.status);
            console.error(`歌手ID:${id} 错误响应:`, error.response.data);
          }
          
          return {
            id,
            success: false,
            error: error.message
          };
        }
      });
      
      // 等待当前组的所有请求完成
      console.log(`等待第 ${chunkIndex + 1} 组请求完成...`);
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // 输出当前组的处理结果
      const successCount = chunkResults.filter(result => result.success).length;
      const failCount = chunkResults.filter(result => !result.success).length;
      console.log(`第 ${chunkIndex + 1} 组处理完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);
      
      // 为避免API限流，在批处理之间添加小延迟
      if (chunks.length > 1 && chunkIndex < chunks.length - 1) {
        console.log(`添加500ms延迟，避免API限流...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 统计成功和失败的数量
    const successCount = results.filter(result => result.success).length;
    const failCount = results.filter(result => !result.success).length;
    
    console.log(`批量获取完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);
    
    // 输出每个歌手的处理结果
    results.forEach(result => {
      if (result.success) {
        console.log(`歌手ID:${result.id} 处理成功，歌手名称:${result.data.name}`);
      } else {
        console.log(`歌手ID:${result.id} 处理失败，错误:${result.error}`);
      }
    });
    
    res.json({
      message: `获取完成: 成功 ${successCount} 个, 失败 ${failCount} 个`,
      results
    });
  } catch (error) {
    console.error('批量获取网易云音乐歌手信息失败:', error);
    res.status(500).json({
      message: '批量获取网易云音乐歌手信息失败',
      error: error.message
    });
  }
});

module.exports = router; 