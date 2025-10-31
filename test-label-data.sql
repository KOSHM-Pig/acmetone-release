-- 插入测试厂牌数据
INSERT INTO `labels` (
  `user_id`, 
  `chinese_name`, 
  `english_name`, 
  `description`, 
  `website`, 
  `contact_email`, 
  `contact_phone`, 
  `rhythm_array_account`, 
  `rhythm_array_password`, 
  `status`, 
  `created_at`, 
  `updated_at`
) VALUES 
(
  1, 
  '测试厂牌一', 
  'Test Label One', 
  '这是一个测试厂牌，用于验证厂牌管理功能', 
  'https://testlabel1.com', 
  'contact@testlabel1.com', 
  '13800138001', 
  'testlabel1', 
  'password123', 
  'pending', 
  NOW(), 
  NOW()
),
(
  2, 
  '音乐工厂', 
  'Music Factory', 
  '专注于电子音乐制作和发行的厂牌', 
  'https://musicfactory.com', 
  'info@musicfactory.com', 
  '13800138002', 
  'musicfactory', 
  'factory2023', 
  'active', 
  NOW(), 
  NOW()
),
(
  3, 
  '节拍之声', 
  'Beat Sound Records', 
  '致力于推广独立音乐人的厂牌', 
  'https://beatsound.com', 
  'hello@beatsound.com', 
  '13800138003', 
  NULL, 
  NULL, 
  'pending', 
  NOW(), 
  NOW()
),
(
  4, 
  '星光唱片', 
  'Starlight Records', 
  '成立于2020年的新兴厂牌', 
  'https://starlight.com', 
  'contact@starlight.com', 
  '13800138004', 
  'starlight2020', 
  'star123456', 
  'inactive', 
  NOW(), 
  NOW()
),
(
  5, 
  '梦想音乐', 
  'Dream Music', 
  '帮助音乐人实现梦想的厂牌', 
  'https://dreammusic.com', 
  'dream@dreammusic.com', 
  '13800138005', 
  'dreammusic', 
  'dream2023', 
  'pending', 
  NOW(), 
  NOW()
);

-- 更新一些记录的审核信息
UPDATE `labels` SET 
  `reviewer_id` = 1, 
  `review_comment` = '厂牌信息完整，符合要求，予以通过。', 
  `reviewed_at` = NOW() 
WHERE `id` = 2;

UPDATE `labels` SET 
  `reviewer_id` = 1, 
  `review_comment` = '缺少必要的资质文件，暂时拒绝。', 
  `reviewed_at` = NOW() 
WHERE `id` = 4;
