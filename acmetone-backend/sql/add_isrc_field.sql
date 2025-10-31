-- 为songs表添加ISRC字段
-- ISRC (International Standard Recording Code) 国际标准录音制品代码
-- 格式：12位字符，例如：HKG732539030

ALTER TABLE `songs` 
ADD COLUMN `isrc` VARCHAR(12) DEFAULT NULL COMMENT 'ISRC国际标准录音制品代码，12位字符格式，例如：HKG732539030';

-- 为ISRC字段添加索引以提高查询性能
ALTER TABLE `songs` 
ADD INDEX `idx_isrc` (`isrc`);
