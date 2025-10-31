-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2025-08-08 23:30:19
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
-- 数据库： `acmetone`
--

-- --------------------------------------------------------

--
-- 表的结构 `ai_generation_assets`
--

CREATE TABLE `ai_generation_assets` (
  `id` int(11) NOT NULL,
  `prompt` text NOT NULL COMMENT '用于生成图像的正面提示词',
  `negative_prompt` text COMMENT '用于生成图像的负面提示词',
  `image_path` varchar(255) NOT NULL COMMENT '生成的图像在服务器上的存储路径',
  `seed` bigint(20) DEFAULT NULL COMMENT '生成图像时使用的随机种子',
  `num_inference_steps` int(11) DEFAULT NULL COMMENT '推理步数',
  `guidance_scale` float DEFAULT NULL COMMENT '引导比例',
  `model_name` varchar(255) DEFAULT NULL COMMENT '使用的AI模型名称',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存储AI生成的优质图像资产';

-- --------------------------------------------------------

--
-- 表的结构 `albums`
--

CREATE TABLE `albums` (
  `id` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `coverImage` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `releaseDate` datetime NOT NULL,
  `displayInfo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `submittedById` int(11) DEFAULT NULL,
  `authorizationFile` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `performer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未知艺术家' COMMENT '专辑表演者，多个表演者用/分隔',
  `performerIds` text COLLATE utf8mb4_unicode_ci COMMENT '关联的表演者ID，JSON格式',
  `isReleased` tinyint(1) NOT NULL DEFAULT '0' COMMENT '专辑是否已上架',
  `releasedAt` datetime DEFAULT NULL COMMENT '专辑上架时间',
  `labelId` int(11) DEFAULT NULL,
  `dynamicCoverPath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '动态封面文件路径',
  `hasDynamicCover` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否有动态封面',
  `nodesPositions` text COLLATE utf8mb4_unicode_ci COMMENT '流程图中节点的位置信息（JSON格式）',
  `materialDelivered` tinyint(1) NOT NULL DEFAULT '0' COMMENT '物料是否已传递给发行平台',
  `materialDeliveredAt` datetime DEFAULT NULL COMMENT '物料传递时间',
  `materialDeliveredBy` int(11) DEFAULT NULL COMMENT '物料传递操作人ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `album_links`
--

CREATE TABLE `album_links` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT '专辑链接页面标题',
  `albumName` varchar(255) NOT NULL COMMENT '专辑名称',
  `artistName` varchar(255) NOT NULL COMMENT '歌手名称',
  `coverImage` varchar(255) NOT NULL COMMENT '封面图片URL',
  `releaseDate` date NOT NULL COMMENT '发布日期',
  `slug` varchar(255) NOT NULL COMMENT '页面标识符，用于URL',
  `description` text COMMENT '页面描述',
  `isActive` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否显示',
  `createdById` int(11) NOT NULL COMMENT '创建者ID',
  `internalAlbumId` int(11) DEFAULT NULL COMMENT '关联到系统内部专辑ID',
  `albumType` enum('internal','external') NOT NULL DEFAULT 'external' COMMENT '专辑类型：internal (内部专辑) 或 external (外部专辑)',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `netease` varchar(255) DEFAULT NULL COMMENT '网易云音乐链接',
  `qq` varchar(255) DEFAULT NULL COMMENT 'QQ音乐链接',
  `kugou` varchar(255) DEFAULT NULL COMMENT '酷狗音乐链接',
  `kuwo` varchar(255) DEFAULT NULL COMMENT '酷我音乐链接',
  `qishui` varchar(255) DEFAULT NULL COMMENT '汽水音乐链接',
  `spotify` varchar(255) DEFAULT NULL COMMENT 'Spotify链接',
  `youtube` varchar(255) DEFAULT NULL COMMENT 'YouTube链接',
  `appleMusic` varchar(255) DEFAULT NULL COMMENT 'Apple Music链接',
  `soundCloud` varchar(255) DEFAULT NULL COMMENT 'SoundCloud链接'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专辑链接展示页面';

-- --------------------------------------------------------

--
-- 表的结构 `album_link_songs`
--

CREATE TABLE `album_link_songs` (
  `id` int(11) NOT NULL,
  `songName` varchar(255) NOT NULL COMMENT '歌曲名称',
  `trackNumber` int(11) NOT NULL DEFAULT '1' COMMENT '歌曲排序号',
  `albumLinkId` int(11) NOT NULL COMMENT '关联到的专辑链接ID',
  `internalSongId` int(11) DEFAULT NULL COMMENT '关联到系统内部歌曲ID',
  `netease` varchar(255) DEFAULT NULL COMMENT '网易云音乐链接',
  `qq` varchar(255) DEFAULT NULL COMMENT 'QQ音乐链接',
  `kugou` varchar(255) DEFAULT NULL COMMENT '酷狗音乐链接',
  `kuwo` varchar(255) DEFAULT NULL COMMENT '酷我音乐链接',
  `qishui` varchar(255) DEFAULT NULL COMMENT '汽水音乐链接',
  `spotify` varchar(255) DEFAULT NULL COMMENT 'Spotify链接',
  `youtube` varchar(255) DEFAULT NULL COMMENT 'YouTube链接',
  `appleMusic` varchar(255) DEFAULT NULL COMMENT 'Apple Music链接',
  `soundCloud` varchar(255) DEFAULT NULL COMMENT 'SoundCloud链接',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专辑链接中的歌曲';

-- --------------------------------------------------------

--
-- 表的结构 `album_platform_releases`
--

CREATE TABLE `album_platform_releases` (
  `id` int(11) NOT NULL,
  `albumId` int(11) NOT NULL COMMENT '专辑ID',
  `platform` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '音乐平台 (e.g., "netease", "qq")',
  `isReleased` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已上架',
  `releasedAt` datetime DEFAULT NULL COMMENT '上架时间',
  `albumUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '平台上的专辑链接',
  `notified` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已发送上架通知',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `artisteditrequests`
--

CREATE TABLE `artisteditrequests` (
  `id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `comment` varchar(255) DEFAULT NULL,
  `reason` text COMMENT '用户提交修改申请的理由',
  `newName` varchar(255) DEFAULT NULL,
  `newRealName` varchar(255) DEFAULT NULL,
  `newNetease` varchar(255) DEFAULT NULL,
  `newQq` varchar(255) DEFAULT NULL,
  `newKugou` varchar(255) DEFAULT NULL,
  `newKuwo` varchar(255) DEFAULT NULL,
  `newQishui` varchar(255) DEFAULT NULL,
  `newSpotify` varchar(255) DEFAULT NULL,
  `newYoutube` varchar(255) DEFAULT NULL,
  `newAppleMusic` varchar(255) DEFAULT NULL,
  `newSoundCloud` varchar(255) DEFAULT NULL,
  `artistId` int(11) NOT NULL,
  `songId` int(11) DEFAULT NULL,
  `requestedById` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `original_id_number` varchar(18) DEFAULT NULL COMMENT '原始身份证号码',
  `new_id_number` varchar(18) DEFAULT NULL COMMENT '新的身份证号码'
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `artists`
--

CREATE TABLE `artists` (
  `id` int(11) NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `realName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `netease` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qq` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kugou` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kuwo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qishui` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spotify` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `youtube` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appleMusic` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `soundCloud` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `id_number` varchar(18) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '身份证号码',
  `createdById` int(11) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '艺人介绍',
  `alias` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '艺人别名',
  `artistType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '艺人类型',
  `region` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所在地区',
  `avatarUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL',
  `isNewArtist` tinyint(1) NOT NULL DEFAULT '0' COMMENT '标记是否为用户创建的全新歌手（无平台链接）',
  `canonicalArtistId` int(11) DEFAULT NULL COMMENT '指向官方主艺人记录的ID，用于处理重复数据'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `beatarrayaccounts`
--

CREATE TABLE `beatarrayaccounts` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '存储加密后的密码',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `beat_array_labels`
--

CREATE TABLE `beat_array_labels` (
  `id` int(11) NOT NULL,
  `beatArrayId` int(11) NOT NULL COMMENT '节奏阵列厂牌ID',
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '厂牌URL',
  `nameEn` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '厂牌英文名称',
  `nameZh` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '厂牌中文名称',
  `genre` text COLLATE utf8mb4_unicode_ci COMMENT '厂牌风格',
  `birthday` datetime DEFAULT NULL COMMENT '厂牌创建日期',
  `show` tinyint(1) DEFAULT NULL COMMENT '是否展示',
  `submitStatus` tinyint(1) DEFAULT NULL COMMENT '是否接受投稿',
  `submitStatusMark` text COLLATE utf8mb4_unicode_ci COMMENT '投稿状态标记',
  `hot` int(11) DEFAULT NULL COMMENT '热度',
  `coverLink` text COLLATE utf8mb4_unicode_ci COMMENT '封面链接',
  `headerImgLink` text COLLATE utf8mb4_unicode_ci COMMENT '头图链接',
  `country` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '国家',
  `orgType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '组织类型',
  `starCount` int(11) DEFAULT NULL COMMENT '星标数量',
  `lastOnLineTime` datetime DEFAULT NULL COMMENT '最后在线时间',
  `createdTime` datetime DEFAULT NULL COMMENT '创建时间',
  `lastUpdated` datetime NOT NULL COMMENT '最后更新时间',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `isBound` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否绑定极音记',
  `boundUserId` int(11) DEFAULT NULL COMMENT '绑定的极音记用户ID',
  `boundLabelId` int(11) DEFAULT NULL COMMENT '绑定的极音记厂牌ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `chatlogs`
--

CREATE TABLE `chatlogs` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `userMessage` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `aiResponse` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('success','error') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `reasoningContent` text COLLATE utf8mb4_unicode_ci COMMENT 'AI 的思考过程'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `covertemplates`
--

CREATE TABLE `covertemplates` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `definition` json NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `dynamic_cover_requests`
--

CREATE TABLE `dynamic_cover_requests` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `albumId` int(11) NOT NULL,
  `dynamicCoverPath` varchar(255) DEFAULT NULL COMMENT '动态封面文件路径 (1:1方形格式)',
  `originalFilename` varchar(255) NOT NULL COMMENT '原始文件名',
  `fileSize` int(11) NOT NULL COMMENT '文件大小(字节)',
  `duration` float DEFAULT NULL COMMENT '视频时长(秒)',
  `resolution` varchar(255) DEFAULT NULL COMMENT '视频分辨率，例如: 720x720',
  `platform` enum('netease','qqmusic','applemusic') NOT NULL COMMENT '目标平台: netease(网易云音乐), qqmusic(QQ音乐), applemusic(苹果音乐)',
  `status` varchar(255) NOT NULL DEFAULT 'pending' COMMENT '申请状态: pending(待审核), approved(极音记审核通过), submitted(已递交音乐平台), rejected(被拒绝)',
  `adminComment` text COMMENT '管理员备注',
  `rejectionReason` text COMMENT '拒绝原因',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `portraitCoverPath` varchar(255) DEFAULT NULL COMMENT '动态封面文件路径 (3:4竖版格式)',
  `portraitOriginalFilename` varchar(255) DEFAULT NULL COMMENT '竖版封面原始文件名',
  `portraitFileSize` int(11) DEFAULT NULL COMMENT '竖版封面文件大小',
  `portraitDuration` float DEFAULT NULL COMMENT '竖版封面视频时长',
  `portraitResolution` varchar(255) DEFAULT NULL COMMENT '竖版封面分辨率'
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `emailsettings`
--

CREATE TABLE `emailsettings` (
  `settingType` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `template` text COLLATE utf8mb4_unicode_ci,
  `lastModifiedBy` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int(11) NOT NULL,
  `to` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '收件人邮箱',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮件主题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮件内容',
  `htmlContent` text COLLATE utf8mb4_unicode_ci COMMENT 'HTML格式的邮件内容',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮件类型，如验证码、密码重置、专辑审核等',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success' COMMENT '发送状态：success-成功，failed-失败',
  `messageId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮件ID',
  `error` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `material_templates`
--

CREATE TABLE `material_templates` (
  `id` int(11) NOT NULL COMMENT '物料模板唯一ID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物料名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '物料的详细描述',
  `imageUrl` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物料图片链接',
  `tags` json DEFAULT NULL COMMENT '物料标签 (JSON数组格式, e.g., ["周边", "服饰"])',
  `createdBy` int(11) NOT NULL COMMENT '创建该模板的管理员ID',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料模板表，定义可发送的物料种类';

-- --------------------------------------------------------

--
-- 表的结构 `new_song_links`
--

CREATE TABLE `new_song_links` (
  `id` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '新曲链接页面标题',
  `songName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '歌曲名称',
  `artistName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '歌手名称',
  `coverImage` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '封面图片URL',
  `releaseDate` datetime NOT NULL COMMENT '发布日期',
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '页面标识符，用于URL',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '页面描述',
  `netease` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '网易云音乐链接',
  `qq` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'QQ音乐链接',
  `kugou` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '酷狗音乐链接',
  `kuwo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '酷我音乐链接',
  `qishui` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '汽水音乐链接',
  `spotify` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Spotify链接',
  `youtube` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'YouTube链接',
  `appleMusic` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Apple Music链接',
  `soundCloud` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SoundCloud链接',
  `isActive` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否显示',
  `createdById` int(11) NOT NULL COMMENT '创建者ID',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `promotion_requests`
--

CREATE TABLE `promotion_requests` (
  `id` bigint(20) NOT NULL,
  `albumId` bigint(20) NOT NULL,
  `userId` bigint(20) NOT NULL,
  `status` enum('pending','approved','completed') NOT NULL DEFAULT 'pending' COMMENT '待审核,极音记审核通过,已收到推广资源',
  `highlights` text NOT NULL,
  `existingPromotion` text,
  `promotionResources` text,
  `rejectionReason` text,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `release_monitor_history`
--

CREATE TABLE `release_monitor_history` (
  `id` int(11) NOT NULL,
  `albumId` int(11) NOT NULL COMMENT '专辑ID',
  `albumName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '专辑名称',
  `artistName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '艺术家名称',
  `platform` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '检测平台',
  `checkTime` datetime NOT NULL COMMENT '检测时间',
  `detected` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否检测到上架',
  `matchCount` int(11) NOT NULL DEFAULT '0' COMMENT '匹配数量',
  `apiResponse` text COLLATE utf8mb4_unicode_ci COMMENT 'API响应内容，JSON格式',
  `notified` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已通知',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `linkUpdated` tinyint(1) DEFAULT '0' COMMENT '链接是否已自动更新到专辑链接'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `release_monitor_settings`
--

CREATE TABLE `release_monitor_settings` (
  `id` int(11) NOT NULL,
  `checkFrequency` enum('minutes','hourly','6hours','12hours','daily','weekly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily' COMMENT '检查频率',
  `minutesInterval` int(11) NOT NULL DEFAULT '5' COMMENT '分钟间隔，当checkFrequency为minutes时使用',
  `checkTime` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '09:00' COMMENT '检查时间，格式为HH:MM',
  `matchThreshold` int(11) NOT NULL DEFAULT '1' COMMENT '匹配阈值，至少需要多少个匹配才认为检测到',
  `enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用自动检测',
  `platforms` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '需要检测的平台，JSON数组',
  `lastCheckTime` datetime DEFAULT NULL COMMENT '上次检测时间',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `schedulertasks`
--

CREATE TABLE `schedulertasks` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `expression` varchar(50) NOT NULL COMMENT 'Cron表达式',
  `timezone` varchar(50) NOT NULL DEFAULT 'Asia/Shanghai',
  `status` enum('active','paused') NOT NULL DEFAULT 'active',
  `lastRunAt` datetime DEFAULT NULL,
  `nextRunAt` datetime DEFAULT NULL,
  `runCount` int(11) NOT NULL DEFAULT '0',
  `logDirectory` varchar(255) DEFAULT NULL COMMENT '日志文件目录',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `songartists`
--

CREATE TABLE `songartists` (
  `SongId` int(11) NOT NULL,
  `ArtistId` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `songs`
--

CREATE TABLE `songs` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `wavFile` varchar(255) DEFAULT NULL,
  `genre` varchar(255) NOT NULL,
  `language` varchar(255) NOT NULL,
  `duration` int(11) DEFAULT NULL,
  `trackNumber` int(11) NOT NULL DEFAULT '1',
  `albumId` int(11) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `lyricsFile` varchar(255) DEFAULT NULL COMMENT '歌词文件路径',
  `translationLyricsFile` varchar(255) DEFAULT NULL COMMENT '翻译歌词文件路径',
  `artists` json DEFAULT NULL COMMENT '歌曲关联的艺术家ID列表，有序，JSON格式',
  `authorizationFile` varchar(255) DEFAULT NULL COMMENT '歌曲授权文件路径',
  `isrc` varchar(12) DEFAULT NULL COMMENT 'ISRC国际标准录音制品代码，12位字符格式，例如：HKG732539030',
  `upc` varchar(20) DEFAULT NULL COMMENT 'UPC通用产品代码，用于标识专辑/发行'
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- 表的结构 `song_artist_authorizations`
--

CREATE TABLE `song_artist_authorizations` (
  `id` int(11) NOT NULL,
  `songId` int(11) NOT NULL,
  `artistId` int(11) NOT NULL,
  `authorizationFile` varchar(255) DEFAULT NULL COMMENT '授权文件路径',
  `uploadedBy` int(11) DEFAULT NULL COMMENT '上传授权文件的用户ID',
  `uploadedAt` datetime DEFAULT NULL COMMENT '上传授权文件的时间',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='存储歌曲与艺术家之间的授权文件信息';

-- --------------------------------------------------------

--
-- 表的结构 `taskexecutionlogs`
--

CREATE TABLE `taskexecutionlogs` (
  `id` int(11) NOT NULL,
  `taskId` varchar(50) NOT NULL,
  `startTime` datetime NOT NULL,
  `endTime` datetime DEFAULT NULL,
  `status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
  `result` text,
  `error` text,
  `logFile` varchar(255) DEFAULT NULL COMMENT '日志文件路径',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `useremailtemplate`
--

CREATE TABLE `useremailtemplate` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `templateType` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `labelId` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','admin','label_manager') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `isEmailVerified` tinyint(1) DEFAULT '0',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `dailyCoverGenerationCount` int(11) NOT NULL DEFAULT '0',
  `coverGenerationTimestamp` datetime DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastLoginAt` datetime DEFAULT NULL,
  `lastLoginIp` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastLoginLocation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `userverifications`
--

CREATE TABLE `userverifications` (
  `id` int(11) NOT NULL,
  `realName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户真实姓名',
  `idNumber` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '身份证号码（加密存储）',
  `bankAccount` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '银行账号（加密存储）',
  `bankName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '开户银行名称',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '审核状态：待审核、已通过、已拒绝',
  `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核意见，拒绝时必填',
  `userId` int(11) NOT NULL COMMENT '关联的用户ID',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `user_shipments`
--

CREATE TABLE `user_shipments` (
  `id` int(11) NOT NULL COMMENT '发货记录唯一ID',
  `userId` int(11) NOT NULL COMMENT '接收用户的ID',
  `materialTemplateId` int(11) NOT NULL COMMENT '关联的物料模板ID',
  `status` enum('processing','accepted','in-transit','shipping','delivered') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'processing' COMMENT '物流状态：processing-处理中, accepted-已揽收, in-transit-运输中, shipping-派送中, delivered-已送达',
  `carrier` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '快递公司名称',
  `trackingNumber` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '快递运单号',
  `shippedAt` datetime DEFAULT NULL COMMENT '发货时间',
  `adminNotes` text COLLATE utf8mb4_unicode_ci COMMENT '管理员备注（针对本次发货）',
  `createdBy` int(11) NOT NULL COMMENT '创建该发货记录的用户ID',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户物料发货记录表';

-- --------------------------------------------------------

--
-- 表的结构 `verificationtokens`
--

CREATE TABLE `verificationtokens` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('email_verification','password_reset') COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime NOT NULL,
  `usedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转储表的索引
--

--
-- 表的索引 `ai_generation_assets`
--
ALTER TABLE `ai_generation_assets`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `albums`
--
ALTER TABLE `albums`
  ADD PRIMARY KEY (`id`),
  ADD KEY `submittedById` (`submittedById`),
  ADD KEY `idx_album_is_released` (`isReleased`),
  ADD KEY `idx_album_released_at` (`releasedAt`),
  ADD KEY `fk_albums_label` (`labelId`),
  ADD KEY `fk_albums_material_delivered_by` (`materialDeliveredBy`),
  ADD KEY `idx_material_delivered` (`materialDelivered`),
  ADD KEY `idx_material_delivered_at` (`materialDeliveredAt`);

--
-- 表的索引 `album_links`
--
ALTER TABLE `album_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `createdById` (`createdById`),
  ADD KEY `internalAlbumId` (`internalAlbumId`);

--
-- 表的索引 `album_link_songs`
--
ALTER TABLE `album_link_songs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `albumLinkId` (`albumLinkId`),
  ADD KEY `internalSongId` (`internalSongId`);

--
-- 表的索引 `album_platform_releases`
--
ALTER TABLE `album_platform_releases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `album_platform_releases_albumId_platform_unique` (`albumId`,`platform`);

--
-- 表的索引 `artisteditrequests`
--
ALTER TABLE `artisteditrequests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `artistId` (`artistId`),
  ADD KEY `songId` (`songId`),
  ADD KEY `requestedById` (`requestedById`);

--
-- 表的索引 `artists`
--
ALTER TABLE `artists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_artists_createdById` (`createdById`),
  ADD KEY `idx_artists_canonical_id` (`canonicalArtistId`);

--
-- 表的索引 `beatarrayaccounts`
--
ALTER TABLE `beatarrayaccounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `userId_email_unique` (`userId`,`email`);

--
-- 表的索引 `beat_array_labels`
--
ALTER TABLE `beat_array_labels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `beatArrayId` (`beatArrayId`),
  ADD KEY `beat_array_id_index` (`beatArrayId`),
  ADD KEY `bound_user_id_index` (`boundUserId`),
  ADD KEY `bound_label_id_index` (`boundLabelId`);

--
-- 表的索引 `chatlogs`
--
ALTER TABLE `chatlogs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chatlogs_user_id` (`userId`),
  ADD KEY `chatlogs_created_at` (`createdAt`);

--
-- 表的索引 `covertemplates`
--
ALTER TABLE `covertemplates`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `dynamic_cover_requests`
--
ALTER TABLE `dynamic_cover_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dynamic_cover_user` (`userId`),
  ADD KEY `idx_dynamic_cover_album` (`albumId`),
  ADD KEY `idx_dynamic_cover_status` (`status`);

--
-- 表的索引 `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `material_templates`
--
ALTER TABLE `material_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_createdBy` (`createdBy`);

--
-- 表的索引 `new_song_links`
--
ALTER TABLE `new_song_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `createdById` (`createdById`);

--
-- 表的索引 `promotion_requests`
--
ALTER TABLE `promotion_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `albumId` (`albumId`),
  ADD KEY `userId` (`userId`),
  ADD KEY `status` (`status`),
  ADD KEY `createdAt` (`createdAt`);

--
-- 表的索引 `release_monitor_history`
--
ALTER TABLE `release_monitor_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `album_platform_idx` (`albumId`,`platform`),
  ADD KEY `check_time_idx` (`checkTime`),
  ADD KEY `detected_idx` (`detected`),
  ADD KEY `idx_link_updated` (`linkUpdated`);

--
-- 表的索引 `release_monitor_settings`
--
ALTER TABLE `release_monitor_settings`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `schedulertasks`
--
ALTER TABLE `schedulertasks`
  ADD PRIMARY KEY (`id`);

--
-- 表的索引 `songartists`
--
ALTER TABLE `songartists`
  ADD PRIMARY KEY (`SongId`,`ArtistId`),
  ADD KEY `ArtistId` (`ArtistId`);

--
-- 表的索引 `songs`
--
ALTER TABLE `songs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `albumId` (`albumId`),
  ADD KEY `idx_isrc` (`isrc`);

--
-- 表的索引 `song_artist_authorizations`
--
ALTER TABLE `song_artist_authorizations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `song_artist_auth_unique` (`songId`,`artistId`),
  ADD KEY `song_artist_authorizations_songId_fk` (`songId`),
  ADD KEY `song_artist_authorizations_artistId_fk` (`artistId`),
  ADD KEY `song_artist_authorizations_uploadedBy_fk` (`uploadedBy`);

--
-- 表的索引 `taskexecutionlogs`
--
ALTER TABLE `taskexecutionlogs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `taskId` (`taskId`);

--
-- 表的索引 `useremailtemplate`
--
ALTER TABLE `useremailtemplate`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- 表的索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username_2` (`username`),
  ADD UNIQUE KEY `email_2` (`email`),
  ADD UNIQUE KEY `username_3` (`username`),
  ADD UNIQUE KEY `email_3` (`email`),
  ADD UNIQUE KEY `username_4` (`username`),
  ADD UNIQUE KEY `email_4` (`email`),
  ADD UNIQUE KEY `username_5` (`username`),
  ADD UNIQUE KEY `email_5` (`email`),
  ADD UNIQUE KEY `username_6` (`username`),
  ADD UNIQUE KEY `email_6` (`email`),
  ADD UNIQUE KEY `username_7` (`username`),
  ADD UNIQUE KEY `email_7` (`email`),
  ADD UNIQUE KEY `username_8` (`username`),
  ADD UNIQUE KEY `email_8` (`email`),
  ADD UNIQUE KEY `username_9` (`username`),
  ADD UNIQUE KEY `email_9` (`email`),
  ADD UNIQUE KEY `username_10` (`username`),
  ADD UNIQUE KEY `email_10` (`email`),
  ADD UNIQUE KEY `username_11` (`username`),
  ADD UNIQUE KEY `email_11` (`email`),
  ADD UNIQUE KEY `username_12` (`username`),
  ADD UNIQUE KEY `email_12` (`email`),
  ADD UNIQUE KEY `username_13` (`username`),
  ADD UNIQUE KEY `email_13` (`email`),
  ADD UNIQUE KEY `username_14` (`username`),
  ADD UNIQUE KEY `email_14` (`email`),
  ADD UNIQUE KEY `username_15` (`username`),
  ADD UNIQUE KEY `email_15` (`email`),
  ADD UNIQUE KEY `username_16` (`username`),
  ADD UNIQUE KEY `email_16` (`email`),
  ADD UNIQUE KEY `username_17` (`username`),
  ADD UNIQUE KEY `email_17` (`email`),
  ADD UNIQUE KEY `username_18` (`username`),
  ADD UNIQUE KEY `email_18` (`email`),
  ADD UNIQUE KEY `username_19` (`username`),
  ADD UNIQUE KEY `email_19` (`email`),
  ADD UNIQUE KEY `username_20` (`username`),
  ADD UNIQUE KEY `email_20` (`email`),
  ADD UNIQUE KEY `username_21` (`username`),
  ADD UNIQUE KEY `email_21` (`email`),
  ADD UNIQUE KEY `username_22` (`username`),
  ADD UNIQUE KEY `email_22` (`email`),
  ADD UNIQUE KEY `username_23` (`username`),
  ADD UNIQUE KEY `email_23` (`email`),
  ADD UNIQUE KEY `username_24` (`username`),
  ADD UNIQUE KEY `email_24` (`email`),
  ADD UNIQUE KEY `username_25` (`username`),
  ADD UNIQUE KEY `email_25` (`email`),
  ADD UNIQUE KEY `username_26` (`username`),
  ADD UNIQUE KEY `email_26` (`email`),
  ADD UNIQUE KEY `username_27` (`username`),
  ADD UNIQUE KEY `email_27` (`email`),
  ADD UNIQUE KEY `username_28` (`username`),
  ADD UNIQUE KEY `email_28` (`email`),
  ADD UNIQUE KEY `username_29` (`username`),
  ADD UNIQUE KEY `email_29` (`email`),
  ADD UNIQUE KEY `username_30` (`username`),
  ADD UNIQUE KEY `email_30` (`email`),
  ADD UNIQUE KEY `username_31` (`username`),
  ADD UNIQUE KEY `email_31` (`email`),
  ADD UNIQUE KEY `username_32` (`username`);

--
-- 表的索引 `userverifications`
--
ALTER TABLE `userverifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `userId` (`userId`);

--
-- 表的索引 `user_shipments`
--
ALTER TABLE `user_shipments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_userId` (`userId`),
  ADD KEY `idx_materialTemplateId` (`materialTemplateId`),
  ADD KEY `idx_createdBy` (`createdBy`);

--
-- 表的索引 `verificationtokens`
--
ALTER TABLE `verificationtokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_verification_tokens_token` (`token`),
  ADD KEY `idx_verification_tokens_user_type` (`userId`,`type`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `ai_generation_assets`
--
ALTER TABLE `ai_generation_assets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `albums`
--
ALTER TABLE `albums`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `album_links`
--
ALTER TABLE `album_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `album_link_songs`
--
ALTER TABLE `album_link_songs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `album_platform_releases`
--
ALTER TABLE `album_platform_releases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `artisteditrequests`
--
ALTER TABLE `artisteditrequests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `artists`
--
ALTER TABLE `artists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `beatarrayaccounts`
--
ALTER TABLE `beatarrayaccounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `beat_array_labels`
--
ALTER TABLE `beat_array_labels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `chatlogs`
--
ALTER TABLE `chatlogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `covertemplates`
--
ALTER TABLE `covertemplates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `dynamic_cover_requests`
--
ALTER TABLE `dynamic_cover_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `material_templates`
--
ALTER TABLE `material_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '物料模板唯一ID';

--
-- 使用表AUTO_INCREMENT `new_song_links`
--
ALTER TABLE `new_song_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `promotion_requests`
--
ALTER TABLE `promotion_requests`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `release_monitor_history`
--
ALTER TABLE `release_monitor_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `release_monitor_settings`
--
ALTER TABLE `release_monitor_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `songs`
--
ALTER TABLE `songs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `song_artist_authorizations`
--
ALTER TABLE `song_artist_authorizations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `taskexecutionlogs`
--
ALTER TABLE `taskexecutionlogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `useremailtemplate`
--
ALTER TABLE `useremailtemplate`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `userverifications`
--
ALTER TABLE `userverifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `user_shipments`
--
ALTER TABLE `user_shipments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '发货记录唯一ID';

--
-- 使用表AUTO_INCREMENT `verificationtokens`
--
ALTER TABLE `verificationtokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 限制导出的表
--

--
-- 限制表 `albums`
--
ALTER TABLE `albums`
  ADD CONSTRAINT `albums_ibfk_1` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_10` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_11` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_12` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_13` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_14` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_15` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_16` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_17` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_18` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_19` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_2` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_20` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_21` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_22` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_23` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_24` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_25` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_26` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_27` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_28` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_29` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_3` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_30` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_31` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_4` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_5` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_6` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_7` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_8` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `albums_ibfk_9` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_albums_label` FOREIGN KEY (`labelId`) REFERENCES `labels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_albums_material_delivered_by` FOREIGN KEY (`materialDeliveredBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- 限制表 `album_links`
--
ALTER TABLE `album_links`
  ADD CONSTRAINT `album_links_ibfk_1` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `album_links_ibfk_2` FOREIGN KEY (`internalAlbumId`) REFERENCES `albums` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- 限制表 `album_platform_releases`
--
ALTER TABLE `album_platform_releases`
  ADD CONSTRAINT `album_platform_releases_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `albums` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- 限制表 `artists`
--
ALTER TABLE `artists`
  ADD CONSTRAINT `fk_artists_canonical_id` FOREIGN KEY (`canonicalArtistId`) REFERENCES `artists` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_artists_createdById` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- 限制表 `beatarrayaccounts`
--
ALTER TABLE `beatarrayaccounts`
  ADD CONSTRAINT `fk_user_id` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- 限制表 `chatlogs`
--
ALTER TABLE `chatlogs`
  ADD CONSTRAINT `chatlogs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- 限制表 `material_templates`
--
ALTER TABLE `material_templates`
  ADD CONSTRAINT `fk_template_creator` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- 限制表 `new_song_links`
--
ALTER TABLE `new_song_links`
  ADD CONSTRAINT `new_song_links_ibfk_1` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- 限制表 `taskexecutionlogs`
--
ALTER TABLE `taskexecutionlogs`
  ADD CONSTRAINT `TaskExecutionLogs_ibfk_1` FOREIGN KEY (`taskId`) REFERENCES `schedulertasks` (`id`) ON DELETE CASCADE;

--
-- 限制表 `useremailtemplate`
--
ALTER TABLE `useremailtemplate`
  ADD CONSTRAINT `useremailtemplate_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- 限制表 `userverifications`
--
ALTER TABLE `userverifications`
  ADD CONSTRAINT `userverifications_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- 限制表 `user_shipments`
--
ALTER TABLE `user_shipments`
  ADD CONSTRAINT `fk_shipment_creator` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_shipments_template` FOREIGN KEY (`materialTemplateId`) REFERENCES `material_templates` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_shipments_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- 限制表 `verificationtokens`
--
ALTER TABLE `verificationtokens`
  ADD CONSTRAINT `verificationtokens_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
