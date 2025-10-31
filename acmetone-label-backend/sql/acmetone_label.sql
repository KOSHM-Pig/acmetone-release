-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2025-08-17 00:50:46
-- 服务器版本： 5.7.26
-- PHP 版本： 7.4.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `acmetone_label`
--

-- --------------------------------------------------------

--
-- 表的结构 `artists`
--

CREATE TABLE `artists` (
  `id` int(11) NOT NULL,
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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='艺人信息表';

-- --------------------------------------------------------

--
-- 表的结构 `file_uploads`
--

CREATE TABLE `file_uploads` (
  `id` int(11) NOT NULL,
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
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文件上传记录表';

-- --------------------------------------------------------

--
-- 表的结构 `labels`
--

CREATE TABLE `labels` (
  `id` int(11) NOT NULL,
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
  `is_in_jiyinji` tinyint(1) DEFAULT '0' COMMENT '是否在极音记入驻',
  `jiyinji_id` varchar(100) DEFAULT NULL COMMENT '极音记ID',
  `rhythm_array_account` varchar(100) DEFAULT NULL COMMENT '节奏阵列账号',
  `rhythm_array_password` varchar(255) DEFAULT NULL COMMENT '节奏阵列密码',
  `status` enum('pending','active','inactive','rejected') DEFAULT 'pending' COMMENT '状态',
  `reviewer_id` int(11) DEFAULT NULL COMMENT '审核人ID',
  `review_comment` text COMMENT '审核意见',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT '审核时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='厂牌信息表';

-- --------------------------------------------------------

--
-- 表的结构 `label_members`
--

CREATE TABLE `label_members` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `label_id` int(11) NOT NULL COMMENT '厂牌ID',
  `role` enum('owner','reviewer','designer','copywriter') NOT NULL COMMENT '角色',
  `is_verified` tinyint(1) DEFAULT '0' COMMENT '是否已验证',
  `beat_array_verified` tinyint(1) DEFAULT '0' COMMENT '节奏阵列是否已认证',
  `permissions` json DEFAULT NULL COMMENT '权限设置',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `status` enum('pending','active','inactive') DEFAULT 'pending' COMMENT '状态',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='厂牌成员表';

-- --------------------------------------------------------

--
-- 表的结构 `onboarding_progress`
--

CREATE TABLE `onboarding_progress` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `step` int(11) NOT NULL COMMENT '步骤编号',
  `step_name` varchar(50) NOT NULL COMMENT '步骤名称',
  `data` json DEFAULT NULL COMMENT '步骤数据',
  `completed` tinyint(1) DEFAULT '0' COMMENT '是否完成',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='向导流程记录表';

--
-- 转存表中的数据 `onboarding_progress`
--

INSERT INTO `onboarding_progress` (`id`, `user_id`, `step`, `step_name`, `data`, `completed`, `completed_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'purpose_selection', '{\"userType\": \"label\"}', 1, '2025-08-16 16:41:08', '2025-08-16 16:41:07', '2025-08-16 16:41:07');

-- --------------------------------------------------------

--
-- 表的结构 `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `main_backend_user_id` int(11) NOT NULL COMMENT '主后端用户ID',
  `email` varchar(255) NOT NULL COMMENT '邮箱',
  `user_type` enum('artist','label') NOT NULL COMMENT '用户类型',
  `onboarding_completed` tinyint(1) DEFAULT '0' COMMENT '是否完成向导',
  `onboarding_step` int(11) DEFAULT '1' COMMENT '当前向导步骤',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';

--
-- 转存表中的数据 `users`
--

INSERT INTO `users` (`id`, `main_backend_user_id`, `email`, `user_type`, `onboarding_completed`, `onboarding_step`, `created_at`, `updated_at`) VALUES
(1, 1, '2578878700@qq.com', 'label', 0, 2, '2025-08-16 16:41:07', '2025-08-16 16:41:07');

--
-- 转储表的索引
--

--
-- 表的索引 `artists`
--
ALTER TABLE `artists`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `stage_name` (`stage_name`);

--
-- 表的索引 `file_uploads`
--
ALTER TABLE `file_uploads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `file_type` (`file_type`),
  ADD KEY `status` (`status`);

--
-- 表的索引 `labels`
--
ALTER TABLE `labels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chinese_name` (`chinese_name`),
  ADD UNIQUE KEY `english_name` (`english_name`),
  ADD KEY `status` (`status`),
  ADD KEY `is_in_jiyinji` (`is_in_jiyinji`);

--
-- 表的索引 `label_members`
--
ALTER TABLE `label_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_label_unique` (`user_id`,`label_id`),
  ADD KEY `label_id` (`label_id`),
  ADD KEY `role` (`role`),
  ADD KEY `status` (`status`);

--
-- 表的索引 `onboarding_progress`
--
ALTER TABLE `onboarding_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_step_unique` (`user_id`,`step`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `step` (`step`);

--
-- 表的索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `main_backend_user_id` (`main_backend_user_id`),
  ADD KEY `email` (`email`),
  ADD KEY `user_type` (`user_type`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `artists`
--
ALTER TABLE `artists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `labels`
--
ALTER TABLE `labels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `label_members`
--
ALTER TABLE `label_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `onboarding_progress`
--
ALTER TABLE `onboarding_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- 使用表AUTO_INCREMENT `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
