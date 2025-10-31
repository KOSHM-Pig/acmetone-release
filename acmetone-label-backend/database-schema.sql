-- Acmetone Label 数据库表结构
-- 基于前端向导流程设计

-- 用户表 (扩展主后端的用户信息)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `main_backend_user_id` int(11) NOT NULL COMMENT '主后端用户ID',
  `email` varchar(255) NOT NULL COMMENT '邮箱',
  `user_type` enum('artist','label') NOT NULL COMMENT '用户类型',
  `onboarding_completed` tinyint(1) DEFAULT 0 COMMENT '是否完成向导',
  `onboarding_step` int(11) DEFAULT 1 COMMENT '当前向导步骤',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `main_backend_user_id` (`main_backend_user_id`),
  KEY `email` (`email`),
  KEY `user_type` (`user_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';

-- 艺人信息表
CREATE TABLE IF NOT EXISTS `artists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `stage_name` varchar(100) NOT NULL COMMENT '艺名',
  `real_name` varchar(100) DEFAULT NULL COMMENT '真实姓名',
  `bio` text COMMENT '个人简介',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `music_links` json DEFAULT NULL COMMENT '音乐平台链接',
  `genres` json DEFAULT NULL COMMENT '音乐风格',
  `location` varchar(100) DEFAULT NULL COMMENT '所在地',
  `website` varchar(255) DEFAULT NULL COMMENT '个人网站',
  `social_media` json DEFAULT NULL COMMENT '社交媒体链接',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `stage_name` (`stage_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='艺人信息表';

-- 厂牌信息表 (扩展现有的labels表)
CREATE TABLE IF NOT EXISTS `labels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chinese_name` varchar(100) NOT NULL COMMENT '厂牌中文名',
  `english_name` varchar(100) DEFAULT NULL COMMENT '厂牌英文名',
  `description` text COMMENT '厂牌描述',
  `logo_url` varchar(500) DEFAULT NULL COMMENT 'Logo URL',
  `website` varchar(255) DEFAULT NULL COMMENT '官方网站',
  `contact_email` varchar(255) DEFAULT NULL COMMENT '联系邮箱',
  `contact_phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `founded_year` int(11) DEFAULT NULL COMMENT '成立年份',
  `location` varchar(100) DEFAULT NULL COMMENT '所在地',
  `genres` json DEFAULT NULL COMMENT '主要音乐风格',
  `social_media` json DEFAULT NULL COMMENT '社交媒体链接',
  `is_in_jiyinji` tinyint(1) DEFAULT 0 COMMENT '是否在极音记入驻',
  `jiyinji_id` varchar(100) DEFAULT NULL COMMENT '极音记ID',
  `rhythm_array_account` varchar(100) DEFAULT NULL COMMENT '节奏阵列账号',
  `rhythm_array_password` varchar(255) DEFAULT NULL COMMENT '节奏阵列密码',
  `status` enum('pending','active','inactive','rejected') DEFAULT 'pending' COMMENT '状态',
  `reviewer_id` int(11) DEFAULT NULL COMMENT '审核人ID',
  `review_comment` text COMMENT '审核意见',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT '审核时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chinese_name` (`chinese_name`),
  UNIQUE KEY `english_name` (`english_name`),
  KEY `status` (`status`),
  KEY `is_in_jiyinji` (`is_in_jiyinji`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='厂牌信息表';

-- 厂牌成员表
CREATE TABLE IF NOT EXISTS `label_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `label_id` int(11) NOT NULL COMMENT '厂牌ID',
  `role` enum('owner','reviewer','designer','copywriter') NOT NULL COMMENT '角色',
  `is_verified` tinyint(1) DEFAULT 0 COMMENT '是否已验证',
  `beat_array_verified` tinyint(1) DEFAULT 0 COMMENT '节奏阵列是否已认证',
  `permissions` json DEFAULT NULL COMMENT '权限设置',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `status` enum('pending','active','inactive') DEFAULT 'pending' COMMENT '状态',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_label_unique` (`user_id`, `label_id`),
  KEY `label_id` (`label_id`),
  KEY `role` (`role`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='厂牌成员表';

-- 向导流程记录表
CREATE TABLE IF NOT EXISTS `onboarding_progress` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `step` int(11) NOT NULL COMMENT '步骤编号',
  `step_name` varchar(50) NOT NULL COMMENT '步骤名称',
  `data` json DEFAULT NULL COMMENT '步骤数据',
  `completed` tinyint(1) DEFAULT 0 COMMENT '是否完成',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_step_unique` (`user_id`, `step`),
  KEY `user_id` (`user_id`),
  KEY `step` (`step`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='向导流程记录表';

-- 文件上传记录表
CREATE TABLE IF NOT EXISTS `file_uploads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '上传用户ID',
  `file_type` enum('avatar','logo','document','audio','image') NOT NULL COMMENT '文件类型',
  `original_name` varchar(255) NOT NULL COMMENT '原始文件名',
  `file_name` varchar(255) NOT NULL COMMENT '存储文件名',
  `file_path` varchar(500) NOT NULL COMMENT '文件路径',
  `file_size` int(11) NOT NULL COMMENT '文件大小(字节)',
  `mime_type` varchar(100) NOT NULL COMMENT 'MIME类型',
  `url` varchar(500) NOT NULL COMMENT '访问URL',
  `status` enum('uploading','completed','failed','deleted') DEFAULT 'uploading' COMMENT '状态',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `file_type` (`file_type`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件上传记录表';
