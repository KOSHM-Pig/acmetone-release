-- 为albums表添加isReleased和releasedAt字段
ALTER TABLE `albums` 
ADD COLUMN `isReleased` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '专辑是否已上架' AFTER `performerIds`,
ADD COLUMN `releasedAt` DATETIME NULL COMMENT '专辑上架时间' AFTER `isReleased`;

-- 创建索引以加快查询
CREATE INDEX `idx_album_is_released` ON `albums` (`isReleased`);
CREATE INDEX `idx_album_released_at` ON `albums` (`releasedAt`);

-- 向历史记录表中添加索引，提高查询效率
CREATE INDEX IF NOT EXISTS `idx_release_monitor_history_album_id` ON `release_monitor_history` (`albumId`);
CREATE INDEX IF NOT EXISTS `idx_release_monitor_history_detected` ON `release_monitor_history` (`detected`); 