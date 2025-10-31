-- 更新release_monitor_settings表，添加minutesInterval字段，更新checkFrequency类型
ALTER TABLE `release_monitor_settings` 
ADD COLUMN `minutesInterval` INT NOT NULL DEFAULT 5 COMMENT '分钟间隔，当checkFrequency为minutes时使用' AFTER `checkFrequency`;

-- 修改checkFrequency字段类型
ALTER TABLE `release_monitor_settings` 
MODIFY COLUMN `checkFrequency` ENUM('minutes', 'hourly', '6hours', '12hours', 'daily', 'weekly') NOT NULL DEFAULT 'daily' COMMENT '检查频率'; 