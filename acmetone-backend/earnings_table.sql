-- 创建收益表，用于记录用户收益数据
CREATE TABLE `earnings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL COMMENT '收益所属用户ID',
  `sourceType` enum('album_sale', 'streaming', 'other') NOT NULL COMMENT '收益来源类型',
  `sourceId` int(11) DEFAULT NULL COMMENT '来源ID (例如专辑ID)',
  `amount` decimal(10, 2) NOT NULL COMMENT '收益金额',
  `currency` varchar(3) NOT NULL DEFAULT 'CNY' COMMENT '货币单位',
  `earnedAt` datetime NOT NULL COMMENT '收益产生时间',
  `description` varchar(255) DEFAULT NULL COMMENT '收益描述',
  `platform` varchar(50) DEFAULT NULL COMMENT '收益来源平台',
  `status` enum('pending', 'confirmed', 'paid') NOT NULL DEFAULT 'pending' COMMENT '收益状态',
  `paidAt` datetime DEFAULT NULL COMMENT '支付时间',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_earnings_user` (`userId`),
  KEY `idx_earnings_source` (`sourceType`, `sourceId`),
  KEY `idx_earnings_earned_at` (`earnedAt`),
  KEY `idx_earnings_status` (`status`),
  CONSTRAINT `fk_earnings_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收益记录表';

-- 创建收益统计视图，用于快速查询用户总收益
CREATE VIEW `user_earnings_summary` AS
SELECT 
  `userId`,
  SUM(CASE WHEN `status` IN ('confirmed', 'paid') THEN `amount` ELSE 0 END) AS `confirmedEarnings`,
  SUM(CASE WHEN `status` = 'pending' THEN `amount` ELSE 0 END) AS `pendingEarnings`,
  SUM(CASE WHEN `status` = 'paid' THEN `amount` ELSE 0 END) AS `paidEarnings`,
  SUM(`amount`) AS `totalEarnings`,
  COUNT(*) AS `earningsCount`,
  MIN(`earnedAt`) AS `firstEarningDate`,
  MAX(`earnedAt`) AS `lastEarningDate`
FROM `earnings`
GROUP BY `userId`;

-- 创建月度收益统计视图
CREATE VIEW `monthly_earnings` AS
SELECT 
  `userId`,
  DATE_FORMAT(`earnedAt`, '%Y-%m-01') AS `month`,
  SUM(`amount`) AS `monthlyAmount`,
  COUNT(*) AS `transactionCount`
FROM `earnings`
WHERE `status` IN ('confirmed', 'paid')
GROUP BY `userId`, DATE_FORMAT(`earnedAt`, '%Y-%m-01')
ORDER BY `userId`, `month` DESC;

-- 创建收益来源分布视图
CREATE VIEW `earnings_by_source` AS
SELECT 
  `userId`,
  `sourceType`,
  SUM(`amount`) AS `totalAmount`,
  COUNT(*) AS `transactionCount`,
  AVG(`amount`) AS `averageAmount`
FROM `earnings`
WHERE `status` IN ('confirmed', 'paid')
GROUP BY `userId`, `sourceType`
ORDER BY `userId`, `totalAmount` DESC; 