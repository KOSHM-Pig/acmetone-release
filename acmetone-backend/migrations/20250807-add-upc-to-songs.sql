-- 添加UPC字段到songs表
-- 执行时间: 2025-08-07

USE acmetone_db;

-- 添加UPC字段
ALTER TABLE `songs` 
ADD COLUMN `upc` varchar(20) DEFAULT NULL COMMENT 'UPC通用产品代码，用于标识专辑/发行' 
AFTER `isrc`;

-- 验证字段是否添加成功
DESCRIBE `songs`;
