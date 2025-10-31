const path = require('path');
const fs = require('fs');

// --- Set Font Path for Sharp/Pango ---
const fontsPath = path.join(__dirname, '..', 'fonts');
if (fs.existsSync(fontsPath)) {
  process.env.FONTCONFIG_PATH = fontsPath;
  console.log(`[INFO] Custom font path set for Pango: ${fontsPath}`);
}
// --- End Font Path Setup ---

const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload'); // 添加文件上传中间件
const { sequelize, syncDatabase } = require('./models');
const { handleUploadError } = require('./middleware/upload');
const { initializeDefaultSettings } = require('./utils/emailSettingService');
const ddosProtection = require('./middleware/ddosProtection');
const refererProtection = require('./middleware/refererProtection'); // 引入防盗链中间件
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const { initScheduler } = require('./scheduler');

const captchaRoutes = require('./routes/captcha');
const promotionRequestsRouter = require('./routes/promotionRequests');

// 初始化应用
const app = express();

// 中间件
app.use(cors({
  origin: [
    'http://www.acmetone.com',
    'https://www.acmetone.com',
    'http://acmetone.com',
    'https://acmetone.com',
    'http://47.121.194.8',
    'https://47.121.194.8',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ],  // 允许的域名
  credentials: true, // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin', 
    'Access-Control-Allow-Headers', 
    'Access-Control-Request-Method', 
    'Access-Control-Request-Headers',
    'Beat-Array-Token', 
    'X-File-ID', 
    'X-Chunk-Index', 
    'X-Total-Chunks', 
    'X-Original-Filename', 
    'x-file-id', 
    'x-chunk-index', 
    'x-total-chunks', 
    'x-original-filename'
  ]
}));

// 添加请求日志中间件
app.use((req, res, next) => {
  // 如果是API请求，记录请求信息
  if (req.url.startsWith('/api/')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// 解析JSON请求体
app.use(express.json({ 
  limit: '10mb' // 增加JSON请求体大小限制
}));

// 解析URL编码的请求体
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb' // 增加URL编码请求体大小限制
}));

// 启用 express-fileupload 中间件
app.use(fileUpload({
  createParentPath: true, // 自动创建上传目录
  limits: { 
    fileSize: 500 * 1024 * 1024  // 500MB
  },
  abortOnLimit: true, // 超出大小限制时中止请求
  debug: false, // 关闭调试模式，以减少日志输出
  useTempFiles: true, // 使用临时文件而不是内存
  tempFileDir: path.join(__dirname, '../temp/'), // 临时文件目录
  uploadTimeout: 600000, // 上传超时时间，设置为10分钟
  parseNested: true, // 解析嵌套的表单字段
  safeFileNames: true, // 保留文件扩展名
  preserveExtension: true, // 保留文件扩展名
  responseOnLimit: '文件大小超过限制，最大允许500MB', // 超出大小限制时的响应消息
  limitHandler: (req, res, next) => {
    return res.status(413).json({
      message: '文件上传失败',
      detail: '文件大小超过限制，最大允许500MB',
      errorCode: 'FILE_TOO_LARGE',
      timestamp: new Date().toISOString()
    });
  },
  // 增加以下配置以提高稳定性
  uriDecodeFileNames: true, // 对文件名进行URI解码
  defCharset: 'utf8', // 设置默认字符集
  defParamCharset: 'utf8', // 设置默认参数字符集
  maxFieldsSize: 20 * 1024 * 1024, // 增加字段大小限制到20MB
  maxFields: 1000, // 增加最大字段数量
  maxFilesSize: 500 * 1024 * 1024, // 设置最大文件总大小
  abortOnError: false, // 出错时不立即中止，继续处理请求
  useTempFile: true, // 使用临时文件
  highWaterMark: 2 * 1024 * 1024, // 设置流的高水位线为2MB，提高大文件处理能力
  // 添加自动清理临时文件的配置
  cleanupTempFilesAfterProcessing: true, // 处理完成后自动清理临时文件
  cleanupTempFilesOnError: true // 发生错误时也清理临时文件
}));

// 确保临时目录存在
const tempDir = path.join(__dirname, '../temp/');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log(`创建临时目录: ${tempDir}`);
}

// 应用防盗链中间件
app.use(refererProtection);

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  // 设置HTTP响应头，防止外部引用
  setHeaders: (res, path) => {
    // 获取请求的来源
    const origin = res.req.headers.origin;
    // 允许的域名列表
    const allowedOrigins = [
      'http://www.acmetone.com',
      'https://www.acmetone.com',
      'http://acmetone.com',
      'https://acmetone.com',
      'http://47.121.194.8',
      'https://47.121.194.8',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    
    // 如果来源在允许列表中，则设置为该来源
    if (origin && allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    } else {
      // 默认设置
      res.set('Access-Control-Allow-Origin', 'https://www.acmetone.com');
    }
    
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// 创建上传目录
const uploadDirs = [
  'uploads/audio', 
  'uploads/images', 
  'uploads/images/thumbnails',
  'uploads/song_covers',
  'uploads/album_covers', // 添加专辑封面目录
  'uploads/chunks',
  'uploads/pdf',
  'uploads/lyrics' // 添加歌词目录
];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`创建目录: ${fullPath}`);
  }
});

