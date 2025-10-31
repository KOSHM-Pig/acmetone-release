const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth'); // 导入auth中间件，用于保存歌词时验证用户身份
const { Album, Song } = require('../models'); // 导入数据库模型

// 获取歌词文件内容
router.get('/', async (req, res) => {
  try {
    const { path: lyricsPath } = req.query;
    
    if (!lyricsPath) {
      return res.status(400).json({
        message: '缺少必要参数',
        detail: '需要提供歌词文件路径'
      });
    }
    
    console.log('获取歌词文件内容，路径:', lyricsPath);
    
    // 提取文件名
    const fileName = path.basename(lyricsPath);
    console.log('歌词文件名:', fileName);
    
    // 尝试多种可能的路径格式
    const possiblePaths = [
      // 1. 直接使用提供的路径
      lyricsPath,
      // 2. 如果路径以uploads开头
      path.join(__dirname, '../../', lyricsPath),
      // 3. 如果路径不以uploads开头，添加uploads前缀
      path.join(__dirname, '../../uploads', lyricsPath),
      // 4. 尝试uploads/lyrics目录
      path.join(__dirname, '../../uploads/lyrics', fileName),
      // 5. 尝试acmetone-backend/uploads/lyrics目录
      path.join(__dirname, '../../acmetone-backend/uploads/lyrics', fileName),
      // 6. 尝试相对于项目根目录的路径
      path.join(process.cwd(), 'uploads/lyrics', fileName),
      // 7. 尝试绝对路径
      path.join('F:/Acmetone_WebApp/acmetone-release/acmetone-backend/uploads/lyrics', fileName)
    ];
    
    console.log('尝试以下可能的文件路径:');
    possiblePaths.forEach((p, i) => console.log(`${i+1}. ${p} - 存在: ${fs.existsSync(p)}`));
    
    // 尝试所有可能的路径
    let filePath = null;
    let fullPath = null;
    
    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        console.log('找到文件，路径:', tryPath);
        filePath = tryPath;
        fullPath = tryPath.includes('uploads/') ? 
          tryPath.substring(tryPath.indexOf('uploads/')) : 
          `uploads/lyrics/${fileName}`;
        break;
      }
    }
    
    // 如果所有路径都不存在
    if (!filePath) {
      console.error('歌词文件不存在，尝试的路径:', possiblePaths);
      return res.status(404).json({
        message: '歌词文件不存在',
        detail: `文件路径: ${lyricsPath}`,
        triedPaths: possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) }))
      });
    }
    
    // 读取文件内容
    console.log('准备读取文件:', filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log('成功读取歌词文件，内容长度:', content.length);
    console.log('歌词文件完整内容:\n', content);
    
    // 返回文件内容
    return res.json({
      success: true,
      content,
      path: fullPath
    });
  } catch (error) {
    console.error('获取歌词文件内容失败:', error);
    return res.status(500).json({
      message: '获取歌词文件内容失败',
      detail: error.message,
      stack: error.stack
    });
  }
});

