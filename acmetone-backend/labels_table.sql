-- 创建厂牌表（基于现有项目结构）
CREATE TABLE IF NOT EXISTS `labels` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL COMMENT '关联的用户ID',
    `chinese_name` varchar(100) NOT NULL COMMENT '厂牌中文名',
    `english_name` varchar(100) NOT NULL COMMENT '厂牌英文名',
    `description` text DEFAULT NULL COMMENT '厂牌描述',
    `logo_url` varchar(255) DEFAULT NULL COMMENT '厂牌Logo URL',
    `website` varchar(255) DEFAULT NULL COMMENT '官方网站',
    `contact_email` varchar(100) DEFAULT NULL COMMENT '联系邮箱',
    `contact_qqgroup` varchar(20) DEFAULT NULL COMMENT '联系QQ群',
    `rhythm_array_account` varchar(100) DEFAULT NULL COMMENT '节奏阵列账号',
    `rhythm_array_password` varchar(255) DEFAULT NULL COMMENT '节奏阵列密码（MD5加密）',
    `status` enum(
        'active',
        'inactive',
        'pending'
    ) NOT NULL DEFAULT 'pending' COMMENT '状态：激活/停用/待审核',
    `verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已验证',
    `verified_at` datetime DEFAULT NULL COMMENT '验证时间',
    `verified_by` int(11) DEFAULT NULL COMMENT '验证者用户ID',
    `review_comment` text DEFAULT NULL COMMENT '审核备注',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_id` (`user_id`),
    UNIQUE KEY `chinese_name` (`chinese_name`),
    UNIQUE KEY `english_name` (`english_name`),
    KEY `idx_status` (`status`),
    KEY `idx_verified_by` (`verified_by`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '厂牌表';

-- 如果表已存在但缺少某些字段，可以使用以下ALTER语句添加：

-- 添加审核备注字段（如果不存在）
ALTER TABLE `labels`
ADD COLUMN IF NOT EXISTS `review_comment` text DEFAULT NULL COMMENT '审核备注';

-- 添加索引（如果不存在）
ALTER TABLE `labels` ADD INDEX IF NOT EXISTS `idx_status` (`status`);

ALTER TABLE `labels`
ADD INDEX IF NOT EXISTS `idx_verified_by` (`verified_by`);

-- 注意：外键约束可以根据需要手动添加
-- ALTER TABLE `labels` ADD CONSTRAINT `fk_labels_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
-- ALTER TABLE `labels` ADD CONSTRAINT `fk_labels_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;