// 错误处理中间件
app.use(handleUploadError);

// 应用 DDoS 保护中间件
app.use(ddosProtection);

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const albumRoutes = require('./routes/albums');
const artistRoutes = require('./routes/artists');
const artistEditRequestRoutes = require('./routes/artistEditRequests');
const userVerificationRoutes = require('./routes/userVerification');
const adminRoutes = require('./routes/admin');
const albumLinkRoutes = require('./routes/albumLinks');
const lyricsRoutes = require('./routes/lyrics'); // 新增歌词路由
const albumCoverRoutes = require('./routes/albumCover'); // 新增专辑封面路由
const statisticsRoutes = require('./routes/statistics');
const emailSettingsRoutes = require('./routes/emailSettings');
const beatArrayRoutes = require('./routes/beatArray');
const aiChatRoutes = require('./routes/aiChat');
const aiRoutes = require('./routes/ai'); // 导入新的 AI 路由
const watermarkRoutes = require('./routes/watermark');
const adminAlbumRoutes = require('./routes/adminAlbum'); // 新增管理员专辑路由
const coverTemplateRoutes = require('./routes/coverTemplates');
const templateProcessorRoutes = require('./routes/templateProcessor');
const dynamicCoverRequestRoutes = require('./routes/dynamicCoverRequests');
const rightsChainRoutes = require('./routes/rightsChain'); // 导入权利链条路由
const artistWikiRoutes = require('./routes/artistWiki'); // 导入艺术家Wiki路由
const proxyRoutes = require('./routes/proxy'); // 导入代理路由，用于解决跨域问题
const materialTemplateRoutes = require('./routes/materialTemplates');
const userShipmentRoutes = require('./routes/userShipments');
const albumDownloadRoutes = require('./routes/albumDownload'); // 导入专辑下载路由
const labelRoutes = require('./routes/labels'); // 导入厂牌路由
const adminLabelRoutes = require('./routes/adminLabels'); // 导入管理员厂牌路由
const contractRoutes = require('./routes/contracts'); // 导入合同路由
// const songRoutes = require('./routes/songs');

// 导入中间件
const syncArtistRelationsMiddleware = require('./middleware/syncArtistRelations'); // 导入同步歌曲-歌手关系中间件

