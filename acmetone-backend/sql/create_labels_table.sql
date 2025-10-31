-- =====================================================
-- 厂牌系统数据库脚本
-- 创建时间: 2025-01-08
-- 描述: 创建厂牌管理表，包括厂牌信息和权限控制
-- =====================================================

-- 1. 创建厂牌信息表
CREATE TABLE `labels` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL COMMENT '关联的用户ID',
    `chinese_name` varchar(100) NOT NULL COMMENT '厂牌中文名',
    `english_name` varchar(100) NOT NULL COMMENT '厂牌英文名',
    `description` text COMMENT '厂牌描述',
    `logo_url` varchar(255) COMMENT '厂牌Logo URL',
    `website` varchar(255) COMMENT '官方网站',
    `contact_email` varchar(100) COMMENT '联系邮箱',
    `contact_qqgroup` varchar(20) COMMENT '联系QQ群',
    `rhythm_array_account` varchar(255) COMMENT '节奏阵列账号（AES加密）',
    `rhythm_array_password` varchar(255) COMMENT '节奏阵列密码（AES加密）',
    `status` enum(
        'active',
        'inactive',
        'pending'
    ) NOT NULL DEFAULT 'pending' COMMENT '状态：激活/停用/待审核',
    `verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已验证',
    `verified_at` datetime DEFAULT NULL COMMENT '验证时间',
    `verified_by` int(11) DEFAULT NULL COMMENT '验证者用户ID',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `user_id` (`user_id`),
    UNIQUE KEY `chinese_name` (`chinese_name`),
    UNIQUE KEY `english_name` (`english_name`),
    KEY `status` (`status`),
    KEY `verified` (`verified`),
    KEY `verified_by` (`verified_by`),
    CONSTRAINT `labels_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `labels_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '厂牌信息表';

-- 2. 创建厂牌权限表
CREATE TABLE `label_permissions` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `label_id` int(11) NOT NULL COMMENT '厂牌ID',
    `permission` varchar(50) NOT NULL COMMENT '权限名称',
    `granted` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否授予',
    `granted_by` int(11) DEFAULT NULL COMMENT '授予者用户ID',
    `granted_at` datetime DEFAULT CURRENT_TIMESTAMP,
    `expires_at` datetime DEFAULT NULL COMMENT '权限过期时间',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `label_permission_unique` (`label_id`, `permission`),
    KEY `label_id` (`label_id`),
    KEY `granted_by` (`granted_by`),
    KEY `permission` (`permission`),
    KEY `expires_at` (`expires_at`),
    CONSTRAINT `label_permissions_label_id_foreign` FOREIGN KEY (`label_id`) REFERENCES `labels` (`id`) ON DELETE CASCADE,
    CONSTRAINT `label_permissions_granted_by_foreign` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '厂牌权限表';

-- 3. 创建厂牌操作日志表
CREATE TABLE `label_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `label_id` int(11) NOT NULL COMMENT '厂牌ID',
    `user_id` int(11) NOT NULL COMMENT '操作用户ID',
    `action` varchar(50) NOT NULL COMMENT '操作类型',
    `description` text COMMENT '操作描述',
    `ip_address` varchar(45) COMMENT 'IP地址',
    `user_agent` text COMMENT '用户代理',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `label_id` (`label_id`),
    KEY `user_id` (`user_id`),
    KEY `action` (`action`),
    KEY `created_at` (`created_at`),
    CONSTRAINT `label_logs_label_id_foreign` FOREIGN KEY (`label_id`) REFERENCES `labels` (`id`) ON DELETE CASCADE,
    CONSTRAINT `label_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '厂牌操作日志表';

-- 4. 创建视图：厂牌详细信息（不包含敏感信息）
CREATE VIEW `label_details` AS
SELECT
    l.id,
    l.user_id,
    l.chinese_name,
    l.english_name,
    l.description,
    l.logo_url,
    l.website,
    l.contact_email,
    l.contact_phone,
    l.address,
    l.status,
    l.verified,
    l.verified_at,
    l.created_at,
    l.updated_at,
    u.username,
    u.email as user_email,
    vb.username as verified_by_username
FROM
    `labels` l
    LEFT JOIN `users` u ON l.user_id = u.id
    LEFT JOIN `users` vb ON l.verified_by = vb.id;

-- 5. 创建索引优化查询性能
CREATE INDEX `idx_labels_status_verified` ON `labels` (`status`, `verified`);

CREATE INDEX `idx_label_logs_label_created` ON `label_logs` (`label_id`, `created_at`);

-- =====================================================
-- 脚本执行完成
-- 注意事项：
-- 1. 节奏阵列账号密码使用AES加密，需要在应用层实现加密解密
-- 2. 建议使用环境变量存储加密密钥
-- 3. 厂牌创建后默认状态为pending，需要管理员审核
-- 4. 权限系统支持细粒度控制，可根据需要扩展
-- 5. 每个用户只能关联一个厂牌（通过unique约束保证）
--
-- 可用的权限类型：
-- - 'album_create': 创建专辑
-- - 'album_edit': 编辑专辑
-- - 'album_delete': 删除专辑
-- - 'artist_manage': 管理艺人
-- - 'analytics_view': 查看分析数据
-- - 'promotion_create': 创建推广
-- - 'material_download': 下载物料
-- =====================================================