const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs').promises;
const { Song, Artist, Album, TaskExecutionLog, sequelize } = require('../../models');
const { Op } = require('sequelize');
const ISRCSearcher = require('../../services/isrcService');

/**
 * 创建日志目录和文件
 */
const createLogFile = async (logDir, taskName) => {
  try {
    await fs.mkdir(logDir, { recursive: true });
    const timestamp = moment().tz('Asia/Shanghai').format('HH-mm-ss');
    const logFileName = `${taskName}_${timestamp}.log`;
    const logFilePath = path.join(logDir, logFileName);
    
    // 创建日志文件
    await fs.writeFile(logFilePath, '', 'utf8');
    return logFilePath;
  } catch (error) {
    console.error('创建日志文件失败:', error);
    throw error;
  }
};

/**
 * 写入日志
 */
const writeLog = async (logFile, message) => {
  try {
    const timestamp = moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `[${timestamp}] ${message}\n`;
    await fs.appendFile(logFile, logMessage, 'utf8');
    console.log(logMessage.trim());
  } catch (error) {
    console.error('写入日志失败:', error);
  }
};





/**
 * 自动获取歌曲ISRC的定时任务
 * 
 * 功能：
 * 1. 查询数据库中没有ISRC的歌曲
 * 2. 使用ISRC服务搜索对应的ISRC代码
 * 3. 如果找到强匹配结果，自动保存到数据库
 * 4. 记录详细的执行日志
 * 
 * @param {Object} taskInfo - 任务信息
 * @returns {Object} 执行结果
 */