// 使用路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/artist-edit-requests', artistEditRequestRoutes);
app.use('/api/user-verification', userVerificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/album-links', albumLinkRoutes);
app.use('/api/user-album-links', albumLinkRoutes);
app.use('/api/lyrics', lyricsRoutes); // 注册歌词路由
app.use('/api/album-cover', albumCoverRoutes); // 注册专辑封面路由
app.use('/api/statistics', statisticsRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api/beat-array', beatArrayRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/ai', aiRoutes); // 注册新的 AI 路由
app.use('/api/watermark', watermarkRoutes);
app.use('/api/admin', adminAlbumRoutes); // 修改管理员专辑路由路径
app.use('/api/cover-templates', coverTemplateRoutes);
app.use('/api/template-processor', templateProcessorRoutes);
app.use('/api/dynamic-cover-requests', dynamicCoverRequestRoutes);
app.use('/api/artist-wiki', artistWikiRoutes); // 注册艺术家Wiki路由
app.use('/api/proxy', proxyRoutes); // 注册代理路由
app.use('/api/promotion-requests', promotionRequestsRouter); // 注册推广请求路由
app.use('/api/material-templates', materialTemplateRoutes);
app.use('/api/shipments', userShipmentRoutes);
app.use('/api/labels', labelRoutes); // 注册厂牌路由
app.use('/api/admin/labels', adminLabelRoutes); // 注册管理员厂牌路由
app.use('/api/contracts', contractRoutes); // 注册合同路由
// 注册专辑下载路由
app.use('/api/albums', albumDownloadRoutes);

// 应用同步歌曲-歌手关系的中间件到所有涉及歌曲的路由
app.use('/api/rights-chain/albums/:albumId/songs/:songId', syncArtistRelationsMiddleware);
app.use('/api/albums/:albumId/songs/:songId', syncArtistRelationsMiddleware);

// 注册权利链条路由
app.use('/api/rights-chain', rightsChainRoutes);

// 注册日历路由
const calendarRoutes = require('./routes/calendar');
app.use('/api/calendar', calendarRoutes);

// 注册管理员工作台路由
const adminWorkbenchRoutes = require('./routes/adminWorkbench');
app.use('/api/admin/workbench', adminWorkbenchRoutes);

// app.use('/api/songs', songRoutes);
app.use('/api/captcha', captchaRoutes);

// 静态文件服务 - 添加前端构建文件的静态服务
app.use(express.static(path.join(__dirname, '../../acmetone-frontend/dist')));
app.use('/uploads/temp', express.static(path.join(__dirname, '../uploads/temp')));

// 前端路由支持 - 添加在API路由之后，错误处理之前
// 将所有非API请求和静态资源请求转发到index.html
app.use((req, res, next) => {
  // 如果请求的是API或静态资源，继续正常处理
  if (req.url.startsWith('/api/') || req.url.startsWith('/uploads/')) {
    return next();
  }
  
  // 否则返回前端应用的index.html
  res.sendFile(path.join(__dirname, '../../acmetone-frontend/dist/index.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  // 详细记录错误信息
  console.error('服务器错误:', {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || '未登录',
    headers: req.headers,
    body: req.method !== 'GET' ? req.body : undefined
  });
  
  // 根据错误类型返回不同的状态码和消息
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || '服务器内部错误';
  
  res.status(statusCode).json({ 
    message: errorMessage,
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

// 清理过期的分片文件
const cleanupExpiredChunks = async () => {
  try {
    console.log('开始清理过期的分片文件...');
    const chunksDir = path.join(__dirname, '../uploads/chunks');
    
    // 检查目录是否存在
    if (!fs.existsSync(chunksDir)) {
      console.log('分片目录不存在，跳过清理');
      return;
    }
    
    // 获取目录中的所有文件夹
    const chunkFolders = fs.readdirSync(chunksDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`找到 ${chunkFolders.length} 个分片目录`);
    
    // 当前时间
    const now = Date.now();
    // 24小时前的时间戳（毫秒）
    const expirationTime = now - (24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    // 检查每个文件夹
    for (const folder of chunkFolders) {
      try {
        const folderPath = path.join(chunksDir, folder);
        const stats = fs.statSync(folderPath);
        
        // 如果文件夹创建时间超过24小时，删除它
        if (stats.birthtimeMs < expirationTime || stats.mtimeMs < expirationTime) {
          await rimraf(folderPath);
          console.log(`已删除过期分片目录: ${folder}`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`清理分片目录 ${folder} 失败:`, err);
      }
    }
    
    console.log(`清理完成，共删除 ${deletedCount} 个过期分片目录`);
  } catch (error) {
    console.error('清理过期分片文件失败:', error);
  }
};

// 定期清理临时文件
const cleanupTempFiles = async () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    return;
  }

  try {
    const files = await fs.promises.readdir(tempDir);
    for (const file of files) {
      // 忽略特殊文件和目录，例如 .gitkeep
      if (file === '.gitkeep') {
        continue;
      }
      
      const filePath = path.join(tempDir, file);
      try {
        const stats = await fs.promises.lstat(filePath);
        if (stats.isDirectory()) {
          // 如果是目录，则递归删除
          await fs.promises.rm(filePath, { recursive: true, force: true });
          console.log(`成功清理临时目录: ${filePath}`);
        } else {
          // 如果是文件，则直接删除
          await fs.promises.unlink(filePath);
          console.log(`成功清理临时文件: ${filePath}`);
        }
      } catch (err) {
        console.error(`清理临时条目 ${file} 失败:`, err);
      }
    }
  } catch (err) {
    console.error('读取临时目录失败:', err);
  }
};

const startServer = async () => {
  try {
    // 同步数据库
    await syncDatabase();
    
    // 执行迁移脚本
    try {
      const { runMigration } = require('./migrations/run_migration');
      await runMigration('add_release_status.sql');
      await runMigration('create_release_monitor_history.sql');
      await runMigration('update_release_monitor_settings.sql');
      console.log('数据库迁移完成');
    } catch (migrationError) {
      console.error('数据库迁移失败:', migrationError);
      // 继续启动服务器，不中断流程
    }
    
    // 初始化默认邮件设置
    await initializeDefaultSettings();
    
    // 数据库认证
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 初始化调度器
    initScheduler();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
    
    // 立即执行一次清理
    await cleanupExpiredChunks();
    await cleanupTempFiles();
    await cleanupTempFiles(); // 立即清理临时文件
    
    // 设置定时任务，每小时清理一次临时文件
    setInterval(async () => {
      await cleanupTempFiles();
    }, 1 * 60 * 60 * 1000); // 1小时
    
    // 设置定时任务，每6小时清理一次过期的分片文件
    setInterval(async () => {
      await cleanupExpiredChunks();
      await cleanupTempFiles();
    }, 6 * 60 * 60 * 1000); // 6小时
    
    console.log('已设置定时清理任务，每小时清理临时文件，每6小时清理分片文件');
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer(); 