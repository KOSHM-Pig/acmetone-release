-- =====================================================
-- 厂牌表创建脚本
-- 创建时间: 2025-01-08
-- 描述: 创建厂牌信息表，支持用户关联和节奏阵列账号密码存储
-- =====================================================

-- 创建厂牌信息表
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
    `rhythm_array_account` varchar(100) COMMENT '节奏阵列账号',
    `rhythm_array_password` varchar(255) COMMENT '节奏阵列密码（MD5加密）',
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

-- =====================================================
-- 表结构说明：
-- 1. 每个用户只能关联一个厂牌（user_id唯一约束）
-- 2. 厂牌中文名和英文名全局唯一
-- 3. 节奏阵列账号明文存储，密码MD5加密
-- 4. 默认状态为pending，需要管理员审核
-- 5. 支持厂牌验证机制
-- =====================================================