// 保存歌词内容
router.post('/save/:songId', auth, async (req, res) => {
  try {
    const { songId } = req.params;
    const { lyricsContent, translationLyricsContent, lyricsPath, translationLyricsPath } = req.body;
    
    console.log('保存歌词，歌曲ID:', songId);
    console.log('请求数据:', {
      hasLyricsContent: !!lyricsContent,
      hasTranslationLyricsContent: !!translationLyricsContent,
      lyricsPath,
      translationLyricsPath
    });
    
    // 验证参数
    if (!songId) {
      return res.status(400).json({
        message: '缺少必要参数',
        detail: '需要提供歌曲ID'
      });
    }
    
    if (!lyricsContent && !translationLyricsContent) {
      return res.status(400).json({
        message: '缺少必要参数',
        detail: '需要提供至少一种歌词内容'
      });
    }
    
    // 查询歌曲信息，确保歌曲存在
    const song = await Song.findByPk(songId);
    if (!song) {
      return res.status(404).json({
        message: '歌曲不存在',
        detail: `ID为${songId}的歌曲不存在`
      });
    }
    
    // 查询专辑信息，确保用户有权限编辑
    const album = await Album.findByPk(song.albumId);
    if (!album) {
      return res.status(404).json({
        message: '专辑不存在',
        detail: `ID为${song.albumId}的专辑不存在`
      });
    }
    
    // 检查用户权限
    const isAdmin = req.user.role === 'admin';
    const isOwner = album.submittedById === req.user.id;
    const canEdit = isAdmin || isOwner;
    
    if (!canEdit) {
      return res.status(403).json({
        message: '无权操作',
        detail: '只有专辑所有者或管理员可以编辑歌词'
      });
    }
    
    // 检查专辑状态
    const isDraft = album.status === 'pending' && album.comment === 'DRAFT: 尚未提交审核';
    const isRejected = album.status === 'rejected';
    
    if (!isAdmin && !isDraft && !isRejected) {
      return res.status(403).json({
        message: '无法编辑',
        detail: '只有草稿状态或已拒绝状态的专辑可以编辑歌词'
      });
    }
    
    // 处理保存歌词内容
    const result = {
      success: true
    };
    
    // 保存原文歌词
    if (lyricsContent) {
      let newLyricsPath = lyricsPath;
      
      // 如果没有提供路径，或者文件不存在，创建新文件
      if (!lyricsPath || !fs.existsSync(path.join(__dirname, '../../', lyricsPath))) {
        // 创建新的歌词文件
        const timestamp = Date.now();
        const lyricsFileName = `lyrics_${timestamp}_lyrics.lrc`;
        const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
        
        // 确保目录存在
        if (!fs.existsSync(lyricsDir)) {
          fs.mkdirSync(lyricsDir, { recursive: true });
        }
        
        // 写入文件
        const fullPath = path.join(lyricsDir, lyricsFileName);
        fs.writeFileSync(fullPath, lyricsContent, 'utf-8');
        
        // 更新路径
        newLyricsPath = `uploads/lyrics/${lyricsFileName}`;
        
        // 更新数据库中的歌词文件路径
        await song.update({ lyricsFile: newLyricsPath });
        
        console.log('创建了新的歌词文件:', newLyricsPath);
      } else {
        // 更新现有文件
        const fullPath = path.join(__dirname, '../../', lyricsPath);
        fs.writeFileSync(fullPath, lyricsContent, 'utf-8');
        console.log('更新了现有歌词文件:', lyricsPath);
      }
      
      result.lyricsPath = newLyricsPath;
    }
    
    // 保存翻译歌词
    if (translationLyricsContent) {
      let newTranslationLyricsPath = translationLyricsPath;
      
      // 如果没有提供路径，或者文件不存在，创建新文件
      if (!translationLyricsPath || !fs.existsSync(path.join(__dirname, '../../', translationLyricsPath))) {
        // 创建新的翻译歌词文件
        const timestamp = Date.now();
        const translationLyricsFileName = `translation_lyrics_${timestamp}_lyrics_.lrc`;
        const lyricsDir = path.join(__dirname, '../../uploads/lyrics');
        
        // 确保目录存在
        if (!fs.existsSync(lyricsDir)) {
          fs.mkdirSync(lyricsDir, { recursive: true });
        }
        
        // 写入文件
        const fullPath = path.join(lyricsDir, translationLyricsFileName);
        fs.writeFileSync(fullPath, translationLyricsContent, 'utf-8');
        
        // 更新路径
        newTranslationLyricsPath = `uploads/lyrics/${translationLyricsFileName}`;
        
        // 更新数据库中的翻译歌词文件路径
        await song.update({ translationLyricsFile: newTranslationLyricsPath });
        
        console.log('创建了新的翻译歌词文件:', newTranslationLyricsPath);
      } else {
        // 更新现有文件
        const fullPath = path.join(__dirname, '../../', translationLyricsPath);
        fs.writeFileSync(fullPath, translationLyricsContent, 'utf-8');
        console.log('更新了现有翻译歌词文件:', translationLyricsPath);
      }
      
      result.translationLyricsPath = newTranslationLyricsPath;
    }
    
    // 返回成功结果
    return res.json(result);
  } catch (error) {
    console.error('保存歌词失败:', error);
    return res.status(500).json({
      message: '保存歌词失败',
      detail: error.message,
      stack: error.stack
    });
  }
});

module.exports = router; 