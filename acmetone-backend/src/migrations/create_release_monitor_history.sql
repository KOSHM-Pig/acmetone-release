-- 创建上架检测历史表
CREATE TABLE IF NOT EXISTS `release_monitor_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`id`),
  KEY `album_platform_idx` (`albumId`, `platform`),
  KEY `check_time_idx` (`checkTime`),
  KEY `detected_idx` (`detected`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 