const express = require('express');
const router = express.Router();
const { Album, User, Song } = require('../models');
const { auth, adminAuth } = require('../middleware/auth');
const { uploadPDF, handleUploadError } = require('../middleware/upload');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// 获取用户的生效合同列表
router.get('/my', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const search = req.query.search || '';
    const status = req.query.status || null;
    
    const offset = (page - 1) * pageSize;
    
    console.log('=== 合同查询调试信息 ===');
    console.log('用户ID:', req.user.id);
    console.log('查询参数:', { page, pageSize, search, status });
    
    // 构建查询条件
    let whereClause = {
      submittedById: req.user.id,
      // // 只显示有授权书的专辑
      // authorizationFile: { [Op.not]: null },
      // 只显示已通过的专辑
      status: 'approved',
      // 只显示已签署的合同
      contractStatus: 'signed'
    };
    
    console.log('初始查询条件:', JSON.stringify(whereClause, null, 2));
    
    // 根据合同状态过滤
    if (status) {
      whereClause.contractStatus = status;
    }
    
    // 搜索条件
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { displayInfo: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    console.log('最终查询条件:', JSON.stringify(whereClause, null, 2));
    
    // 查询总数
    const total = await Album.count({ 
      where: whereClause 
    });
    
    console.log('查询到的总数:', total);
    
    // 查询分页数据
    const albums = await Album.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['contractSignedAt', 'DESC'], ['id', 'DESC']],
      limit: pageSize,
      offset: offset,
      attributes: [
        'id', 'title', 'type', 'releaseDate', 'displayInfo', 'status',
        'contractEffectiveDate', 'contractExpiryDate', 'contractStatus', 
        'contractSignedAt', 'signedAuthorizationFile', 'authorizationFile'
      ]
    });
    
    console.log('查询到的专辑数量:', albums.length);
    console.log('专辑详情:', albums.map(a => ({
      id: a.id,
      title: a.title,
      status: a.status,
      contractStatus: a.contractStatus,
      submittedById: a.submittedById
    })));
    
    // 处理合同数据
    const processedContracts = albums.map(album => {
      const albumJson = album.toJSON();
      
      // 计算合同剩余天数
      let remainingDays = null;
      if (albumJson.contractExpiryDate) {
        const now = new Date();
        const expiryDate = new Date(albumJson.contractExpiryDate);
        remainingDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      }
      
      // 判断合同是否即将到期（30天内）
      const isExpiringSoon = remainingDays !== null && remainingDays <= 30 && remainingDays > 0;
      
      return {
        ...albumJson,
        remainingDays,
        isExpiringSoon,
        // 显示状态
        displayStatus: albumJson.contractStatus === 'signed' ? '已生效' : 
                      albumJson.contractStatus === 'expired' ? '已过期' : '未签署'
      };
    });
    
    res.json({
      contracts: processedContracts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('获取合同列表失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 获取合同统计数据
router.get('/stats', auth, async (req, res) => {
  try {
    // 只统计已通过的专辑
    const baseWhere = { status: 'approved' };
    const total = await Album.count({ where: baseWhere });
    const unsigned = await Album.count({ where: { ...baseWhere, contractStatus: 'unsigned' } });
    const signed = await Album.count({ where: { ...baseWhere, contractStatus: 'signed' } });
    const expired = await Album.count({ where: { ...baseWhere, contractStatus: 'expired' } });
    
    // 计算即将到期的合同（30天内）
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringSoon = await Album.count({
      where: {
        ...baseWhere,
        contractStatus: 'signed',
        contractExpiryDate: {
          [Op.lte]: thirtyDaysFromNow,
          [Op.gt]: new Date()
        }
      }
    });

    // 统计已通过专辑的歌曲总数
    const totalSongs = await Song.count({
      include: [{
        model: Album,
        where: { status: 'approved' },
        attributes: []
      }]
    });

    res.json({
      success: true,
      stats: { total, unsigned, signed, expired, expiringSoon, totalSongs }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取指定专辑的合同详情
router.get('/:albumId', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    
    if (isNaN(albumId)) {
      return res.status(400).json({ success: false, message: '无效的专辑ID' });
    }
    
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      },
      include: [
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }
    
    if (!album.authorizationFile) {
      return res.status(404).json({ message: '该专辑没有授权书文件' });
    }
    
    const albumJson = album.toJSON();
    
    // 计算合同剩余天数
    let remainingDays = null;
    if (albumJson.contractExpiryDate) {
      const now = new Date();
      const expiryDate = new Date(albumJson.contractExpiryDate);
      remainingDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    }
    
    res.json({
      ...albumJson,
      remainingDays,
      isExpiringSoon: remainingDays !== null && remainingDays <= 30 && remainingDays > 0,
      displayStatus: albumJson.contractStatus === 'signed' ? '已生效' : 
                    albumJson.contractStatus === 'expired' ? '已过期' : '未签署'
    });
  } catch (error) {
    console.error('获取合同详情失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 下载生效合同文件
router.get('/:albumId/download', auth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    
    const album = await Album.findOne({
      where: {
        id: albumId,
        submittedById: req.user.id
      }
    });
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在或无权限' });
    }
    
    // 优先下载已签署的合同，如果没有则下载原始授权书
    const fileToDownload = album.signedAuthorizationFile || album.authorizationFile;
    
    if (!fileToDownload) {
      return res.status(404).json({ message: '该专辑没有合同文件' });
    }
    
    // 获取文件的完整路径
    const filePath = path.join(__dirname, '../../', fileToDownload);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '合同文件不存在' });
    }
    
    // 获取文件名
    const fileName = path.basename(fileToDownload);
    const downloadFileName = album.signedAuthorizationFile ? 
      `生效合同_${album.title}_${Date.now()}.pdf` : 
      `授权书_${album.title}_${Date.now()}.pdf`;
    
    // 设置响应头，指示浏览器下载文件
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(downloadFileName)}`);
    res.setHeader('Content-Type', 'application/pdf');
    
    // 发送文件
    res.sendFile(filePath);
  } catch (error) {
    console.error('下载合同文件失败:', error);
    res.status(500).json({ message: '下载失败' });
  }
});

// 管理员上传已签署的合同
router.post('/:albumId/sign', adminAuth, uploadPDF.single('signedContract'), handleUploadError, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    
    if (!req.file) {
      return res.status(400).json({ 
        message: '请上传PDF格式的已签署合同文件'
      });
    }
    
    const album = await Album.findByPk(albumId);
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    // 处理文件路径
    const relativePath = req.file.path.replace(/\\/g, '/');
    const normalizedPath = relativePath.includes('uploads/') 
      ? relativePath.substring(relativePath.indexOf('uploads/')) 
      : relativePath;
    
    // 设置合同生效日期（默认为专辑发行日期）
    const effectiveDate = req.body.effectiveDate ? 
      new Date(req.body.effectiveDate) : 
      album.releaseDate;
    
    // 设置合同到期日期（默认生效日期+5年）
    const expiryDate = req.body.expiryDate ? 
      new Date(req.body.expiryDate) : 
      new Date(effectiveDate.getTime() + (5 * 365 * 24 * 60 * 60 * 1000));
    
    // 更新专辑合同信息
    await album.update({
      signedAuthorizationFile: normalizedPath,
      contractStatus: 'signed',
      contractSignedAt: new Date(),
      contractEffectiveDate: effectiveDate,
      contractExpiryDate: expiryDate
    });
    
    res.json({
      message: '已签署合同上传成功',
      contractInfo: {
        signedAuthorizationFile: normalizedPath,
        contractStatus: 'signed',
        contractSignedAt: album.contractSignedAt,
        contractEffectiveDate: album.contractEffectiveDate,
        contractExpiryDate: album.contractExpiryDate
      }
    });
  } catch (error) {
    console.error('上传已签署合同失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 管理员调整合同日期
router.put('/:albumId/dates', adminAuth, async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId, 10);
    const { effectiveDate, expiryDate } = req.body;
    
    if (!effectiveDate || !expiryDate) {
      return res.status(400).json({ message: '请提供生效日期和到期日期' });
    }
    
    const album = await Album.findByPk(albumId);
    
    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }
    
    await album.update({
      contractEffectiveDate: new Date(effectiveDate),
      contractExpiryDate: new Date(expiryDate)
    });
    
    res.json({
      message: '合同日期更新成功',
      contractEffectiveDate: album.contractEffectiveDate,
      contractExpiryDate: album.contractExpiryDate
    });
  } catch (error) {
    console.error('更新合同日期失败:', error);
    res.status(500).json({ message: error.message });
  }
});

// 管理员端接口
/**
 * 获取所有合同数据（管理员用）
 */
router.get('/admin/all', auth, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }

    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (page - 1) * limit;

    // 构建查询条件
    const whereCondition = {};
    if (status) {
      whereCondition.contractStatus = status;
    }

    // 构建搜索条件
    const searchCondition = search ? {
      [Op.or]: [
        { title: { [Op.like]: `%${search}%` } },
        { performer: { [Op.like]: `%${search}%` } },
        { '$submittedBy.username$': { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const contracts = await Album.findAll({
      where: {
        ...whereCondition,
        ...searchCondition,
        status: 'approved' // 只显示已通过的专辑
      },
      include: [{
        model: User,
        as: 'submittedBy',
        attributes: ['id', 'username', 'email']
      }, {
        model: Song,
        attributes: ['id']
      }],
      attributes: [
        'id', 'title', 'performer', 'type', 'coverImage', 'releaseDate',
        'contractEffectiveDate', 'contractExpiryDate', 'contractStatus',
        'contractSignedAt', 'signedAuthorizationFile', 'authorizationFile'
      ],
      order: [['id', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 处理合同数据
    const processedContracts = contracts.map(album => {
      const contract = album.toJSON();
      
      // 添加用户信息
      if (contract.submittedBy) {
        contract.userName = contract.submittedBy.username;
        contract.userEmail = contract.submittedBy.email;
      }

      // 添加歌曲数量
      contract.songCount = contract.Songs ? contract.Songs.length : 0;

      // 映射字段名称以匹配前端期望
      contract.artistName = contract.performer;

      // 计算剩余天数和状态显示
      if (contract.contractExpiryDate) {
        const today = new Date();
        const expiryDate = new Date(contract.contractExpiryDate);
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        contract.remainingDays = diffDays > 0 ? diffDays : 0;
        contract.isExpiringSoon = diffDays <= 30 && diffDays > 0;
        
        // 自动更新过期状态
        if (diffDays <= 0 && contract.contractStatus === 'signed') {
          contract.contractStatus = 'expired';
          album.update({ contractStatus: 'expired' });
        }
      } else {
        contract.remainingDays = null;
        contract.isExpiringSoon = false;
      }

      // 状态显示文本
      const statusMap = {
        unsigned: '待签署',
        signed: '已生效',
        expired: '已过期'
      };
      contract.displayStatus = statusMap[contract.contractStatus] || '未知';

      return contract;
    });

    res.json({
      success: true,
      contracts: processedContracts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: processedContracts.length
      }
    });
  } catch (error) {
    console.error('获取所有合同数据失败:', error);
    res.status(500).json({ message: '获取合同数据失败', error: error.message });
  }
});

// 管理员上传已签署合同 (Base64)
router.post('/:id/upload-signed', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { effectiveDate, expiryDate, fileData, fileName, fileSize } = req.body;
    
    if (!fileData || !fileName) {
      return res.status(400).json({ success: false, message: '请提供文件数据和文件名' });
    }

    const album = await Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ success: false, message: '专辑不存在' });
    }

    // 验证文件大小 (10MB限制)
    if (fileSize && fileSize > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: '文件大小不能超过10MB' });
    }

    // 验证文件类型
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: '只支持PDF文件' });
    }

    // 解码base64数据
    const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 创建上传目录
    const uploadDir = path.join(__dirname, '../../uploads/contracts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeFileName = `${timestamp}_${randomString}_${fileName}`;
    const filePath = path.join(uploadDir, safeFileName);
    const relativePath = `uploads/contracts/${safeFileName}`;

    // 写入文件
    fs.writeFileSync(filePath, buffer);

    // 更新合同信息
    await album.update({
      signedAuthorizationFile: relativePath,
      contractEffectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      contractExpiryDate: expiryDate ? new Date(expiryDate) : null,
      contractStatus: 'signed',
      contractSignedAt: new Date()
    });

    res.json({ success: true, message: '合同上传成功' });
  } catch (error) {
    console.error('上传合同失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      error: error.message
    });
  }
});

// 管理员调整合同日期
router.put('/:id/dates', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { effectiveDate, expiryDate } = req.body;

    const album = await Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ success: false, message: '专辑不存在' });
    }

    await album.update({
      contractEffectiveDate: effectiveDate ? new Date(effectiveDate) : album.contractEffectiveDate,
      contractExpiryDate: expiryDate ? new Date(expiryDate) : album.contractExpiryDate
    });

    res.json({ success: true, message: '合同日期更新成功' });
  } catch (error) {
    console.error('更新合同日期失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
