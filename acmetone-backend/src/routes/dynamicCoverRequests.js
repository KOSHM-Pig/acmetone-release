const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  createDynamicCoverRequest,
  getUserDynamicCoverRequests,
  getDynamicCoverRequestById,
  getAllDynamicCoverRequests,
  updateDynamicCoverRequest,
  deleteDynamicCoverRequest,
  uploadDynamicCoverBase64,
  handleChunkedUpload,
  resubmitDynamicCoverRequest,
  updateDynamicCoverFile
} = require('../controllers/dynamicCoverRequestController');
const { auth, adminAuth } = require('../middleware/auth');

// 确保目录存在
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`创建目录: ${directory}`);
  }
};

// 使用 path.resolve 定义项目根目录，然后构建路径
const projectRoot = path.resolve(__dirname, '..', '..'); 
const uploadsDir = path.join(projectRoot, 'uploads');
const dynamicCoversDir = path.join(uploadsDir, 'dynamic_covers');
const tempDir = path.join(projectRoot, 'temp');

ensureDirectoryExists(uploadsDir);
ensureDirectoryExists(dynamicCoversDir);
ensureDirectoryExists(tempDir);

// 检查目录权限
try {
  const testFile = path.join(tempDir, `test_${Date.now()}.txt`);
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('临时目录权限检查通过');
} catch (error) {
  console.error('临时目录权限检查失败:', error);
}

// Multer 配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 使用 path.resolve 确保路径总是相对于项目根目录
    const uploadPath = path.resolve(__dirname, '..', '..', 'uploads', 'dynamic_covers');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user.id : 'unknown';
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const extension = path.extname(file.originalname) || '.mp4';
    const fileName = `dynamic_cover_${userId}_${timestamp}_${uuid}${extension}`;
    cb(null, fileName);
  }
});

// 创建multer实例
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// User routes
router.route('/')
  .get(auth, getUserDynamicCoverRequests)
  .post(auth, createDynamicCoverRequest);

// 简化的文件上传路由
router.post('/upload', auth, (req, res) => {
  console.log('开始处理动态封面上传请求');
  
  // 使用单文件上传
  upload.single('file')(req, res, function(err) {
    if (err) {
      console.error('文件上传错误:', err);
      return res.status(400).json({ message: '文件上传失败', error: err.message });
    }
    
    if (!req.file) {
      console.error('没有接收到文件');
      return res.status(400).json({ message: '没有接收到文件' });
    }
    
    console.log('文件上传成功:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    
    // 获取相对路径
    const filePath = req.file.path.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/');
    
    // 检查是否是竖版文件
    const isPortrait = req.query.isPortrait === 'true';
    
    // 返回成功响应
    return res.status(200).json({
      message: '文件上传成功',
      filePath: filePath,
      isPortrait: isPortrait
    });
  });
});

router.route('/upload-base64')
  .post(auth, (req, res) => uploadDynamicCoverBase64(req, res));

// 新增：处理分片上传的路由
router.route('/upload-chunk')
  .post(auth, (req, res) => handleChunkedUpload(req, res));

router.route('/:id')
  .get(auth, getDynamicCoverRequestById);

router.route('/:id/resubmit')
  .post(auth, resubmitDynamicCoverRequest);

// 更新文件并重新提交
router.put('/:id/update-file', auth, updateDynamicCoverFile);

// Admin routes
router.route('/admin/all')
  .get(auth, adminAuth, getAllDynamicCoverRequests);

router.route('/admin/:id')
  .put(auth, adminAuth, updateDynamicCoverRequest)
  .delete(auth, adminAuth, deleteDynamicCoverRequest);

module.exports = router;