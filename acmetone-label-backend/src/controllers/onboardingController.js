const User = require('../models/User');
const Artist = require('../models/Artist');
const Label = require('../models/Label');
const LabelMember = require('../models/LabelMember');
const logger = require('../utils/logger');

/**
 * 向导流程控制器
 */
class OnboardingController {
  /**
   * 获取向导状态
   */
  static async getStatus(req, res) {
    const ip = logger.getClientIP(req);
    
    try {
      const mainBackendUserId = req.user.id;
      
      // 查找或创建用户
      let user = await User.findByMainBackendUserId(mainBackendUserId);
      
      if (!user) {
        // 如果用户不存在，创建新用户
        user = await User.create({
          mainBackendUserId: mainBackendUserId,
          email: req.user.email || '',
          userType: '', // 初始为空，在第一步设置
          onboardingCompleted: false,
          onboardingStep: 1
        });
      }

      // 获取向导进度
      const progress = await user.getOnboardingProgress();

      logger.info('获取向导状态成功', {
        userId: user.id,
        mainBackendUserId,
        onboardingCompleted: user.onboardingCompleted,
        currentStep: user.onboardingStep,
        ip
      });

      res.json({
        success: true,
        message: '获取向导状态成功',
        data: {
          user: user.toApiResponse(),
          progress: progress,
          totalSteps: 5 // 总步骤数
        }
      });
    } catch (error) {
      logger.error('获取向导状态失败', {
        mainBackendUserId: req.user?.id,
        error: error.message,
        stack: error.stack,
        ip
      });

      res.status(500).json({
        success: false,
        message: '获取向导状态失败'
      });
    }
  }

  /**
   * 设置用户目的 (第1步)
   */
  static async setPurpose(req, res) {
    const ip = logger.getClientIP(req);

    try {
      const { userType } = req.body;
      const mainBackendUserId = req.user.id;

      logger.debug('设置用户目的请求开始', {
        userType,
        mainBackendUserId,
        requestBody: req.body,
        ip
      });

      // 验证输入
      if (!userType || !['artist', 'label'].includes(userType)) {
        logger.warn('用户类型验证失败', {
          userType,
          mainBackendUserId,
          ip
        });
        return res.status(400).json({
          success: false,
          message: '用户类型必须是 artist 或 label'
        });
      }

      // 查找用户
      logger.debug('查找用户', {
        mainBackendUserId,
        ip
      });

      let user = await User.findByMainBackendUserId(mainBackendUserId);

      if (!user) {
        logger.info('用户不存在，创建新用户', {
          mainBackendUserId,
          email: req.user.email,
          userType,
          ip
        });

        // 创建新用户
        user = await User.create({
          mainBackendUserId: mainBackendUserId,
          email: req.user.email || '',
          userType: userType,
          onboardingCompleted: false,
          onboardingStep: 2
        });

        logger.success('新用户创建成功', {
          userId: user.id,
          mainBackendUserId,
          userType,
          ip
        });
      } else {
        logger.info('用户已存在，更新用户信息', {
          userId: user.id,
          oldUserType: user.userType,
          newUserType: userType,
          oldStep: user.onboardingStep,
          ip
        });

        // 更新用户类型和步骤
        await user.update({
          userType: userType,
          onboardingStep: 2
        });

        logger.success('用户信息更新成功', {
          userId: user.id,
          userType,
          onboardingStep: 2,
          ip
        });
      }

      // 记录向导进度
      await user.updateOnboardingProgress(1, 'purpose_selection', {
        userType: userType
      }, true);

      logger.info('设置用户目的成功', {
        userId: user.id,
        userType,
        ip
      });

      res.json({
        success: true,
        message: '用户目的设置成功',
        data: {
          user: user.toApiResponse(),
          nextStep: 2
        }
      });
    } catch (error) {
      logger.error('设置用户目的失败', {
        body: req.body,
        error: error.message,
        stack: error.stack,
        ip
      });

      res.status(500).json({
        success: false,
        message: '设置用户目的失败'
      });
    }
  }

