-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2025-08-06 22:21:28
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
-- 表的结构 `songs`
--

CREATE TABLE `songs` (
    `id` int(11) NOT NULL,
    `title` varchar(255) NOT NULL,
    `wavFile` varchar(255) DEFAULT NULL,
    `genre` varchar(255) NOT NULL,
    `language` varchar(255) NOT NULL,
    `duration` int(11) DEFAULT NULL,
    `trackNumber` int(11) NOT NULL DEFAULT '1',
    `albumId` int(11) NOT NULL,
    `createdAt` datetime NOT NULL,
    `updatedAt` datetime NOT NULL,
    `lyricsFile` varchar(255) DEFAULT NULL COMMENT '歌词文件路径',
    `translationLyricsFile` varchar(255) DEFAULT NULL COMMENT '翻译歌词文件路径',
    `artists` json DEFAULT NULL COMMENT '歌曲关联的艺术家ID列表，有序，JSON格式',
    `authorizationFile` varchar(255) DEFAULT NULL COMMENT '歌曲授权文件路径',
    `isrc` varchar(12) DEFAULT NULL COMMENT 'ISRC国际标准录音制品代码，格式：CC-XXX-YY-NNNNN',
    `upc` varchar(20) DEFAULT NULL COMMENT 'UPC通用产品代码，用于标识专辑/发行',
    `upc` varchar(20) DEFAULT NULL COMMENT 'UPC通用产品代码，用于标识专辑/发行版本'
) ENGINE = MyISAM DEFAULT CHARSET = utf8;

--
-- 转存表中的数据 `songs`
--

INSERT INTO
    `songs` (
        `id`,
        `title`,
        `wavFile`,
        `genre`,
        `language`,
        `duration`,
        `trackNumber`,
        `albumId`,
        `createdAt`,
        `updatedAt`,
        `lyricsFile`,
        `translationLyricsFile`,
        `artists`,
        `authorizationFile`,
        `isrc`
    )
