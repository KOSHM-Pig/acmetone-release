-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2025-08-07 16:52:49
-- 服务器版本： 5.7.26
-- PHP 版本： 7.4.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

SET AUTOCOMMIT = 0;

START TRANSACTION;

SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!40101 SET NAMES utf8mb4 */
;

--
-- 数据库： `acmetone`
--

-- --------------------------------------------------------

--
-- 表的结构 `albums`
--

CREATE TABLE `albums` (
    `id` int(11) NOT NULL,
    `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `coverImage` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `releaseDate` datetime NOT NULL,
    `displayInfo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
    `status` enum(
        'pending',
        'approved',
        'rejected'
    ) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
    `comment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `createdAt` datetime NOT NULL,
    `updatedAt` datetime NOT NULL,
    `submittedById` int(11) DEFAULT NULL,
    `authorizationFile` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    `performer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未知艺术家' COMMENT '专辑表演者，多个表演者用/分隔',
    `performerIds` text COLLATE utf8mb4_unicode_ci COMMENT '关联的表演者ID，JSON格式',
    `isReleased` tinyint(1) NOT NULL DEFAULT '0' COMMENT '专辑是否已上架',
    `releasedAt` datetime DEFAULT NULL COMMENT '专辑上架时间',
    `labelId` int(11) DEFAULT NULL,
    `dynamicCoverPath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '动态封面文件路径',
    `hasDynamicCover` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否有动态封面',
    `nodesPositions` text COLLATE utf8mb4_unicode_ci COMMENT '流程图中节点的位置信息（JSON格式）',
    `materialDelivered` tinyint(1) NOT NULL DEFAULT '0' COMMENT '物料是否已传递给发行平台',
    `materialDeliveredAt` datetime DEFAULT NULL COMMENT '物料传递时间',
    `materialDeliveredBy` int(11) DEFAULT NULL COMMENT '物料传递操作人ID'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

--
-- 转存表中的数据 `albums`
--

INSERT INTO
    `albums` (
        `id`,
        `title`,
        `coverImage`,
        `type`,
        `releaseDate`,
        `displayInfo`,
        `description`,
        `status`,
        `comment`,
        `createdAt`,
        `updatedAt`,
        `submittedById`,
        `authorizationFile`,
        `performer`,
        `performerIds`,
        `isReleased`,
        `releasedAt`,
        `labelId`,
        `dynamicCoverPath`,
        `hasDynamicCover`,
        `nodesPositions`,
        `materialDelivered`,
        `materialDeliveredAt`,
        `materialDeliveredBy`
    )
VALUES (
        6,
        '失去你 (Original Acoustic Mix)',
        'uploads/album_covers/album_cover_1753975821547_f9e215f9-b63e-4fad-a2aa-fda56b10b835.jpg',
        '专辑',
        '2025-07-25 00:00:00',
        'ASPIRE SOUND × 极音记',
        '测试简洁测试简洁测试简洁测试简洁测试简洁测试简洁测试简洁测试简洁测试简洁测试简洁',
        'approved',
        '审核通过',
        '2025-07-19 09:17:56',
        '2025-08-06 18:06:07',
        1,
        'uploads/authorizations/authorization______1752916833176.pdf',
        'KOSHM/132312321123/Aspire Sound/12321123',
        '[1,4,25,24]',
        0,
        NULL,
        NULL,
        NULL,
        0,
        '[{\"id\":\"album-6\",\"position\":{\"x\":-174.83123584994686,\"y\":-215.2241851436238}},{\"id\":\"song-69\",\"position\":{\"x\":300,\"y\":100}},{\"id\":\"artist-21\",\"position\":{\"x\":-498.3179986101459,\"y\":715.0368311327309}},{\"id\":\"artist-23\",\"position\":{\"x\":-533.4629603891591,\"y\":-378.8764246004169}},{\"id\":\"song-70\",\"position\":{\"x\":503.3387074357192,\"y\":188.6205698401668}},{\"id\":\"artist-50\",\"position\":{\"x\":-533.4629603891591,\"y\":232.5517720639333}},{\"id\":\"song-71\",\"position\":{\"x\":300,\"y\":340}},{\"id\":\"artist-5\",\"position\":{\"x\":-469.44892286309937,\"y\":23.434190410006963}},{\"id\":\"artist-22\",\"position\":{\"x\":-677.4496542909897,\"y\":446.9422155077275}}]',
        0,
        NULL,
        NULL
    ),
    (
        7,
        '21321312',
        'uploads/album_covers/album_cover_1753082840165_59c2fae7-d4ca-47cc-8606-69056c29bbdd.jpg',
        '专辑',
        '2025-08-02 00:00:00',
        '23123',
        '2312312321',
        'pending',
        'DRAFT: 尚未提交审核',
        '2025-07-21 07:27:20',
        '2025-07-21 07:27:20',
        34,
        NULL,
        'KOSHM',
        '[50]',
        0,
        NULL,
        NULL,
        NULL,
        0,
        NULL,
        0,
        NULL,
        NULL
    ),
    (
        8,
        '213123213',
        'uploads/album_covers/album_cover_1753452315203_a36a7b94-bad5-4b7e-a97f-692930757210.jpg',
        '专辑',
        '2025-08-01 00:00:00',
        '1312312',
        '21312',
        'approved',
        '审核通过',
        '2025-07-21 07:28:05',
        '2025-07-25 14:05:15',
        34,
        'uploads/authorizations/authorization_213123213_1753263459274.pdf',
        'KOSHM/KOSHM测试关联申请',
        '[50,60]',
        0,
        NULL,
        NULL,
        NULL,
        0,
        '[{\"id\":\"album-8\",\"position\":{\"x\":-283.00806303210146,\"y\":-120.15970065021519}},{\"id\":\"song-26\",\"position\":{\"x\":300,\"y\":100}},{\"id\":\"artist-12\",\"position\":{\"x\":-300,\"y\":100}}]',
        0,
        NULL,
        NULL
    ),
    (
        9,
        '21312312',
        'uploads/album_covers/album_cover_1753082944524_bfbccfcb-2910-4a98-abd4-fe9d8c29c0d3.jpg',
        '专辑',
        '2025-08-01 00:00:00',
        '213123',
        '3213213',
        'approved',
        '',
        '2025-07-21 07:29:04',
        '2025-07-21 07:29:04',
        34,
        NULL,
        'KOSHM',
        '[50]',
        0,
        NULL,
        NULL,
        NULL,
        0,
        NULL
    ),
    (
        10,
        '大大的奶子',
        'uploads/album_covers/album_cover_1753283571102_8549c678-a04f-44eb-b51b-bc525b61c33b.jpg',
        '专辑',
        '2025-09-02 00:00:00',
        '大大的奶子',
        '在沉默中酝酿的呐喊  \n\n刺破寂静的锋芒  \n\n如荆棘缠绕的月光  \n\n凝结成血色的糖  \n\n我们是被遗忘的星火  \n\n在裂缝里寻找方向  \n\n不为迎合而存在  \n\n只愿冲破所有束缚  \n\n\n\n- \n\nReleased by   \n制作统筹 :   \n母带工程师 : YueHeng  \n混音工程师 : KOSHM  \n视觉设计 : 操逼  \n总监制 : 音乐事业部门  \n音乐发行 : Acmetone极音记  \n出品 : ',
        'approved',
        '已提交审核',
        '2025-07-23 14:49:18',
        '2025-07-23 15:52:27',
        34,
        'uploads/authorizations/authorization_______1753284118852.pdf',
        'YueHeng/KOSHM/操逼/测试全新歌手',
        '[64,63,69,67]',
        0,
        NULL,
        NULL,
        NULL,
        0,
        NULL
    );

--
-- 转储表的索引
--

--
-- 表的索引 `albums`
--
ALTER TABLE `albums`
ADD PRIMARY KEY (`id`),
ADD KEY `submittedById` (`submittedById`),
ADD KEY `idx_album_is_released` (`isReleased`),
ADD KEY `idx_album_released_at` (`releasedAt`),
ADD KEY `fk_albums_label` (`labelId`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `albums`
--
ALTER TABLE `albums`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 11;

--
-- 限制导出的表
--

--
-- 限制表 `albums`
--
ALTER TABLE `albums`
ADD CONSTRAINT `albums_ibfk_1` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_10` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_11` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_12` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_13` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_14` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_15` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_16` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_17` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_18` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_19` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_2` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_20` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_21` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_22` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_23` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_24` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_25` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_26` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_27` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_28` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_29` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_3` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_30` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_31` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_4` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_5` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_6` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_7` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_8` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `albums_ibfk_9` FOREIGN KEY (`submittedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT `fk_albums_label` FOREIGN KEY (`labelId`) REFERENCES `labels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;