const autoFetchISRC = async (taskInfo = null) => {
  let logFile = null;
  let executionLog = null;

  try {
    // 如果任务被暂停，则不执行（仅在有taskInfo时检查）
    if (taskInfo && taskInfo.status === 'paused') {
      console.log('ISRC自动获取任务已暂停，跳过执行');
      return {
        success: false,
        message: '任务已暂停'
      };
    }
    
    // 创建日志目录和文件
    const baseLogDir = (taskInfo && taskInfo.logDirectory) || 'logs/scheduler/autoFetchISRC';
    const logDir = path.join(process.cwd(), baseLogDir, moment().tz('Asia/Shanghai').format('YYYY-MM-DD'));
    logFile = await createLogFile(logDir, 'autoFetchISRC');
    
    // 创建执行日志记录
    executionLog = await TaskExecutionLog.create({
      taskId: 'autoFetchISRC',
      startTime: new Date(),
      status: 'running',
      logFile: logFile
    });
    
    await writeLog(logFile, '=== ISRC自动获取任务开始执行 ===');
    
    // 获取当前北京时间
    const nowBeijing = moment().tz('Asia/Shanghai');
    await writeLog(logFile, `执行时间: ${nowBeijing.format('YYYY-MM-DD HH:mm:ss')}`);
    
    // 初始化ISRC搜索器
    const isrcSearcher = new ISRCSearcher();
    await writeLog(logFile, 'ISRC搜索器初始化完成');
    
    // 获取当前时间
    const currentDate = new Date();
    await writeLog(logFile, `当前时间: ${currentDate.toISOString()}`);
    await writeLog(logFile, `当前日期（仅日期）: ${currentDate.toISOString().split('T')[0]}`);
    await writeLog(logFile, `只处理已通过且发行日期已到达的专辑`);

    // 调试：统计所有专辑
    await writeLog(logFile, '=== 调试信息：专辑统计 ===');
    const totalAlbums = await Album.count();
    const approvedAlbums = await Album.count({ where: { status: 'approved' } });
    const releasedApprovedAlbums = await Album.count({
      where: {
        status: 'approved',
        releaseDate: { [Op.lte]: currentDate }
      }
    });

    await writeLog(logFile, `总专辑数: ${totalAlbums}`);
    await writeLog(logFile, `已通过专辑数: ${approvedAlbums}`);
    await writeLog(logFile, `已通过且已发行专辑数: ${releasedApprovedAlbums}`);

    // 调试：查看符合条件的专辑
    await writeLog(logFile, '=== 调试信息：符合条件的专辑 ===');
    const eligibleAlbums = await Album.findAll({
      where: {
        status: 'approved',
        releaseDate: { [Op.lte]: currentDate }
      },
      attributes: ['id', 'title', 'status', 'releaseDate'],
      order: [['releaseDate', 'DESC']],
      limit: 100
    });

    await writeLog(logFile, `符合条件的专辑数量: ${eligibleAlbums.length}`);
    for (const album of eligibleAlbums) {
      await writeLog(logFile, `专辑 ${album.id}: "${album.title}" | 发行日期: ${album.releaseDate.toISOString().split('T')[0]}`);
    }

    // 查询没有ISRC的歌曲（只包含已通过且在指定日期后的专辑）
    const songsWithoutISRC = await Song.findAll({
      where: {
        isrc: null // 查询ISRC为空的歌曲
      },
      attributes: ['id', 'title', 'artists', 'albumId', 'duration', 'createdAt', 'updatedAt'], // 包含duration字段
      include: [{
        model: Album,
        attributes: ['title', 'displayInfo', 'releaseDate', 'status'], // 获取专辑标题、发行外显、发行日期、状态
        required: true,
        where: {
          status: 'approved', // 只处理已通过的专辑
          releaseDate: {
            [Op.lte]: currentDate // 只处理发行日期已到达的专辑
          }
        }
      }],
      order: [['createdAt', 'DESC']], // 按创建时间倒序，优先处理新歌曲
      limit: 200 // 每次最多处理50首歌曲，避免任务执行时间过长
    });
    
    await writeLog(logFile, `找到 ${songsWithoutISRC.length} 首没有ISRC的歌曲（来自已通过且已发行的专辑）`);

    // 调试：显示找到的歌曲详情
    if (songsWithoutISRC.length > 0) {
      await writeLog(logFile, '=== 调试信息：找到的歌曲详情 ===');
      for (const song of songsWithoutISRC) {
        await writeLog(logFile, `歌曲 ${song.id}: "${song.title}" | 专辑: "${song.Album.title}" | 专辑状态: ${song.Album.status} | 发行日期: ${song.Album.releaseDate.toISOString()}`);
      }
    }

    // 调试：查看所有没有ISRC的歌曲（不限制专辑条件）
    await writeLog(logFile, '=== 调试信息：所有没有ISRC的歌曲 ===');
    const allSongsWithoutISRC = await Song.findAll({
      where: { isrc: null },
      attributes: ['id', 'title', 'albumId'],
      include: [{
        model: Album,
        attributes: ['title', 'status', 'releaseDate'],
        required: true
      }],
      limit: 200
    });

    for (const song of allSongsWithoutISRC) {
      const releaseDate = new Date(song.Album.releaseDate);
      const isEligible = song.Album.status === 'approved' && releaseDate <= currentDate;
      await writeLog(logFile, `歌曲 ${song.id}: "${song.title}" | 专辑: "${song.Album.title}" | 状态: ${song.Album.status} | 发行日期: ${releaseDate.toISOString()} | 符合条件: ${isEligible}`);
    }



    // 统计变量
    let processedCount = 0;
    let foundISRCCount = 0;
    let foundUPCCount = 0;
    let errorCount = 0;
    const results = [];

    // ===== 第一阶段：获取ISRC =====
    if (songsWithoutISRC.length > 0) {
      await writeLog(logFile, '=== 第一阶段：获取ISRC ===');
    
    // 逐个处理歌曲
    for (const song of songsWithoutISRC) {
      try {
        processedCount++;

        // 从artists JSON字段获取艺术家ID列表
        let artistIds = [];
        try {
          if (song.artists) {
            // 解析JSON格式的艺术家ID列表
            if (typeof song.artists === 'string') {
              artistIds = JSON.parse(song.artists);
            } else if (Array.isArray(song.artists)) {
              artistIds = song.artists;
            }
          }
        } catch (parseError) {
          await writeLog(logFile, `  跳过: 解析艺术家ID失败 - ${parseError.message}`);
          continue;
        }

        if (!artistIds || artistIds.length === 0) {
          await writeLog(logFile, `[${processedCount}/${songsWithoutISRC.length}] 跳过歌曲: "${song.title}" - 没有关联艺人`);
          continue;
        }

        // 根据艺术家ID查询艺术家名称
        await writeLog(logFile, `  查询艺术家ID: [${artistIds.join(', ')}]`);

        const artists = await Artist.findAll({
          where: {
            id: artistIds
          },
          attributes: ['id', 'name'],
          order: [
            // 按照原始ID顺序排序
            sequelize.literal(`FIELD(id, ${artistIds.join(',')})`)
          ]
        });

        await writeLog(logFile, `  找到 ${artists.length} 个艺术家`);

        // 获取艺人名称，用空格分隔
        const artistNames = artists.map(artist => artist.name).join(' ');

        // 获取专辑信息
        const label = song.Album ? song.Album.displayInfo : null;
        const albumTitle = song.Album ? song.Album.title : null;
        const albumReleaseDate = song.Album ? song.Album.releaseDate : null;

        await writeLog(logFile, `[${processedCount}/${songsWithoutISRC.length}] 处理歌曲: "${song.title}" - ${artistNames}`);
        if (label) {
          await writeLog(logFile, `  厂牌: ${label}`);
        }
        if (albumTitle) {
          await writeLog(logFile, `  专辑: ${albumTitle}`);
        }
        if (albumReleaseDate) {
          await writeLog(logFile, `  发行日期: ${albumReleaseDate}`);
        }

        if (!artistNames || artistNames.trim() === '') {
          await writeLog(logFile, `  跳过: 未找到有效的艺人名称`);
          continue;
        }

        // 处理发行日期格式
        let formattedReleaseDate = null;
        if (albumReleaseDate) {
          try {
            const dateObj = new Date(albumReleaseDate);
            if (!isNaN(dateObj.getTime())) {
              formattedReleaseDate = dateObj.toISOString().split('T')[0]; // 转换为YYYY-MM-DD格式
            }
          } catch (error) {
            await writeLog(logFile, `  警告: 日期格式转换失败 - ${error.message}`);
          }
        }

        await writeLog(logFile, `  搜索参数: 歌曲="${song.title}", 专辑="${albumTitle}", 厂牌="${label}", 日期="${formattedReleaseDate}"`);

        // 检查TOKEN状态
        const tokenStatus = isrcSearcher.getTokenStatus();
        await writeLog(logFile, `  TOKEN状态: 有效=${tokenStatus.hasToken}, 过期=${tokenStatus.isExpired}, 剩余时间=${tokenStatus.remainingTime}ms`);

        // 多层搜索策略 - 逐渐减少搜索参数来增加API返回数量，但都用完整信息进行匹配
        let searchResult = null;

        // 策略1: 完整信息搜索（歌曲+专辑+厂牌+日期）- 最严格
        await writeLog(logFile, `  策略1: 完整信息搜索（歌曲+专辑+厂牌+日期）...`);
        searchResult = await isrcSearcher.searchWithFullInfo(song.title, albumTitle, label, formattedReleaseDate);
        await writeLog(logFile, `  策略1结果: success=${searchResult.success}, results长度=${searchResult.results ? searchResult.results.length : 0}`);

        // 策略2: 如果策略1没找到，去掉厂牌和日期限制，增加返回数量
        if (!searchResult.success || !searchResult.results || searchResult.results.length === 0) {
          await writeLog(logFile, `  策略2: 去掉厂牌和日期限制（歌曲+专辑）...`);
          const strategy2Result = await isrcSearcher.searchWithFullInfo(song.title, albumTitle, '', '');
          await writeLog(logFile, `  策略2结果: success=${strategy2Result.success}, results长度=${strategy2Result.results ? strategy2Result.results.length : 0}`);

          if (strategy2Result.success && strategy2Result.results && strategy2Result.results.length > 0) {
            searchResult = strategy2Result;
            await writeLog(logFile, `  ✓ 策略2找到结果，使用策略2的结果`);
          }
        }

        // 策略3: 使用艺人+歌曲名+专辑名搜索（无论策略2是否找到都执行）
        if (artistNames && artistNames.length > 0) {
          await writeLog(logFile, `  策略3: 艺人+歌曲名+专辑名搜索...`);
          const artistName = artistNames[0]; // 使用第一个艺人
          const strategy3Result = await isrcSearcher.searchWithArtistSongAlbum(artistName, song.title, albumTitle, 50);
          await writeLog(logFile, `  策略3结果: success=${strategy3Result.success}, results长度=${strategy3Result.results ? strategy3Result.results.length : 0}`);

          if (strategy3Result.success && strategy3Result.results && strategy3Result.results.length > 0) {
            // 将strategy3的结果格式转换为与searchWithFullInfo一致
            const strategy3Formatted = {
              success: true,
              results: strategy3Result.results.map(item => ({
                isrc: item.isrc,
                recordingTitle: item.title,
                releaseName: item.album,
                releaseLabel: item.label,
                recordingArtistName: item.artist,
                releaseDate: item.releaseDate,
                icpn: item.upc
              }))
            };

            // 策略3优先级最高，直接替换之前的结果
            searchResult = strategy3Formatted;
            await writeLog(logFile, `  ✓ 策略3找到结果，优先使用策略3的结果`);
          }
        } else {
          await writeLog(logFile, `  策略3跳过: 没有艺人信息`);
        }

        // 策略4: 如果策略3还没找到，只用歌曲名搜索，返回最多结果
        if (!searchResult.success || !searchResult.results || searchResult.results.length === 0) {
          await writeLog(logFile, `  策略4: 只用歌曲名搜索，返回最多结果...`);
          const strategy4Result = await isrcSearcher.searchWithFullInfo(song.title, '', '', '');
          await writeLog(logFile, `  策略4结果: success=${strategy4Result.success}, results长度=${strategy4Result.results ? strategy4Result.results.length : 0}`);

          if (strategy4Result.success && strategy4Result.results && strategy4Result.results.length > 0) {
            searchResult = strategy4Result;
            await writeLog(logFile, `  ✓ 策略4找到结果，使用策略4的结果`);
          }
        }

        // 显示最终搜索结果
        if (searchResult && searchResult.success && searchResult.results && searchResult.results.length > 0) {
          await writeLog(logFile, `  ✓ 最终找到 ${searchResult.results.length} 个匹配结果:`);
          for (let i = 0; i < Math.min(3, searchResult.results.length); i++) {
            const result = searchResult.results[i];
            await writeLog(logFile, `    结果${i+1}: ISRC=${result.isrc}, 标题="${result.recordingTitle}", 专辑="${result.releaseName}", 厂牌="${result.releaseLabel}"`);
          }
        } else {
          await writeLog(logFile, `  ❌ 所有搜索策略都未找到匹配结果`);
        }

        if (!searchResult || !searchResult.success) {
          await writeLog(logFile, `  搜索失败: ${searchResult ? searchResult.error : '未知错误'}`);
          errorCount++;
          continue;
        }

        if (!searchResult.results || searchResult.results.length === 0) {
          await writeLog(logFile, `  未找到匹配的ISRC`);
          continue;
        }

        let finalRecord = null;

        // 如果有多个匹配结果，进行艺人筛选
        if (searchResult.results.length > 1) {
          await writeLog(logFile, `  找到 ${searchResult.results.length} 个候选，开始艺人筛选:`);

          for (let i = 0; i < searchResult.results.length; i++) {
            const record = searchResult.results[i];
            const recordArtist = (record.recordingArtistName || '').toLowerCase();

            await writeLog(logFile, `    [${i + 1}] "${record.recordingTitle}" - ${record.recordingArtistName}`);

            // 检查我们的艺人是否包含在记录的艺人中
            const ourArtists = artistNames.toLowerCase().split(' ').filter(name => name.trim());
            let matchedArtists = 0;

            for (const artist of ourArtists) {
              if (recordArtist.includes(artist)) {
                matchedArtists++;
              }
            }

            const matchRatio = matchedArtists / ourArtists.length;
            await writeLog(logFile, `      艺人匹配: ${matchedArtists}/${ourArtists.length} (${(matchRatio * 100).toFixed(1)}%)`);

            // 如果艺人匹配度超过50%，选择这个记录
            if (matchRatio >= 0.5) {
              finalRecord = record;
              await writeLog(logFile, `      ✓ 选择此记录 (艺人匹配度: ${(matchRatio * 100).toFixed(1)}%)`);
              break;
            }
          }

          if (!finalRecord) {
            await writeLog(logFile, `  艺人筛选后无匹配结果`);
            continue;
          }
        } else {
          // 只有一个结果，直接使用
          finalRecord = searchResult.results[0];
        }

        await writeLog(logFile, `  ✓ 找到精确匹配: "${finalRecord.recordingTitle}"`);
        await writeLog(logFile, `    ISRC: ${finalRecord.isrc}`);
        await writeLog(logFile, `    专辑: ${finalRecord.releaseName || '未知'}`);
        await writeLog(logFile, `    厂牌: ${finalRecord.releaseLabel || '未知'}`);
        await writeLog(logFile, `    发行日期: ${finalRecord.releaseDate || '未知'}`);

        // 保存ISRC到数据库
        await song.update({ isrc: finalRecord.isrc });
        foundISRCCount++;

        results.push({
          songId: song.id,
          songTitle: song.title,
          artistName: artistNames,
          isrc: finalRecord.isrc,
          matchScore: 100,
          status: 'success'
        });

        // 添加延迟，避免API请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        await writeLog(logFile, `  错误: ${error.message}`);
        
        // 获取艺人名称用于错误记录
        let errorArtistNames = '未知艺人';
        try {
          if (song.artists) {
            const errorArtistIds = typeof song.artists === 'string' ? JSON.parse(song.artists) : song.artists;
            if (Array.isArray(errorArtistIds) && errorArtistIds.length > 0) {
              const errorArtists = await Artist.findAll({
                where: { id: errorArtistIds },
                attributes: ['name']
              });
              errorArtistNames = errorArtists.map(a => a.name).join(' ');
            }
          }
        } catch (e) {
          // 忽略获取艺人名称的错误
        }

        results.push({
          songId: song.id,
          songTitle: song.title,
          artistName: errorArtistNames,
          isrc: null,
          status: 'error',
          error: error.message
        });
      }
    }
    } else {
      await writeLog(logFile, '没有需要获取ISRC的歌曲，跳过第一阶段');
    }

    // ===== 第二阶段：获取UPC =====
    await writeLog(logFile, '=== 第二阶段：获取UPC ===');

    // 查询有ISRC但没有UPC的歌曲（只包含已通过且在指定日期后的专辑）
    const songsWithoutUPC = await Song.findAll({
      where: {
        isrc: { [Op.ne]: null }, // 有ISRC
        upc: null // 没有UPC
      },
      attributes: ['id', 'title', 'isrc', 'upc', 'albumId'],
      include: [{
        model: Album,
        attributes: ['title', 'status', 'releaseDate'],
        required: true,
        where: {
          status: 'approved', // 只处理已通过的专辑
          releaseDate: {
            [Op.lte]: currentDate // 只处理发行日期已到达的专辑
          }
        }
      }],
      limit: 200 // 限制数量避免任务时间过长
    });

    await writeLog(logFile, `找到 ${songsWithoutUPC.length} 首需要获取UPC的歌曲（来自已通过且已发行的专辑）`);

    if (songsWithoutUPC.length > 0) {
      for (let i = 0; i < songsWithoutUPC.length; i++) {
        const song = songsWithoutUPC[i];

        try {
          await writeLog(logFile, `[${i + 1}/${songsWithoutUPC.length}] 查询UPC: "${song.title}" (ISRC: ${song.isrc})`);

          const upcResult = await isrcSearcher.searchUpcByIsrc(song.isrc);

          if (upcResult.success && upcResult.data && upcResult.data.upc) {
            await song.update({ upc: upcResult.data.upc });
            foundUPCCount++;
            await writeLog(logFile, `  ✓ 找到UPC: ${upcResult.data.upc}`);

            // 更新对应的results记录
            const existingResult = results.find(r => r.songId === song.id);
            if (existingResult) {
              existingResult.upc = upcResult.data.upc;
            }
          } else {
            await writeLog(logFile, `  未找到UPC: ${upcResult.error || upcResult.message || '无匹配记录'}`);
          }

          // 添加延迟避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
          await writeLog(logFile, `  UPC查询失败: ${error.message}`);
          errorCount++;
        }
      }
    } else {
      await writeLog(logFile, '没有需要获取UPC的歌曲，跳过第二阶段');
    }

    // 任务完成统计
    await writeLog(logFile, '=== 任务执行完成 ===');
    await writeLog(logFile, `处理歌曲总数: ${processedCount}`);
    await writeLog(logFile, `成功获取ISRC: ${foundISRCCount}`);
    await writeLog(logFile, `成功获取UPC: ${foundUPCCount}`);
    await writeLog(logFile, `处理错误: ${errorCount}`);
    await writeLog(logFile, `ISRC成功率: ${processedCount > 0 ? ((foundISRCCount / processedCount) * 100).toFixed(2) : 0}%`);
    await writeLog(logFile, `UPC成功率: ${foundISRCCount > 0 ? ((foundUPCCount / foundISRCCount) * 100).toFixed(2) : 0}%`);
    
    // 更新执行日志
    const taskResult = {
      processedSongs: processedCount,
      foundISRC: foundISRCCount,
      foundUPC: foundUPCCount,
      errors: errorCount,
      isrcSuccessRate: processedCount > 0 ? ((foundISRCCount / processedCount) * 100).toFixed(2) : 0,
      upcSuccessRate: foundISRCCount > 0 ? ((foundUPCCount / foundISRCCount) * 100).toFixed(2) : 0,
      results: results
    };
    
    await executionLog.update({
      endTime: new Date(),
      status: 'completed',
      result: JSON.stringify(taskResult)
    });
    
    return {
      success: true,
      message: `任务执行完成，处理 ${processedCount} 首歌曲，获取到 ${foundISRCCount} 个ISRC，${foundUPCCount} 个UPC`,
      ...taskResult
    };
    
  } catch (error) {
    console.error('ISRC自动获取任务执行失败:', error);
    
    if (logFile) {
      await writeLog(logFile, `=== 任务执行失败 ===`);
      await writeLog(logFile, `错误信息: ${error.message}`);
      await writeLog(logFile, `错误堆栈: ${error.stack}`);
    }
    
    // 更新执行日志
    if (executionLog) {
      await executionLog.update({
        endTime: new Date(),
        status: 'failed',
        error: error.message
      });
    }
    
    return {
      success: false,
      message: `任务执行失败: ${error.message}`,
      error: error.message
    };
  }
};

module.exports = autoFetchISRC;
