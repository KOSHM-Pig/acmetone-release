const express = require('express');
const router = express.Router();
const captchaService = require('../utils/captchaService');

// @route   GET api/captcha
// @desc    Generate and get a new slider captcha
// @access  Public
router.get('/', async (req, res) => {
    try {
        const captchaData = await captchaService.generateCaptcha();
        res.json(captchaData);
    } catch (error) {
        console.error('Error generating captcha:', error);
        res.status(500).json({ message: '生成验证码失败，请稍后重试' });
    }
});

module.exports = router; 