VALUES (
        15,
        '21321',
        'uploads/audio/CAONIMA-21321-23213213.wav',
        '电子 Electronic',
        '321312312',
        216,
        1,
        2,
        '2025-05-28 15:27:39',
        '2025-05-28 15:27:39',
        NULL,
        NULL,
        '[1]',
        NULL,
        NULL
    ),
    (
        44,
        'NMSL',
        'uploads/audio/NMSL-NMSL-12321123-1749964371386-ff2767fe.wav',
        '电子 Electronic',
        '英文',
        216,
        1,
        1,
        '2025-06-15 05:12:52',
        '2025-06-15 05:12:52',
        'uploads/lyrics/lyrics_1749964371359_9607ac0d.lrc',
        'uploads/lyrics/translation_lyrics_1749964371371_91535ca1.lrc',
        '[24]',
        NULL,
        NULL
    ),
    (
        45,
        '1223',
        'uploads/audio/NMSL-1223-123213-1749965709908-b76d7d2b.wav',
        '流行 Pop',
        '英文',
        216,
        2,
        1,
        '2025-06-15 05:35:10',
        '2025-06-15 05:35:10',
        'uploads/lyrics/lyrics_1749965709889_05abdb46.lrc',
        'uploads/lyrics/translation_lyrics_1749965709898_c79b1a73.lrc',
        '[2]',
        NULL
    ),
    (
        26,
        'CAONIM',
        'uploads/audio/213123213-CAONIM-AFS&KOSHM测试修改-1753263308963-211c6a0f.wav',
        '民谣 Folk',
        '英文',
        166,
        1,
        8,
        '2025-06-01 07:09:39',
        '2025-07-23 09:35:09',
        NULL,
        NULL,
        '[12, 25]',
        NULL
    ),
    (
        48,
        '213213',
        'uploads/audio/时纪之风-213213-测试啊啊啊-1750698762688-f34e15e9.wav',
        '电子 Electronic',
        '纯音乐',
        216,
        1,
        3,
        '2025-06-23 17:12:43',
        '2025-06-23 17:12:43',
        NULL,
        NULL,
        '[2]',
        NULL
    ),
    (
        72,
        '臭傻逼',
        'a63b95100baa0ec63af02fefb895e5d2:bb696e7f16f92d96f009c78fd099d2e1e64c477380f810eef9fa32a8f623316c3c06ff385306f3371dfd5e39f84d5d3a25c680fcfb5cb2e8706e724da19e3e08e5775b151b4ae3d0ae54f0d17525a03f9cf04000d3598166045c055c6769e2c7',
        '电子 Electronic',
        '英文',
        145,
        1,
        10,
        '2025-07-23 15:14:20',
        '2025-07-23 15:15:33',
        'uploads/lyrics/lyrics_1753283660011_9092c3be.lrc',
        'uploads/lyrics/translation_lyrics_1753283660036_139c2eb3.lrc',
        '[69, 63, 64]',
        NULL
    ),
    (
        73,
        '积极特别杨',
        'e950f2a56dca83222c6cddf173e5ac00:7fead907c1200064fc1d871c600de33577bdc2bb51916b98b5805463429b3ce9c7e11ff1008cb79161b078f1fdac71bb8c30440efe52f02797fa3c931233c0974e4c5be83306552e9b980ebb34f984d39b2aeb30338fc52020d904fc5c3a4d35',
        '电子 Electronic',
        '中文',
        192,
        2,
        10,
        '2025-07-23 15:14:43',
        '2025-07-23 15:15:21',
        'uploads/lyrics/lyrics_1753283683204_444d2f07.lrc',
        NULL,
        '[64, 63]',
        NULL
    ),
    (
        76,
        '2222',
        'b22f5379ddf02539d9d5fc5fcea51838:dd8272673ac486d77efd9be66cd9cbbd4c6ee510e267a7646191221a1bb47ca39edbcdd5f0114daaa8dad95216ca5c59f01a0b59fb71a85344f6af44288b550cf2e9964feb2a2bde7032c48c57051896',
        '电子 Electronic',
        '英文',
        187,
        2,
        6,
        '2025-07-31 15:30:11',
        '2025-07-31 15:30:11',
        'uploads/lyrics/lyrics_1753975810380_411449de.lrc',
        NULL,
        '\"[4]\"',
        NULL
    ),
    (
        74,
        '我的bb会出水',
        '27b83e3c6c3d5141107c0fd82d42b147:5a9abaff362349dd82a1b22f3c2d0aa91ab7e5d54cf82380c9c334aa8106cb7997c4fa2af7bec324cdbdf6a0ba93ce40ac013707f6817d33db257b81aafcf484bd0ad1285d3ef2ab0469df8987a4bc814216c78f93b637ce290b65751eaf6497',
        '电子 Electronic',
        '纯音乐',
        187,
        3,
        10,
        '2025-07-23 15:15:12',
        '2025-07-23 15:15:12',
        NULL,
        NULL,
        '\"[63]\"',
        NULL
    ),
    (
        75,
        'NMSL',
        '6200fc232875e9ede3bf9cc25cccaba8:d30d2f6ab288bed87c52e6a3e142e0e7ccad234a19cd658b132efba634238ce26ce49feebcdfbada3b1216ec18866678cdf2245947c38e49b3cefb6eb33dc282ba0ed2a6b8cb2eeab551bd6595b0c354',
        '电子 Electronic',
        '英文',
        187,
        1,
        6,
        '2025-07-31 13:30:41',
        '2025-07-31 15:29:37',
        'uploads/lyrics/lyrics_1753968640353_84722c12.lrc',
        NULL,
        '\"[21]\"',
        NULL
    );

--
-- 转储表的索引
--

--
-- 表的索引 `songs`
--
ALTER TABLE `songs`
ADD PRIMARY KEY (`id`),
ADD KEY `albumId` (`albumId`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `songs`
--
ALTER TABLE `songs`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 77;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;