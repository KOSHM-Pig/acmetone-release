INSERT INTO
    `schedulertasks` (
        `id`,
        `name`,
        `description`,
        `expression`,
        `timezone`,
        `status`,
        `runCount`,
        `logDirectory`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'autoFetchISRC',
        'ISRC自动获取',
        '自动查询没有ISRC的歌曲，通过ISRC API搜索并保存强匹配的ISRC代码到数据库',
        '0 2 * * *',
        'Asia/Shanghai',
        'active',
        0,
        'logs/scheduler/autoFetchISRC',
        NOW(),
        NOW()
    );