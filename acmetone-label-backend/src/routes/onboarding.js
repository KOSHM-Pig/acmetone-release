const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const OnboardingController = require('../controllers/onboardingController');
const logger = require('../utils/logger');

/**
 * 验证中间件 - 检查验证结果
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const ip = logger.getClientIP(req);
    
    logger.warn('请求验证失败', {
      errors: errors.array(),
      body: req.body,
      ip
    });

    return res.status(400).json({
      success: false,
      message: '请求数据验证失败',
      errors: errors.array()
    });
  }
  next();
};

/**
 * 获取向导状态
 * GET /api/onboarding/status
 */
router.get('/status', OnboardingController.getStatus);

/**
 * 设置用户目的 (第1步)
 * POST /api/onboarding/purpose
 */
router.post('/purpose', [
  body('userType')
    .notEmpty()
    .withMessage('用户类型不能为空')
    .isIn(['artist', 'label'])
    .withMessage('用户类型必须是 artist 或 label'),
  validateRequest
], OnboardingController.setPurpose);

/**
 * 设置艺人信息 (第2步 - 仅艺人)
 * POST /api/onboarding/artist
 */
router.post('/artist', [
  body('stageName')
    .notEmpty()
    .withMessage('艺名不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('艺名长度必须在2-50个字符之间')
    .trim(),
  body('musicLinks')
    .optional()
    .isArray()
    .withMessage('音乐链接必须是数组'),
  body('musicLinks.*.platform')
    .optional()
    .notEmpty()
    .withMessage('音乐平台名称不能为空'),
  body('musicLinks.*.url')
    .optional()
    .isURL()
    .withMessage('音乐链接URL格式不正确'),
  validateRequest
], OnboardingController.setArtistInfo);

/**
 * 设置极音记状态 (第2步 - 仅厂牌)
 * POST /api/onboarding/jiyinji-status
 */
router.post('/jiyinji-status', [
  body('isInJiYinJi')
    .notEmpty()
    .withMessage('极音记状态不能为空')
    .isBoolean()
    .withMessage('极音记状态必须是布尔值'),
  validateRequest
], OnboardingController.setJiYinJiStatus);

/**
 * 设置厂牌信息 (第3步 - 仅厂牌)
 * POST /api/onboarding/label
 */
router.post('/label', [
  body('chineseName')
    .notEmpty()
    .withMessage('厂牌中文名不能为空')
    .isLength({ min: 2, max: 100 })
    .withMessage('厂牌中文名长度必须在2-100个字符之间')
    .trim(),
  body('englishName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('厂牌英文名不能超过100个字符')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('厂牌描述不能超过1000个字符'),
  body('website')
    .optional()
    .isURL()
    .withMessage('网站URL格式不正确'),
  validateRequest
], OnboardingController.setLabelInfo);

/**
 * 设置厂牌角色 (第4步 - 仅厂牌)
 * POST /api/onboarding/role
 */
router.post('/role', [
  body('role')
    .notEmpty()
    .withMessage('角色不能为空')
    .isIn(['owner', 'reviewer', 'designer', 'copywriter'])
    .withMessage('角色必须是 owner、reviewer、designer 或 copywriter 之一'),
  validateRequest
], OnboardingController.setLabelRole);

/**
 * 完成向导流程
 * POST /api/onboarding/complete
 */
router.post('/complete', OnboardingController.complete);

/**
 * 重置向导流程 (开发用)
 * POST /api/onboarding/reset
 */
router.post('/reset', async (req, res) => {
  const ip = logger.getClientIP(req);
  
  try {
    // TODO: 实现重置逻辑 (仅开发环境)
    logger.info('重置向导流程请求', {
      userId: req.user?.id,
      ip
    });

    res.json({
      success: true,
      message: '向导流程重置成功 (待实现)'
    });
  } catch (error) {
    logger.error('重置向导流程失败', {
      error: error.message,
      stack: error.stack,
      ip
    });

    res.status(500).json({
      success: false,
      message: '重置向导流程失败'
    });
  }
});

module.exports = router;
