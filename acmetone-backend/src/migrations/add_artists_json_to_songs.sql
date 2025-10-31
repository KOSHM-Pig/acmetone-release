-- 添加artists JSON字段到songs表
ALTER TABLE `songs` ADD `artists` JSON DEFAULT NULL COMMENT '歌曲关联的艺术家ID列表，有序，JSON格式'; 