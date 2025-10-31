-- 为albums表添加performer字段
ALTER TABLE albums
ADD COLUMN performer VARCHAR(255) NOT NULL DEFAULT '未知艺术家' COMMENT '专辑表演者，多个表演者用/分隔';
 
-- 为albums表添加performerIds字段
ALTER TABLE albums
ADD COLUMN performerIds TEXT COMMENT '关联的表演者ID，JSON格式';

-- 更新已有记录的performerIds字段为空数组
UPDATE albums SET performerIds = '[]' WHERE performerIds IS NULL; 