  /**
   * 设置艺人信息 (第2步 - 仅艺人)
   */
  static async setArtistInfo(req, res) {
    const ip = logger.getClientIP(req);
    
    try {
      const { stageName, musicLinks = [] } = req.body;
      const mainBackendUserId = req.user.id;

      // 查找用户
      const user = await User.findByMainBackendUserId(mainBackendUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证用户类型
      if (user.userType !== 'artist') {
        return res.status(400).json({
          success: false,
          message: '只有艺人类型用户可以设置艺人信息'
        });
      }

      // 验证艺名
      if (!stageName || stageName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: '艺名至少需要2个字符'
        });
      }

      // 检查艺名是否已存在
      const existingArtist = await Artist.findByStageName(stageName.trim());
      if (existingArtist && existingArtist.userId !== user.id) {
        return res.status(400).json({
          success: false,
          message: '该艺名已被使用'
        });
      }

      // 查找或创建艺人信息
      let artist = await Artist.findByUserId(user.id);
      
      if (artist) {
        // 更新艺人信息
        await artist.update({
          stageName: stageName.trim(),
          musicLinks: musicLinks
        });
      } else {
        // 创建艺人信息
        artist = await Artist.create({
          userId: user.id,
          stageName: stageName.trim(),
          musicLinks: musicLinks
        });
      }

      // 更新用户步骤
      await user.update({
        onboardingStep: 5, // 艺人直接跳到最后一步
        onboardingCompleted: true
      });

      // 记录向导进度
      await user.updateOnboardingProgress(2, 'artist_info', {
        stageName: stageName.trim(),
        musicLinks: musicLinks
      }, true);

      logger.info('设置艺人信息成功', {
        userId: user.id,
        artistId: artist.id,
        stageName,
        ip
      });

      res.json({
        success: true,
        message: '艺人信息设置成功',
        data: {
          user: user.toApiResponse(),
          artist: artist.toApiResponse(),
          nextStep: 5
        }
      });
    } catch (error) {
      logger.error('设置艺人信息失败', {
        body: req.body,
        error: error.message,
        stack: error.stack,
        ip
      });

      res.status(500).json({
        success: false,
        message: '设置艺人信息失败'
      });
    }
  }

  /**
   * 设置极音记状态 (第2步 - 仅厂牌)
   */
  static async setJiYinJiStatus(req, res) {
    const ip = logger.getClientIP(req);
    
    try {
      const { isInJiYinJi } = req.body;
      const mainBackendUserId = req.user.id;

      // 查找用户
      const user = await User.findByMainBackendUserId(mainBackendUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证用户类型
      if (user.userType !== 'label') {
        return res.status(400).json({
          success: false,
          message: '只有厂牌类型用户可以设置极音记状态'
        });
      }

      // 验证输入
      if (typeof isInJiYinJi !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: '极音记状态必须是布尔值'
        });
      }

      // 更新用户步骤
      await user.update({
        onboardingStep: 3
      });

      // 记录向导进度
      await user.updateOnboardingProgress(2, 'jiyinji_status', {
        isInJiYinJi: isInJiYinJi
      }, true);

      logger.info('设置极音记状态成功', {
        userId: user.id,
        isInJiYinJi,
        ip
      });

      res.json({
        success: true,
        message: '极音记状态设置成功',
        data: {
          user: user.toApiResponse(),
          nextStep: 3
        }
      });
    } catch (error) {
      logger.error('设置极音记状态失败', {
        body: req.body,
        error: error.message,
        stack: error.stack,
        ip
      });

      res.status(500).json({
        success: false,
        message: '设置极音记状态失败'
      });
    }
  }

  /**
   * 设置厂牌信息 (第3步 - 仅厂牌)
   */
  static async setLabelInfo(req, res) {
    const ip = logger.getClientIP(req);

    try {
      const { chineseName, englishName, description, website } = req.body;
      const mainBackendUserId = req.user.id;

      logger.debug('设置厂牌信息请求开始', {
        chineseName,
        englishName,
        description,
        website,
        mainBackendUserId,
        requestBody: req.body,
        ip
      });

      // 验证输入
      if (!chineseName || chineseName.trim().length === 0) {
        logger.warn('厂牌中文名验证失败', {
          chineseName,
          mainBackendUserId,
          ip
        });
        return res.status(400).json({
          success: false,
          message: '厂牌中文名不能为空'
        });
      }

      // 查找用户
      logger.debug('查找用户', {
        mainBackendUserId,
        ip
      });

      const user = await User.findByMainBackendUserId(mainBackendUserId);

      if (!user) {
        logger.error('用户不存在', {
          mainBackendUserId,
          ip
        });
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      logger.debug('用户查找成功', {
        userId: user.id,
        userType: user.userType,
        onboardingStep: user.onboardingStep,
        ip
      });

      // 验证用户类型
      if (user.userType !== 'label') {
        logger.warn('用户类型验证失败', {
          userId: user.id,
          userType: user.userType,
          expectedType: 'label',
          ip
        });
        return res.status(400).json({
          success: false,
          message: '只有厂牌用户才能设置厂牌信息'
        });
      }

      // 查找或创建厂牌信息
      logger.debug('查找现有厂牌信息', {
        userId: user.id,
        ip
      });

      let label = await Label.findByUserId(user.id);

      if (label) {
        logger.info('厂牌已存在，更新厂牌信息', {
          labelId: label.id,
          oldChineseName: label.chineseName,
          newChineseName: chineseName.trim(),
          ip
        });

        // 更新厂牌信息
        label = await label.update({
          chineseName: chineseName.trim(),
          englishName: englishName ? englishName.trim() : null,
          description: description ? description.trim() : null,
          website: website ? website.trim() : null
        });

        logger.success('厂牌信息更新成功', {
          labelId: label.id,
          chineseName: label.chineseName,
          ip
        });
      } else {
        logger.info('厂牌不存在，创建新厂牌', {
          userId: user.id,
          chineseName: chineseName.trim(),
          englishName: englishName ? englishName.trim() : null,
          ip
        });

        // 创建厂牌信息和成员关系
        label = await Label.create({
          chineseName: chineseName.trim(),
          englishName: englishName ? englishName.trim() : null,
          description: description ? description.trim() : null,
          website: website ? website.trim() : null,
          isInJiYinJi: false // 默认不在极音记联盟中
        }, user.id, 'owner'); // 传入用户ID和角色

        logger.success('厂牌创建成功', {
          labelId: label.id,
          chineseName: label.chineseName,
          userId: user.id,
          role: 'owner',
          ip
        });
      }

      // 更新用户向导步骤
      await user.update({
        onboardingStep: 4
      });

      // 记录向导进度
      await user.updateOnboardingProgress(3, 'label_info', {
        chineseName: chineseName.trim(),
        englishName: englishName ? englishName.trim() : null,
        description: description ? description.trim() : null,
        website: website ? website.trim() : null
      }, true);

      logger.info('设置厂牌信息成功', {
        userId: user.id,
        labelId: label.id,
        chineseName: chineseName.trim(),
        ip
      });

      res.json({
        success: true,
        message: '厂牌信息设置成功',
        data: {
          user: user.toApiResponse(),
          label: label.toApiResponse(),
          nextStep: 4
        }
      });

    } catch (error) {
      logger.error('设置厂牌信息失败', {
        error: error.message,
        stack: error.stack,
        ip
      });

      res.status(500).json({
        success: false,
        message: '设置厂牌信息失败'
      });
    }
  }

  /**
   * 设置厂牌角色 (第4步 - 仅厂牌)
   */
  static async setLabelRole(req, res) {
    const ip = logger.getClientIP(req);

    try {
      const { role } = req.body;
      const mainBackendUserId = req.user.id;

      logger.debug('设置厂牌角色请求开始', {
        role,
        mainBackendUserId,
        requestBody: req.body,
        ip
      });

      // 验证输入
      if (!role || !['owner', 'reviewer', 'designer', 'copywriter'].includes(role)) {
        logger.warn('角色验证失败', {
          role,
          validRoles: ['owner', 'reviewer', 'designer', 'copywriter'],
          mainBackendUserId,
          ip
        });
        return res.status(400).json({
          success: false,
          message: '角色必须是 owner、reviewer、designer 或 copywriter'
        });
      }

      // 查找用户
      const user = await User.findByMainBackendUserId(mainBackendUserId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证用户类型
      if (user.userType !== 'label') {
        return res.status(400).json({
          success: false,
          message: '只有厂牌用户才能设置厂牌角色'
        });
      }

      // 查找厂牌信息
      const label = await Label.findByUserId(user.id);

      if (!label) {
        return res.status(400).json({
          success: false,
          message: '请先设置厂牌信息'
        });
      }

      // 查找或更新成员角色
      logger.debug('查找厂牌成员关系', {
        userId: user.id,
        labelId: label.id,
        ip
      });

      let labelMember = await LabelMember.findByUserAndLabel(user.id, label.id);

      if (labelMember) {
        logger.info('成员关系已存在，更新角色', {
          memberId: labelMember.id,
          oldRole: labelMember.role,
          newRole: role,
          userId: user.id,
          labelId: label.id,
          ip
        });

        // 更新角色
        await labelMember.update({ role });

        logger.success('成员角色更新成功', {
          memberId: labelMember.id,
          role: role,
          ip
        });
      } else {
        logger.warn('成员关系不存在，创建新的成员关系', {
          userId: user.id,
          labelId: label.id,
          role: role,
          ip
        });

        // 创建成员关系（这种情况理论上不应该发生，因为创建厂牌时应该已经创建了）
        labelMember = await LabelMember.create({
          userId: user.id,
          labelId: label.id,
          role: role,
          isVerified: true,
          status: 'active'
        });

        logger.success('成员关系创建成功', {
          memberId: labelMember.id,
          role: role,
          ip
        });
      }

      // 更新用户向导步骤
      await user.update({
        onboardingStep: 5
      });

      // 记录向导进度
      await user.updateOnboardingProgress(4, 'label_role', {
        role
      }, true);

      logger.info('设置厂牌角色成功', {
        userId: user.id,
        labelId: label.id,
        role,
        ip
      });

      res.json({
        success: true,
        message: '厂牌角色设置成功',
        data: {
          user: user.toApiResponse(),
          label: label.toApiResponse(),
          labelMember: labelMember.toApiResponse(),
          nextStep: 5
        }
      });

    } catch (error) {
      logger.error('设置厂牌角色失败', {
        error: error.message,
        stack: error.stack,
        ip
      });

      res.status(500).json({
        success: false,
        message: '设置厂牌角色失败'
      });
    }
  }

  /**
   * 完成向导流程
   */
  static async complete(req, res) {
    const ip = logger.getClientIP(req);
    
    try {
      const mainBackendUserId = req.user.id;

      // 查找用户
      const user = await User.findByMainBackendUserId(mainBackendUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 标记向导完成
      await user.update({
        onboardingCompleted: true,
        onboardingStep: 5
      });

      // 记录向导完成
      await user.updateOnboardingProgress(5, 'completed', {
        completedAt: new Date().toISOString()
      }, true);

      logger.info('向导流程完成', {
        userId: user.id,
        userType: user.userType,
        ip
      });

      res.json({
        success: true,
        message: '向导流程完成',
        data: {
          user: user.toApiResponse()
        }
      });
    } catch (error) {
      logger.error('完成向导流程失败', {
        error: error.message,
        stack: error.stack,
        ip
      });

      res.status(500).json({
        success: false,
        message: '完成向导流程失败'
      });
    }
  }
}

module.exports = OnboardingController;
