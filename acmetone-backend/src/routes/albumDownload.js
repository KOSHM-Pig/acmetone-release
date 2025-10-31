const express = require('express');
const router = express.Router({ mergeParams: true });
const { Album, Song, Artist } = require('../models');
const { adminAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const Excel = require('exceljs');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const { verifyAudioFile } = require('../utils/md5Utils');

/**
 * 获取按照JSON字段排序的艺术家列表
 * @param {Object} song - 歌曲对象
 * @param {string} context - 上下文信息，用于日志
 * @returns {Array} - 排序后的艺术家列表
 */
async function getOrderedArtists(song, context = '') {
  let orderedArtists = [...song.Artists];
  try {
    console.log(`${context}: 歌曲ID ${song.id} 的 artists 字段:`, song.artists);

    // 检查 song.artists 是否为有效的 JSON 字符串或已经是数组
    let artistIds = [];
    if (song.artists) {
      if (typeof song.artists === 'string') {
        // 尝试解析 JSON 字符串
        artistIds = JSON.parse(song.artists);
      } else if (Array.isArray(song.artists)) {
        // 已经是数组
        artistIds = song.artists;
      } else if (typeof song.artists === 'object') {
        // 可能是已解析的 JSON 对象
        artistIds = Array.isArray(song.artists) ? song.artists : [];
      }
    }

    // 确保 artistIds 是数组
    if (Array.isArray(artistIds) && artistIds.length > 0) {
      console.log(`${context}: 歌曲ID ${song.id} 的Artists数组包含 ${song.Artists.length} 个艺术家:`, song.Artists.map(a => `${a.id}(${a.name})`));

      // 直接从数据库查询所有需要的艺术家，包括平台链接字段
      const { sequelize } = require('../config/db');
      const [artistsFromDB] = await sequelize.query(`
        SELECT id, name, realName, isNewArtist, canonicalArtistId, description, alias, artistType, region, avatarUrl,
               netease, qq, kugou, kuwo, qishui, spotify, youtube, appleMusic, soundCloud
        FROM artists
        WHERE id IN (${artistIds.map(() => '?').join(',')})
      `, {
        replacements: artistIds
      });

      console.log(`${context}: 歌曲ID ${song.id} 从数据库查询到 ${artistsFromDB.length} 个艺术家:`, artistsFromDB.map(a => `${a.id}(${a.name})`));

      // 创建一个映射，用于快速查找艺术家
      const artistMap = {};

      // 处理关联歌手的主歌手信息
      artistsFromDB.forEach(artist => {
        // 如果艺人有canonicalArtistId，尝试在查询结果中查找对应的主歌手
        if (artist.canonicalArtistId) {
          const canonicalArtist = artistsFromDB.find(a => a.id === artist.canonicalArtistId);
          if (canonicalArtist) {
            // 使用主歌手信息替代关联歌手
            console.log(`${context}: 歌曲ID ${song.id} 的艺人 ${artist.id}(${artist.name}) 使用主歌手 ${canonicalArtist.id}(${canonicalArtist.name}) 的信息`);
            artistMap[artist.id] = canonicalArtist;
          } else {
            // 如果找不到主歌手，仍使用原始艺人
            console.log(`${context}: 歌曲ID ${song.id} 的艺人 ${artist.id}(${artist.name}) 有canonicalArtistId=${artist.canonicalArtistId}，但未找到主歌手，使用原始艺人信息`);
            artistMap[artist.id] = artist;
          }
        } else {
          // 没有关联主歌手，使用原始艺人
          artistMap[artist.id] = artist;
        }
      });

      console.log(`${context}: 歌曲ID ${song.id} 构建的artistMap:`, Object.keys(artistMap).map(id => `${id} -> ${artistMap[id].name}`));

      // 按照artists字段中的顺序重新排列Artists数组
      orderedArtists = artistIds.map(id => {
        const artist = artistMap[id];
        if (!artist) {
          console.log(`${context}: 歌曲ID ${song.id} 在artistMap中找不到ID为 ${id} 的艺术家`);
        }
        return artist;
      }).filter(Boolean);

      console.log(`${context}: 歌曲ID ${song.id} 排序后的艺术家:`, orderedArtists.map(a => a.name));
    } else {
      console.log(`${context}: 歌曲ID ${song.id} 的 artists 字段不是有效的数组或为空，使用默认顺序`);
    }
  } catch (error) {
    console.error(`${context}: 解析歌曲ID ${song.id} 的 artists 字段时出错:`, error);
    console.log(`原始 artists 字段值:`, song.artists);
    // 出错时使用原始顺序
  }

  return orderedArtists;
}

/**
 * 创建临时目录结构
 * @param {Object} album - 专辑对象
 * @returns {Object} - 包含各种目录路径的对象
 */
function createTempDirectories(album) {
  // 创建唯一的临时目录
  const tempDirId = uuidv4();
  const tempDir = path.join(__dirname, '../../temp', tempDirId);
  
  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // 创建专辑目录名称（发行日期 - 专辑名称）
  const releaseDate = album.releaseDate ? 
    new Date(album.releaseDate).toISOString().split('T')[0].replace(/-/g, '.') : 
    new Date().toISOString().split('T')[0].replace(/-/g, '.');
  
  const albumDirName = `${releaseDate} - ${album.title}`;
  const albumRootDir = path.join(tempDir, albumDirName);
  
  // 确定根目录
  let rootDir = albumRootDir;
  
  // 创建专辑目录
  const albumDir = albumRootDir;
  if (!fs.existsSync(albumDir)) {
    fs.mkdirSync(albumDir, { recursive: true });
  }
  
  // 创建授权文件目录
  const authDir = path.join(albumDir, '授权文件');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  // 定义新歌手信息目录路径，但不创建目录
  // 只有在检测到全新歌手时，才会创建此目录
  const newArtistDir = path.join(albumDir, '新建歌手信息');
  
  // 定义动态封面目录路径（但不创建）
  const dynamicCoverDir = path.join(albumDir, '动态封面');
  const neteaseDir = path.join(dynamicCoverDir, '网易云音乐');
  const qqmusicDir = path.join(dynamicCoverDir, 'QQ音乐');
  const applemusicDir = path.join(dynamicCoverDir, '苹果音乐');
  
  // 返回所有目录路径
  return {
    tempDir,
    rootDir,
    albumRootDir,
    albumDir,
    albumDirName,
    authDir,
    newArtistDir,
    dynamicCoverDir,
    neteaseDir,
    qqmusicDir,
    applemusicDir
  };
}

/**
 * 处理歌曲文件和相关信息
 * @param {Object} song - 歌曲对象
 * @param {Object} dirs - 目录路径对象
 * @param {Object} album - 专辑对象
 */
async function processSongFiles(song, dirs, album) {
  // 检查歌曲是否有音频文件
  if (!song.wavFile && !song.audioFile) {
    console.log(`歌曲 ${song.title} 没有音频文件，跳过处理`);
    return;
  }

  // 获取排序后的艺术家列表
  const orderedArtists = await getOrderedArtists(song, '处理歌曲文件');
  
  // 获取歌曲轨道号和艺术家名称
  const trackNumber = song.trackNumber ? String(song.trackNumber).padStart(2, '0') : '01';
  const artistNames = orderedArtists.map(artist => artist.name).join('&');
  
  // 创建歌曲目录
  const songDirName = `${trackNumber} - ${artistNames} - ${song.title}`;
  const songDir = path.join(dirs.albumDir, songDirName);
  fs.mkdirSync(songDir);
  
  // 复制歌曲文件到歌曲目录 - 优先使用wavFile，如果没有则使用audioFile
  let audioFilePath;
  let audioFileName;
  
  // 直接使用文件路径，不再处理加密格式
  if (song.wavFile) {
    // 使用WAV文件路径
    audioFilePath = path.join(__dirname, '../../', song.wavFile);
    audioFileName = `${song.title}.wav`;
  } else if (song.audioFile) {
    // 使用audioFile作为备选
    audioFilePath = path.join(__dirname, '../../', song.audioFile);
    audioFileName = `${song.title}.wav`; // 仍然保存为.wav扩展名以保持一致性
  } else {
    // 没有找到音频文件
    console.log(`歌曲 ${song.title} 没有找到音频文件路径...`);
    
    // 尝试查找以歌曲标题或ID为关键词的文件
    const audioDir = path.join(__dirname, '../../uploads/audio');
    if (fs.existsSync(audioDir)) {
      try {
        const audioFiles = fs.readdirSync(audioDir);
        // 查找可能匹配的文件
        const possibleMatches = audioFiles.filter(file => 
          file.toLowerCase().includes(song.title.toLowerCase()) || 
          file.includes(`-${song.id}-`) ||
          file.includes(`-${song.title}-`)
        );
        
        if (possibleMatches.length > 0) {
          // 使用找到的第一个匹配文件
          audioFilePath = path.join(audioDir, possibleMatches[0]);
          audioFileName = `${song.title}.wav`;
          console.log(`找到可能匹配的音频文件: ${possibleMatches[0]}`);
        } else {
          console.log(`在uploads/audio目录中未找到与歌曲 ${song.title} 匹配的文件`);
        }
      } catch (error) {
        console.error(`查找歌曲 ${song.title} 的音频文件时出错:`, error);
      }
    }
  }
  
  if (audioFilePath) {
    const audioDest = path.join(songDir, audioFileName);
    
    try {
      // 综合验证（MD5 + 时长）- 缺一不可
      console.log(`开始验证歌曲 "${song.title}" 的完整性（MD5 + 时长）...`);
      const verificationResult = await verifyAudioFile(
        audioFilePath, 
        song.md5, 
        song.duration, 
        2 // 允许2秒误差
      );
      
      if (!verificationResult.overallValid) {
        console.error(`❌ 歌曲 "${song.title}" 验证失败，跳过该文件`);
        console.error(`验证错误:`, verificationResult.errors);
        
        // 生成详细的错误日志文件
        const errorLogPath = path.join(songDir, `${song.title}_VERIFICATION_ERROR.txt`);
        const errorMessage = `音频文件验证失败报告\n` +
          `歌曲标题: ${song.title}\n` +
          `文件路径: ${audioFilePath}\n` +
          `验证时间: ${new Date().toLocaleString()}\n\n` +
          `验证结果:\n` +
          `- MD5验证: ${verificationResult.md5Valid ? '通过' : '失败'}\n` +
          `- 时长验证: ${verificationResult.durationValid ? '通过' : '失败'}\n` +
          `- 综合验证: ${verificationResult.overallValid ? '通过' : '失败'}\n\n` +
          `详细信息:\n` +
          `- 存储的MD5: ${song.md5 || '未设置'}\n` +
          `- 存储的时长: ${song.duration || '未设置'} 秒\n\n` +
          `错误列表:\n${verificationResult.errors.map(err => `- ${err}`).join('\n')}\n\n` +
          `建议: 文件验证失败可能由以下原因导致:\n` +
          `1. 文件损坏或被篡改（MD5不匹配）\n` +
          `2. 文件不完整或截断（时长不匹配）\n` +
          `3. 数据库中的MD5或时长信息错误\n` +
          `请检查原始文件并重新上传，或更新数据库中的验证信息`;
        
        fs.writeFileSync(errorLogPath, errorMessage, 'utf8');
        console.log(`已生成验证失败日志: ${errorLogPath}`);
        return; // 跳过该歌曲的处理
      } else {
        console.log(`✅ 歌曲 "${song.title}" 综合验证通过（MD5 + 时长）`);
      }
      
      // 验证通过后复制文件
      fs.copyFileSync(audioFilePath, audioDest);
      console.log(`复制音频文件: ${audioFileName}`);
    } catch (error) {
      console.error(`处理音频文件失败: ${audioFilePath}`, error);
      
      // 生成错误日志文件
      const errorLogPath = path.join(songDir, `${song.title}_PROCESS_ERROR.txt`);
      const errorMessage = `音频文件处理失败报告\n` +
        `歌曲标题: ${song.title}\n` +
        `源文件路径: ${audioFilePath}\n` +
        `目标文件路径: ${audioDest}\n` +
        `错误时间: ${new Date().toLocaleString()}\n` +
        `错误信息: ${error.message}\n` +
        `建议: 请检查源文件是否存在，目标目录是否有写权限，以及ffmpeg是否正确安装`;
      
      fs.writeFileSync(errorLogPath, errorMessage, 'utf8');
      console.log(`已生成处理失败日志: ${errorLogPath}`);
      return; // 跳过该歌曲的处理
    }
  } else {
    console.error(`歌曲 ${song.title} (ID: ${song.id}) 没有有效的音频文件路径`);
  }
  
  // 创建歌手信息文件
  createArtistInfoFile(song, orderedArtists, songDir);
  
  // 添加授权文件
  addAuthorizationFiles(song, orderedArtists, album, dirs.authDir, trackNumber);
  
  // 复制歌词文件 - 只有非纯音乐才处理歌词
  const isInstrumental = song.genre === '纯音乐';
  if (!isInstrumental) {
    copySongLyrics(song, songDir);
  } else {
    console.log(`歌曲 ${song.title} 是纯音乐(genre=${song.genre})，跳过创建歌词文件夹`);
  }
  
  // 处理全新歌手信息
  const hasNewArtists = processNewArtists(song, orderedArtists, dirs.newArtistDir);
  
  // 如果有全新歌手，确保新歌手信息目录存在
  if (hasNewArtists && !fs.existsSync(dirs.newArtistDir)) {
    fs.mkdirSync(dirs.newArtistDir, { recursive: true });
  }
}

/**
 * 创建歌手信息文件
 * @param {Object} song - 歌曲对象
 * @param {Array} orderedArtists - 排序后的艺术家列表
 * @param {string} songDir - 歌曲目录路径
 */
function createArtistInfoFile(song, orderedArtists, songDir) {
  // 创建歌手信息文件
  const artistInfoPath = path.join(songDir, '歌手信息.txt');
  let artistInfoContent = '';
  
  // 添加每个歌手的信息
  for (const artist of orderedArtists) {
    console.log(`[DEBUG] 处理歌手信息: ${artist.name} (ID: ${artist.id})`);
    console.log(`[DEBUG] 歌手数据:`, {
      name: artist.name,
      realName: artist.realName,
      isNewArtist: artist.isNewArtist,
      netease: artist.netease,
      qq: artist.qq,
      kugou: artist.kugou,
      kuwo: artist.kuwo,
      qishui: artist.qishui,
      spotify: artist.spotify,
      youtube: artist.youtube,
      appleMusic: artist.appleMusic,
      soundCloud: artist.soundCloud
    });

    const isNewArtist = artist.isNewArtist;
    const newArtistMark = isNewArtist ? '【全新歌手】' : '';

    artistInfoContent += `歌手名称: ${artist.name} ${newArtistMark}\n`;
    
    if (artist.realName) {
      artistInfoContent += `真实姓名: ${artist.realName}\n`;
    }
    
    if (artist.introduction) {
      artistInfoContent += `简介: ${artist.introduction}\n`;
    }
    
    // 添加歌手链接信息 - 首先检查新的链接字段
    const platformLinks = [];
    
    // 检查各平台链接字段
    const platforms = [
      { field: 'netease', name: '网易云音乐' },
      { field: 'qq', name: 'QQ音乐' },
      { field: 'kugou', name: '酷狗音乐' },
      { field: 'kuwo', name: '酷我音乐' },
      { field: 'qishui', name: '汽水音乐' },
      { field: 'spotify', name: 'Spotify' },
      { field: 'youtube', name: 'YouTube' },
      { field: 'appleMusic', name: 'Apple Music' },
      { field: 'soundCloud', name: 'SoundCloud' }
    ];
    
    // 收集有效的平台链接
    platforms.forEach(platform => {
      if (artist[platform.field] && artist[platform.field].trim()) {
        console.log(`[DEBUG] 找到平台链接: ${artist.name} - ${platform.name}: ${artist[platform.field]}`);
        platformLinks.push({ platform: platform.name, url: artist[platform.field] });
      }
    });

    console.log(`[DEBUG] 歌手 ${artist.name} 收集到 ${platformLinks.length} 个平台链接`);
    
    // 如果没有找到直接字段，尝试使用旧的links字段
    if (platformLinks.length === 0 && artist.links && typeof artist.links === 'string') {
      try {
        const links = JSON.parse(artist.links);
        if (links && Array.isArray(links) && links.length > 0) {
          links.forEach(link => {
            if (link.url && link.platform) {
              platformLinks.push({ platform: link.platform, url: link.url });
            }
          });
        }
      } catch (error) {
        console.error(`解析歌手 ${artist.name} 的链接信息失败:`, error);
      }
    }
    
    // 添加链接信息到内容中
    if (platformLinks.length > 0) {
      artistInfoContent += '链接:\n';
      platformLinks.forEach(link => {
        artistInfoContent += `- ${link.platform}: ${link.url}\n`;
      });
    }
    
    artistInfoContent += '\n';
  }
  
  // 写入歌手信息文件
  fs.writeFileSync(artistInfoPath, artistInfoContent);
  console.log(`已创建歌手信息文件: ${artistInfoPath}`);
}

/**
 * 添加授权文件
 * @param {Object} song - 歌曲对象
 * @param {Array} orderedArtists - 排序后的艺术家列表
 * @param {Object} album - 专辑对象
 * @param {string} authDir - 授权文件目录路径
 * @param {string} trackNumber - 歌曲轨道号
 */
async function addAuthorizationFiles(song, orderedArtists, album, authDir, trackNumber) {
  try {
    // 获取歌曲标题
    const songTitle = song.title;
    
    // 获取歌曲-艺术家授权文件信息
    const { sequelize } = require('../config/db');
    const [songArtistAuths] = await sequelize.query(`
      SELECT saa.*, a.name as artistName, a.realName
      FROM song_artist_authorizations saa
      JOIN artists a ON saa.artistId = a.id
      WHERE saa.songId = :songId
    `, {
      replacements: { songId: song.id }
    });
    
    console.log(`[DEBUG] 歌曲 ${song.title} (ID: ${song.id}) 的艺术家授权文件:`, 
      songArtistAuths.length ? songArtistAuths.map(auth => ({
        artistId: auth.artistId,
        artistName: auth.artistName,
        authFile: auth.authorizationFile
      })) : '无授权文件'
    );
    
    // 检查是否有任何歌手授权文件
    const hasArtistAuths = songArtistAuths.some(auth => auth.authorizationFile);
    
    // 如果没有任何歌手授权文件，则不创建授权文件夹
    if (!hasArtistAuths) {
      console.log(`[INFO] 歌曲 ${song.title} 没有任何歌手授权文件，跳过创建授权文件夹`);
      return;
    }
    
    // 创建歌曲授权文件夹（使用轨道号和歌曲名）
    const songAuthDirName = `${trackNumber} - ${songTitle}`;
    const songAuthDir = path.join(authDir, songAuthDirName);
    if (!fs.existsSync(songAuthDir)) {
      fs.mkdirSync(songAuthDir);
    }
    
    // 为每个艺术家处理授权文件
    for (const artist of orderedArtists) {
      // 查找该艺术家的授权文件
      const artistAuth = songArtistAuths.find(auth => auth.artistId === artist.id);
      
      // 如果找到艺术家授权文件
      if (artistAuth && artistAuth.authorizationFile) {
        // 获取艺术家显示名称（真实姓名或艺名）
        const artistDisplayName = artist.realName || artist.name;
        
        // 创建艺术家授权文件名称
        const authFileName = `${artist.name}（${artist.realName || artistDisplayName}）2极音记.pdf`;
        
        // 源文件路径
        const authFileSrc = path.join(__dirname, '../../', artistAuth.authorizationFile);
        
        // 目标文件路径
        const authFileDest = path.join(songAuthDir, authFileName);
        
        // 复制授权文件
        if (fs.existsSync(authFileSrc)) {
          try {
            fs.copyFileSync(authFileSrc, authFileDest);
            console.log(`已复制歌手授权文件: ${artistAuth.authorizationFile} -> ${authFileDest}`);
          } catch (error) {
            console.error(`复制歌手授权文件失败: ${authFileSrc}`, error);
          }
        } else {
          console.error(`歌手授权文件不存在: ${authFileSrc}`);
        }
      }
    }
  } catch (error) {
    console.error(`处理歌曲 ${song.title} 的授权文件时出错:`, error);
  }
}

/**
 * 复制歌词文件
 * @param {Object} song - 歌曲对象
 * @param {string} songDir - 歌曲目录路径
 */
function copySongLyrics(song, songDir) {
  // 如果是纯音乐，跳过创建歌词文件夹
  if (song.genre === '纯音乐') {
    return;
  }
  
  // 检查是否有任何歌词文件
  const hasLyrics = song.lyricsFile || song.lyricsCn || song.translationLyricsFile || song.lyricsEn || song.lyricsOther;
  
  // 如果没有任何歌词文件，不创建歌词文件夹
  if (!hasLyrics) {
    console.log(`歌曲 ${song.title} 没有歌词文件，跳过创建歌词文件夹`);
    return;
  }
  
  // 创建歌词文件夹
  const lyricsDir = path.join(songDir, '歌词');
  if (!fs.existsSync(lyricsDir)) {
    fs.mkdirSync(lyricsDir);
  }
  
  // 处理中文歌词文件 - 优先使用新字段，如果没有则使用旧字段
  const lyricsPath = song.lyricsFile || song.lyricsCn || '';
  if (lyricsPath) {
    const lyricsSrcPath = path.join(__dirname, '../../', lyricsPath);
    const lyricsDest = path.join(lyricsDir, `${song.title}_zh.lrc`);
    if (fs.existsSync(lyricsSrcPath)) {
      fs.copyFileSync(lyricsSrcPath, lyricsDest);
      console.log(`已复制中文歌词文件: ${lyricsPath} -> ${lyricsDest}`);
    } else {
      console.log(`中文歌词文件不存在: ${lyricsSrcPath}`);
    }
  } else if (song.lyricsCn) {
    // 兼容旧代码
    const lyricsCnPath = path.join(__dirname, '../../', song.lyricsCn);
    const lyricsCnDest = path.join(lyricsDir, `${song.title}_zh.lrc`);
    if (fs.existsSync(lyricsCnPath)) {
      fs.copyFileSync(lyricsCnPath, lyricsCnDest);
      console.log(`已复制中文歌词文件(旧字段): ${song.lyricsCn} -> ${lyricsCnDest}`);
    } else {
      console.log(`中文歌词文件不存在(旧字段): ${lyricsCnPath}`);
    }
  }
  
  // 处理英文/翻译歌词文件 - 优先使用新字段，如果没有则使用旧字段
  const translationLyricsPath = song.translationLyricsFile || song.lyricsEn || '';
  if (translationLyricsPath) {
    const transLyricsSrcPath = path.join(__dirname, '../../', translationLyricsPath);
    const transLyricsDest = path.join(lyricsDir, `${song.title}_en.lrc`);
    if (fs.existsSync(transLyricsSrcPath)) {
      fs.copyFileSync(transLyricsSrcPath, transLyricsDest);
      console.log(`已复制翻译歌词文件: ${translationLyricsPath} -> ${transLyricsDest}`);
    } else {
      console.log(`翻译歌词文件不存在: ${transLyricsSrcPath}`);
    }
  } else if (song.lyricsEn) {
    // 兼容旧代码
    const lyricsEnPath = path.join(__dirname, '../../', song.lyricsEn);
    const lyricsEnDest = path.join(lyricsDir, `${song.title}_en.lrc`);
    if (fs.existsSync(lyricsEnPath)) {
      fs.copyFileSync(lyricsEnPath, lyricsEnDest);
      console.log(`已复制翻译歌词文件(旧字段): ${song.lyricsEn} -> ${lyricsEnDest}`);
    } else {
      console.log(`翻译歌词文件不存在(旧字段): ${lyricsEnPath}`);
    }
  }
  
  // 处理其他语言歌词文件（如果有的话）
  if (song.lyricsOther) {
    const lyricsOtherPath = path.join(__dirname, '../../', song.lyricsOther);
    const lyricsOtherDest = path.join(lyricsDir, `${song.title}_other.lrc`);
    if (fs.existsSync(lyricsOtherPath)) {
      fs.copyFileSync(lyricsOtherPath, lyricsOtherDest);
      console.log(`已复制其他语言歌词文件: ${song.lyricsOther} -> ${lyricsOtherDest}`);
    } else {
      console.log(`其他语言歌词文件不存在: ${lyricsOtherPath}`);
    }
  }
}

/**
 * 处理全新歌手信息
 * @param {Object} song - 歌曲对象
 * @param {Array} orderedArtists - 排序后的艺术家列表
 * @param {string} newArtistDir - 新歌手目录路径
 * @returns {boolean} - 是否创建了新歌手信息
 */
function processNewArtists(song, orderedArtists, newArtistDir) {
  // 筛选出全新歌手
  const newArtists = orderedArtists.filter(artist =>
    artist.isNewArtist
  );
  
  if (newArtists.length === 0) {
    console.log(`歌曲 ${song.title} 不包含全新歌手，不创建新歌手信息`);
    return false;
  }
  
  console.log(`歌曲 ${song.title} 包含 ${newArtists.length} 个全新歌手`);
  
  // 处理每个全新歌手
  for (const artist of newArtists) {
    // 创建歌手目录
    const artistDirName = `${artist.name}-${artist.realName || artist.id}`;
    const artistDir = path.join(newArtistDir, artistDirName);
    
    // 如果目录已存在，跳过
    if (fs.existsSync(artistDir)) {
      console.log(`全新歌手 ${artist.name} 的目录已存在，跳过创建`);
      continue;
    }
    
    // 创建歌手目录
    fs.mkdirSync(artistDir, { recursive: true });
    
    // 创建艺人信息文件
    const artistInfoPath = path.join(artistDir, '艺人信息.txt');
    let artistInfoContent = `【全新歌手】\n`;
    artistInfoContent += `歌手名称: ${artist.name}\n`;
    
    if (artist.realName) {
      artistInfoContent += `真实姓名: ${artist.realName}\n`;
    }
    
if (artist.introduction || artist.description) {
  artistInfoContent += `简介: ${artist.introduction || artist.description || ''}\n`;
}

if (artist.artistType) {
  let artistTypeText = '';
  switch(artist.artistType) {
    case 'independent': artistTypeText = '独立音乐人'; break;
    case 'band': artistTypeText = '乐队'; break;
    case 'singer': artistTypeText = '歌手'; break;
    case 'producer': artistTypeText = '制作人'; break;
    case 'composer': artistTypeText = '作曲家'; break;
    default: artistTypeText = artist.artistType;
  }
  artistInfoContent += `艺人类型: ${artistTypeText}\n`;
}

if (artist.region) {
  let regionText = '';
  if (artist.region.includes('china')) {
    regionText += '中国';
    if (artist.region.includes('mainland')) regionText += '大陆';
    if (artist.region.includes('taiwan')) regionText += '台湾';
    if (artist.region.includes('hongkong')) regionText += '香港';
    if (artist.region.includes('macau')) regionText += '澳门';
  } else if (artist.region.includes('japan')) {
    regionText = '日本';
  } else if (artist.region.includes('korea')) {
    regionText = '韩国';
  } else {
    regionText = artist.region;
  }
  artistInfoContent += `所在地区: ${regionText}\n`;
}

if (artist.alias) {
  artistInfoContent += `艺人别名: ${artist.alias}\n`;
    }
    
    // 添加歌手链接信息
    const platformLinks = [];
    
    // 检查各平台链接字段
    const platforms = [
      { field: 'netease', name: '网易云音乐' },
      { field: 'qq', name: 'QQ音乐' },
      { field: 'kugou', name: '酷狗音乐' },
      { field: 'kuwo', name: '酷我音乐' },
      { field: 'qishui', name: '汽水音乐' },
      { field: 'spotify', name: 'Spotify' },
      { field: 'youtube', name: 'YouTube' },
      { field: 'appleMusic', name: 'Apple Music' },
      { field: 'soundCloud', name: 'SoundCloud' }
    ];
    
    // 收集有效的平台链接
    platforms.forEach(platform => {
      if (artist[platform.field] && artist[platform.field].trim()) {
        platformLinks.push({ platform: platform.name, url: artist[platform.field] });
      }
    });
    
    // 如果没有找到直接字段，尝试使用旧的links字段
    if (platformLinks.length === 0 && artist.links && typeof artist.links === 'string') {
      try {
        const links = JSON.parse(artist.links);
        if (links && Array.isArray(links) && links.length > 0) {
          links.forEach(link => {
            if (link.url && link.platform) {
              platformLinks.push({ platform: link.platform, url: link.url });
            }
          });
        }
      } catch (error) {
        console.error(`解析全新歌手 ${artist.name} 的链接信息失败:`, error);
      }
    }
    
    // 添加链接信息到内容中
    if (platformLinks.length > 0) {
      artistInfoContent += '链接:\n';
      platformLinks.forEach(link => {
        artistInfoContent += `- ${link.platform}: ${link.url}\n`;
      });
    }
    
    // 写入艺人信息文件
    fs.writeFileSync(artistInfoPath, artistInfoContent);
    console.log(`已创建全新歌手信息文件: ${artistInfoPath}`);
    
    // 复制歌手头像 - 支持avatar或avatarUrl字段
    const avatarPath = artist.avatar || artist.avatarUrl;
    if (avatarPath) {
      // 尝试多种路径组合
      const pathOptions = [
        // 选项1: 使用原始路径
        path.join(__dirname, '../../', avatarPath),
        // 选项2: 移除前导斜杠
        path.join(__dirname, '../../', avatarPath.replace(/^\/+/, '')),
        // 选项3: 直接使用绝对路径
        avatarPath,
        // 选项4: 尝试uploads/images目录
        path.join(__dirname, '../../uploads/images', path.basename(avatarPath)),
        // 选项5: 如果是image_开头的文件名，尝试uploads/images目录
        path.basename(avatarPath).startsWith('image_') ? 
          path.join(__dirname, '../../uploads/images', path.basename(avatarPath)) : null
      ].filter(Boolean); // 过滤掉null值
      
      let avatarSrc = null;
      let fileExists = false;
      
      // 尝试所有路径选项，直到找到文件
      for (const pathOption of pathOptions) {
        console.log(`[DEBUG] 尝试歌手头像路径: ${pathOption}`);
        if (fs.existsSync(pathOption)) {
          avatarSrc = pathOption;
          fileExists = true;
          console.log(`[DEBUG] 找到歌手头像文件: ${avatarSrc}`);
          break;
        }
      }
      
      if (fileExists && avatarSrc) {
        // 使用适当的扩展名
        const extension = path.extname(avatarSrc) || '.jpg';
        const avatarDest = path.join(artistDir, `头像${extension}`);
        
        try {
          fs.copyFileSync(avatarSrc, avatarDest);
          console.log(`已复制全新歌手头像: ${avatarSrc} -> ${avatarDest}`);
        } catch (error) {
          console.error(`复制全新歌手头像失败: ${avatarSrc}`, error);
        }
      } else {
              console.log(`无法找到全新歌手头像，尝试了以下路径: ${pathOptions.join(', ')}`);
    }
  }
  
  // 返回true表示有全新歌手并处理了相关信息
  return true;
}
}

/**
 * 添加专辑封面和描述文件
 * @param {Object} album - 专辑对象
 * @param {Object} dirs - 目录路径对象
 */
async function addAlbumFiles(album, dirs) {
  // 复制专辑封面
  if (album.coverImage) {
    const coverImagePath = path.join(__dirname, '../../', album.coverImage);
    const coverImageDest = path.join(dirs.albumDir, '专辑封面.jpg');
    if (fs.existsSync(coverImagePath)) {
      fs.copyFileSync(coverImagePath, coverImageDest);
      console.log(`已复制专辑封面: ${album.coverImage} -> ${coverImageDest}`);
    } else {
      console.error(`专辑封面文件不存在: ${coverImagePath}`);
    }
  }
  
  // 复制专辑级授权文件
  if (album.authorizationFile) {
    // 确保授权文件目录存在
    if (!fs.existsSync(dirs.authDir)) {
      fs.mkdirSync(dirs.authDir, { recursive: true });
    }
    
    // 创建专辑授权文件目录
    const albumAuthDir = path.join(dirs.authDir, '专辑授权');
    if (!fs.existsSync(albumAuthDir)) {
      fs.mkdirSync(albumAuthDir);
    }
    
    // 源文件路径
    const authFileSrc = path.join(__dirname, '../../', album.authorizationFile);
    
    // 获取提交者信息（用户实名）
    let submitterRealName = "未知用户";
    try {
      if (album.submittedById) {
        const { sequelize } = require('../config/db');
        // 先尝试从userverifications表获取实名
        const [verificationResults] = await sequelize.query(`
          SELECT realName
          FROM userverifications
          WHERE userId = :userId AND status = 'approved'
        `, {
          replacements: {
            userId: album.submittedById
          }
        });

        if (verificationResults && verificationResults.length > 0) {
          submitterRealName = verificationResults[0].realName || "未知用户";
        } else {
          // 如果没有实名认证信息，则从users表获取用户名
          const [userResults] = await sequelize.query(`
            SELECT username
            FROM users
            WHERE id = :userId
          `, {
            replacements: {
              userId: album.submittedById
            }
          });

          if (userResults && userResults.length > 0) {
            submitterRealName = userResults[0].username || "未知用户";
          }
        }
      }
    } catch (error) {
      console.error(`获取专辑提交者信息失败:`, error);
    }
    
    // 目标文件路径 - 使用新的命名格式
    const authFileName = `授权书-${album.title}-${submitterRealName}2极音记（专辑授权）.pdf`;
    const authFileDest = path.join(albumAuthDir, authFileName);
    
    // 复制授权文件
    if (fs.existsSync(authFileSrc)) {
      try {
        fs.copyFileSync(authFileSrc, authFileDest);
        console.log(`已复制专辑授权文件: ${album.authorizationFile} -> ${authFileDest}`);
      } catch (error) {
        console.error(`复制专辑授权文件失败: ${authFileSrc}`, error);
      }
    } else {
      console.error(`专辑授权文件不存在: ${authFileSrc}`);
    }
  } else {
    console.log(`专辑 ${album.title} 没有授权文件`);
  }
  
  // 处理动态封面申请
  try {
    // 查询该专辑所有已审核通过的动态封面申请
    const { sequelize } = require('../config/db');
    
    // 先检查dynamic_cover_requests表结构
    const [dcColumnsResult] = await sequelize.query(`
      SHOW COLUMNS FROM dynamic_cover_requests
    `);
    
    // 提取列名
    const dcColumnNames = dcColumnsResult.map(col => col.Field);
    console.log(`[DEBUG] dynamic_cover_requests表的列: ${dcColumnNames.join(', ')}`);
    
    // 检查status字段的类型和可能的值
    const statusColumn = dcColumnsResult.find(col => col.Field === 'status');
    if (statusColumn) {
      console.log(`[DEBUG] status字段类型: ${statusColumn.Type}`);
    }
    
    // 先查询所有状态的请求，以便调试
    const [allRequests] = await sequelize.query(`
      SELECT id, albumId, platform, status, dynamicCoverPath
      FROM dynamic_cover_requests
      WHERE albumId = :albumId
    `, {
      replacements: { albumId: album.id }
    });
    
    console.log(`[DEBUG] 找到 ${allRequests.length} 个动态封面申请:`);
    allRequests.forEach(req => {
      console.log(`[DEBUG] ID: ${req.id}, 平台: ${req.platform}, 状态: '${req.status}'`);
    });
    
    // 构建动态查询，只查询存在的字段
    const dcFieldsToCheck = ['id', 'albumId', 'userId', 'platform', 'status', 'dynamicCoverPath', 'portraitCoverPath'];
    const existingDcFields = dcFieldsToCheck.filter(field => dcColumnNames.includes(field));
    
    // 构建查询语句 - 只查询已审核通过的申请
    const selectDcFields = existingDcFields.join(', ');
    
    // 查询已审核通过的动态封面申请，仅包含approved和submitted状态
    const [approvedRequests] = await sequelize.query(`
      SELECT ${selectDcFields}
      FROM dynamic_cover_requests
      WHERE albumId = :albumId AND status IN ('approved', 'submitted')
    `, {
      replacements: { albumId: album.id }
    });
    
    console.log(`[DEBUG] 找到 ${approvedRequests.length} 个已审核通过的动态封面申请`);
    approvedRequests.forEach(req => {
      console.log(`[DEBUG] 已审核申请 - ID: ${req.id}, 平台: ${req.platform}, 状态: '${req.status}'`);
    });
    
    // 如果没有找到已审核的申请，记录日志但不处理已拒绝的申请
    if (approvedRequests.length === 0) {
      console.log(`[INFO] 未找到已审核通过的动态封面申请，不包含任何动态封面`);
    } else {
      // 跟踪是否有任何有效的动态封面
      let hasValidDynamicCover = false;
      
      // 处理每个平台的动态封面
      for (const request of approvedRequests) {
        // 获取平台名称和对应的目录
        let platformDir;
        let platformName;
        
        switch (request.platform) {
          case 'netease':
            platformDir = dirs.neteaseDir;
            platformName = '网易云音乐';
            break;
          case 'qqmusic':
            platformDir = dirs.qqmusicDir;
            platformName = 'QQ音乐';
            break;
          case 'applemusic':
            platformDir = dirs.applemusicDir;
            platformName = '苹果音乐';
            break;
          default:
            console.log(`[WARNING] 未知平台: ${request.platform}`);
            continue;
        }
        
        // 复制标准动态封面(1:1)
        if (request.dynamicCoverPath) {
          // 尝试多种路径组合
          const pathOptions = [
            path.join(__dirname, '../../', request.dynamicCoverPath),
            path.join(__dirname, '../../', request.dynamicCoverPath.replace(/^\/+/, '')),
            request.dynamicCoverPath,
            path.resolve(process.cwd(), request.dynamicCoverPath),
            path.join(__dirname, '../../uploads', path.basename(request.dynamicCoverPath))
          ];
          
          let dynamicCoverPath = null;
          let fileExists = false;
          
          // 尝试所有路径选项，直到找到文件
          for (const pathOption of pathOptions) {
            console.log(`[DEBUG] 尝试${platformName}动态封面路径: ${pathOption}`);
            if (fs.existsSync(pathOption)) {
              dynamicCoverPath = pathOption;
              fileExists = true;
              console.log(`[DEBUG] 找到${platformName}动态封面文件: ${dynamicCoverPath}`);
              break;
            }
          }
          
          // 如果找到文件，创建目录并复制文件
          if (fileExists && dynamicCoverPath) {
            // 确保动态封面主目录存在
            if (!hasValidDynamicCover) {
              if (!fs.existsSync(dirs.dynamicCoverDir)) {
                fs.mkdirSync(dirs.dynamicCoverDir, { recursive: true });
              }
              hasValidDynamicCover = true;
            }
            
            // 确保平台目录存在
            if (!fs.existsSync(platformDir)) {
              fs.mkdirSync(platformDir, { recursive: true });
            }
            
            try {
              // 确定目标文件名
              const fileName = request.platform === 'applemusic' ? '动态封面_1比1.mp4' : '动态封面.mp4';
              const destPath = path.join(platformDir, fileName);
              
              console.log(`[DEBUG] 复制${platformName}动态封面: ${dynamicCoverPath} -> ${destPath}`);
              fs.copyFileSync(dynamicCoverPath, destPath);
              console.log(`[DEBUG] ${platformName}动态封面复制完成`);
            } catch (error) {
              console.error(`[ERROR] 复制${platformName}动态封面失败:`, error);
            }
          } else {
            console.error(`[ERROR] 无法找到${platformName}动态封面文件，尝试了以下路径:`, pathOptions);
          }
        }
        
        // 如果是苹果音乐，还需要处理竖版封面(3:4)
        // 检查portraitCoverPath字段是否存在于表中
        if (request.platform === 'applemusic' && dcColumnNames.includes('portraitCoverPath') && request.portraitCoverPath) {
          // 尝试多种路径组合
          const pathOptions = [
            path.join(__dirname, '../../', request.portraitCoverPath),
            path.join(__dirname, '../../', request.portraitCoverPath.replace(/^\/+/, '')),
            request.portraitCoverPath,
            path.resolve(process.cwd(), request.portraitCoverPath),
            path.join(__dirname, '../../uploads', path.basename(request.portraitCoverPath))
          ];
          
          let portraitCoverPath = null;
          let fileExists = false;
          
          // 尝试所有路径选项，直到找到文件
          for (const pathOption of pathOptions) {
            console.log(`[DEBUG] 尝试苹果音乐竖版封面路径: ${pathOption}`);
            if (fs.existsSync(pathOption)) {
              portraitCoverPath = pathOption;
              fileExists = true;
              console.log(`[DEBUG] 找到苹果音乐竖版封面文件: ${portraitCoverPath}`);
              break;
            }
          }
          
          // 如果找到文件，创建目录并复制到苹果音乐目录
          if (fileExists && portraitCoverPath) {
            // 确保动态封面主目录存在
            if (!hasValidDynamicCover) {
              if (!fs.existsSync(dirs.dynamicCoverDir)) {
                fs.mkdirSync(dirs.dynamicCoverDir, { recursive: true });
              }
              hasValidDynamicCover = true;
            }
            
            // 确保苹果音乐平台目录存在
            if (!fs.existsSync(platformDir)) {
              fs.mkdirSync(platformDir, { recursive: true });
            }
            
            try {
              const destPath = path.join(platformDir, '动态封面_3比4.mp4');
              
              console.log(`[DEBUG] 复制苹果音乐竖版封面: ${portraitCoverPath} -> ${destPath}`);
              fs.copyFileSync(portraitCoverPath, destPath);
              console.log(`[DEBUG] 苹果音乐竖版封面复制完成`);
            } catch (error) {
              console.error(`[ERROR] 复制苹果音乐竖版封面失败:`, error);
            }
          } else {
            console.error(`[ERROR] 无法找到苹果音乐竖版封面文件，尝试了以下路径:`, pathOptions);
          }
        } else if (request.platform === 'applemusic') {
          console.log(`[WARNING] 苹果音乐平台缺少竖版封面(portraitCoverPath)`);
        }
      }
      
      // 如果没有找到任何有效的动态封面，记录日志
      if (!hasValidDynamicCover) {
        console.log(`[INFO] 未找到任何有效的动态封面文件，不创建动态封面目录`);
      }
    }
  } catch (error) {
    console.error(`[ERROR] 处理动态封面申请时出错:`, error);
  }
  
  
  // 创建专辑简介文件
  const albumDescPath = path.join(dirs.albumDir, '专辑简介.txt');
  fs.writeFileSync(albumDescPath, album.description || '');
  
  // 创建发行外显文件
  const releaseInfoPath = path.join(dirs.albumDir, '发行外显.txt');
  fs.writeFileSync(releaseInfoPath, album.displayInfo || '极音记');
}

/**
 * 创建Excel信息表
 * @param {Object} album - 专辑对象
 * @param {string} albumDir - 专辑目录路径
 * @returns {Promise<void>}
 */
async function createExcelWorkbook(album, albumDir) {
  // 创建Excel工作簿和工作表
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('专辑信息');

  // 设置列
  worksheet.columns = [
    { header: '序号', width: 5 },
    { header: '专辑类型', width: 10 },
    { header: '专辑中文名称', width: 20 },
    { header: '歌曲中文名称', width: 20 },
    { header: '语种', width: 10 },
    { header: '风格', width: 10 },
    { header: '歌曲表演者', width: 20 },
    { header: '词作者', width: 15 },
    { header: '曲作者', width: 15 },
    { header: '词著作权比例', width: 15 },
    { header: '曲著作权比例', width: 15 },
    { header: '表演者权比例', width: 15 },
    { header: '录音制作者权比例', width: 20 },
    { header: '词曲权持有人', width: 25 },
    { header: '录音权持有人', width: 25 },
    { header: '发行区域', width: 10 },
    { header: '商用区域', width: 10 }
  ];

  // 添加数据行
  for (let i = 0; i < album.Songs.length; i++) {
    const song = album.Songs[i];

    // 获取排序后的艺术家列表
    const orderedArtists = await getOrderedArtists(song, 'Excel工作表');
    
    // 使用艺术家名称作为表演者
    const artistNames = orderedArtists.map(artist => artist.name).join('/');
    
    // 使用艺术家实名作为作词作曲者，如果没有实名则使用艺名
    const realNames = orderedArtists.map(artist => artist.realName || artist.name).join('/');
    
    console.log(`[Excel表格] 歌曲 ${song.title} - 艺名: ${artistNames}, 实名: ${realNames}`);
    
    worksheet.addRow([
      i + 1,
      album.type === '专辑' ? '专辑' : '单曲',
      album.title,
      song.title,
      song.language || '中文',
      song.genre || '电子',
      artistNames,
      realNames,  // 作词者使用实名
      realNames,  // 作曲者使用实名
      '100%',
      '100%',
      '100%',
      '100%',
      '上海极音记文化科技有限公司',
      '上海极音记文化科技有限公司',
      '全球',
      '全球'
    ]);
  }

  // 设置表头样式
  applyExcelStyles(worksheet);

  // 保存Excel文件
  const excelFilePath = path.join(albumDir, `极音记 专辑信息表 ${album.title}.xlsx`);
  await workbook.xlsx.writeFile(excelFilePath);
}

/**
 * 应用Excel表格样式
 * @param {Object} worksheet - Excel工作表对象
 */
function applyExcelStyles(worksheet) {
  // 设置表头样式
  worksheet.getRow(1).height = 60; // 增加表头行高
  worksheet.getRow(1).font = { bold: true, size: 15, name: '宋体' };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  
  // 设置表头背景色
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }  // 浅灰色背景
    };
  });

  // 设置所有单元格的样式
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      // 设置单元格边框
      cell.border = {
        top: { style: 'medium' },
        left: { style: 'medium' },
        bottom: { style: 'medium' },
        right: { style: 'medium' }
      };
      
      // 设置对齐方式
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      
      // 设置字体
      if (rowNumber > 1) { // 数据行
        cell.font = {
          name: '宋体',
          size: 11
        };
      }
    });
  });
}

/**
 * 创建并发送ZIP文件
 * @param {Object} dirs - 目录结构对象
 * @param {Object} res - Express响应对象
 * @param {Object} album - 专辑对象
 * @returns {Promise<string>} - ZIP文件路径
 */
async function createAndSendZip(dirs, res, album) {
  return new Promise((resolve, reject) => {
    try {
      // 输出目录结构以便调试
      console.log('[DEBUG] 准备压缩的文件结构:');
      printDirectoryStructure(dirs.tempDir);
      
      // 创建ZIP文件，使用发行日期和专辑名称作为文件名
      let releaseDate = '';
      if (album && album.releaseDate) {
        // 检查releaseDate的类型并适当处理
        if (typeof album.releaseDate === 'string') {
          // 如果是字符串，直接替换
        releaseDate = album.releaseDate.replace(/-/g, '.');
        } else if (album.releaseDate instanceof Date) {
          // 如果是Date对象，格式化为YYYY.MM.DD
          const year = album.releaseDate.getFullYear();
          const month = String(album.releaseDate.getMonth() + 1).padStart(2, '0');
          const day = String(album.releaseDate.getDate()).padStart(2, '0');
          releaseDate = `${year}.${month}.${day}`;
        } else {
          // 其他情况（如null或undefined），使用当前日期
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          releaseDate = `${year}.${month}.${day}`;
          console.log(`[WARNING] 专辑发行日期格式不正确: ${album.releaseDate}，使用当前日期`);
        }
      } else {
        // 如果没有发行日期，使用当前日期
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        releaseDate = `${year}.${month}.${day}`;
      }
      
      // 安全处理专辑名称，移除文件名中不允许的字符
      const albumTitle = album && album.title ? album.title.replace(/[\\/:*?"<>|]/g, '_') : '未知专辑';
      
      // 添加时间戳，确保文件名唯一，避免缓存问题
      const timestamp = Date.now();
      const zipFileName = `${releaseDate} - ${albumTitle}_${timestamp}.zip`;
      const zipFilePath = path.join(dirs.tempDir, zipFileName);
      
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      });
      
      output.on('close', () => {
        console.log(`ZIP文件创建成功，大小: ${archive.pointer()} 字节`);
        
        // 检查响应是否已发送
        if (res.headersSent) {
          console.log('响应头已发送，不再发送ZIP文件');
          resolve(zipFilePath);
          return;
        }
        
        // 设置响应头，防止缓存
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // 设置更友好的下载文件名（不含时间戳）
        const downloadFileName = `${releaseDate} - ${albumTitle}.zip`;
        
        // 发送文件
        res.download(zipFilePath, downloadFileName, (err) => {
          if (err) {
            console.error('发送ZIP文件失败:', err);
            // 只有在响应头尚未发送时才发送错误响应
            if (!res.headersSent) {
              res.status(500).json({ message: '发送ZIP文件失败', error: err.message });
            }
            reject(err);
          } else {
            console.log('ZIP文件发送成功');
            resolve(zipFilePath);
          }
        });
      });
      
      archive.on('error', (err) => {
        console.error('创建ZIP文件失败:', err);
        // 只有在响应头尚未发送时才发送错误响应
        if (!res.headersSent) {
          res.status(500).json({ message: '创建ZIP文件失败', error: err.message });
        }
        reject(err);
      });
      
      archive.pipe(output);
      
      // 添加专辑目录到ZIP
      // 检查并使用正确的目录路径
      console.log('[DEBUG] 压缩目录信息:', {
        tempDir: dirs.tempDir,
        albumDir: dirs.albumDir,
        albumRootDir: dirs.albumRootDir,
        rootDir: dirs.rootDir
      });
      
      // 确定要添加到ZIP的目录
      let dirToArchive = null;
      let nameInArchive = null;
      
      if (dirs.albumRootDir && fs.existsSync(dirs.albumRootDir)) {
        dirToArchive = dirs.albumRootDir;
        nameInArchive = path.basename(dirs.albumRootDir);
      } else if (dirs.rootDir && fs.existsSync(dirs.rootDir)) {
        dirToArchive = dirs.rootDir;
        nameInArchive = path.basename(dirs.rootDir);
      } else if (dirs.albumDir && fs.existsSync(dirs.albumDir)) {
        dirToArchive = dirs.albumDir;
        nameInArchive = dirs.albumDirName || path.basename(dirs.albumDir);
      } else {
        // 如果以上都不存在，使用临时目录
        dirToArchive = dirs.tempDir;
        nameInArchive = path.basename(dirs.tempDir);
      }
      
      console.log(`[DEBUG] 添加目录到ZIP: ${dirToArchive} 作为 ${nameInArchive}`);
      archive.directory(dirToArchive, nameInArchive);
      
      archive.finalize();
    } catch (error) {
      console.error('创建ZIP文件过程中出错:', error);
      // 只有在响应头尚未发送时才发送错误响应
      if (!res.headersSent) {
        res.status(500).json({ message: '创建ZIP文件过程中出错', error: error.message });
      }
      reject(error);
    }
  });
}

/**
 * 递归打印目录结构
 * @param {string} dirPath - 要打印的目录路径
 * @param {number} level - 当前递归层级（用于缩进）
 */
function printDirectoryStructure(dirPath, level = 0) {
  try {
    const indent = '  '.repeat(level);
    console.log(`${indent}${path.basename(dirPath)}/`);
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        printDirectoryStructure(itemPath, level + 1);
      } else {
        console.log(`${indent}  ${item}`);
      }
    }
  } catch (error) {
    console.error(`打印目录结构时出错 (${dirPath}):`, error);
  }
}

/**
 * 清理临时文件
 * @param {string} tempDir - 临时目录路径
 */
async function cleanupTempFiles(tempDir) {
  if (tempDir && fs.existsSync(tempDir)) {
    try {
      await rimraf(tempDir);
      console.log(`已清理临时目录: ${tempDir}`);
    } catch (cleanupError) {
      console.error('清理临时文件失败:', cleanupError);
    }
  }
}

/**
 * 根据模式在目录中查找音频文件
 * @param {string} directory - 要搜索的目录
 * @param {string} pattern - 搜索模式（歌曲ID或标题）
 * @returns {Array} - 匹配文件的完整路径数组
 */
function findAudioFilesByPattern(directory, pattern) {
  if (!pattern || !fs.existsSync(directory)) {
    return [];
  }
  
  try {
    const files = fs.readdirSync(directory);
    return files
      .filter(file => 
        file.toLowerCase().includes(pattern.toLowerCase()) && 
        (file.endsWith('.wav') || file.endsWith('.mp3'))
      )
      .map(file => path.join(directory, file));
  } catch (error) {
    console.error(`在目录 ${directory} 中查找模式 ${pattern} 的文件时出错:`, error);
    return [];
  }
}

// 生成并下载专辑发行文件
router.get('/:id/download', adminAuth, async (req, res) => {
  let tempDir = null;
  let zipFilePath = null;
  
  try {
    console.log('请求参数:', req.params);
    const albumId = parseInt(req.params.id, 10);
    console.log('开始生成专辑发行文件，专辑ID:', albumId);
    
    // 设置响应头，防止缓存
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // 查询专辑信息，包含所有歌曲和歌手，以及动态封面信息
    let album = await Album.findByPk(albumId, {
      include: [
        {
          model: Song,
          include: [{
            model: Artist,
            as: 'Artists',
            through: { attributes: [] }
          }]
        }
      ],
      // 强制刷新，不使用缓存
      raw: false
    });

    if (!album) {
      return res.status(404).json({ message: '专辑不存在' });
    }

    // 检查专辑是否已审核通过
    if (album.status !== 'approved') {
      return res.status(400).json({ message: '只能下载已审核通过的专辑' });
    }
    
    // 由于Sequelize模型可能不包含动态封面字段，使用原始SQL查询获取完整信息
    try {
      const { sequelize } = require('../config/db');
      
      // 首先检查表结构，确定存在哪些字段
      const [columnsResult] = await sequelize.query(`
        SHOW COLUMNS FROM albums
      `);
      
      // 提取列名
      const columnNames = columnsResult.map(col => col.Field);
      console.log(`[DEBUG] albums表的列: ${columnNames.join(', ')}`);
      
      // 构建动态查询，只查询存在的字段
      const fieldsToCheck = ['dynamicCoverPath', 'hasDynamicCover', 'portraitCoverPath', 'hasPortraitCover', 'authorizationFile', 'label'];
      const existingFields = fieldsToCheck.filter(field => columnNames.includes(field));
      
      // 始终包含id字段
      const selectFields = ['id', ...existingFields].join(', ');
      
      // 执行查询
      const [albumResults] = await sequelize.query(`
        SELECT ${selectFields}
        FROM albums 
        WHERE id = :albumId
      `, { 
        replacements: { albumId } 
      });
      
      if (albumResults && albumResults.length > 0) {
        // 将动态封面信息合并到album对象中
        if (columnNames.includes('dynamicCoverPath')) {
        album.dynamicCoverPath = albumResults[0].dynamicCoverPath;
        }
        
        if (columnNames.includes('hasDynamicCover')) {
        album.hasDynamicCover = !!albumResults[0].hasDynamicCover;
        }
        
        if (columnNames.includes('portraitCoverPath')) {
        album.portraitCoverPath = albumResults[0].portraitCoverPath;
        }
        
        if (columnNames.includes('hasPortraitCover')) {
        album.hasPortraitCover = !!albumResults[0].hasPortraitCover;
        }
        
        if (columnNames.includes('authorizationFile')) {
        album.authorizationFile = albumResults[0].authorizationFile;
        }
        
        if (columnNames.includes('label')) {
        album.label = albumResults[0].label;
        }
        
        console.log(`[DEBUG] 从数据库获取到的专辑信息:`, {
          albumId: albumResults[0].id,
          dynamicCoverPath: album.dynamicCoverPath,
          hasDynamicCover: album.hasDynamicCover,
          portraitCoverPath: album.portraitCoverPath,
          hasPortraitCover: album.hasPortraitCover,
          authorizationFile: album.authorizationFile,
          label: album.label
        });
      }
      
      // 获取歌曲详细信息和歌手状态信息
      for (const song of album.Songs) {
        try {
          const [songResults] = await sequelize.query(`
            SELECT id, wavFile, audioFile, genre
            FROM songs
            WHERE id = :songId
          `, {
            replacements: { songId: song.id }
          });
          
          if (songResults && songResults.length > 0) {
            song.wavFile = songResults[0].wavFile;
            song.audioFile = songResults[0].audioFile;
            song.genre = songResults[0].genre;
            
            // 检查wavFile是否是加密格式
            const isEncryptedPath = song.wavFile && (song.wavFile.includes(':') || song.wavFile.length > 100);
            
            console.log(`[DEBUG] 歌曲 ${song.id} 的详细信息:`, {
              title: song.title,
              wavFile: song.wavFile ? (isEncryptedPath ? '加密路径' : song.wavFile) : '无',
              audioFile: song.audioFile || '无',
              genre: song.genre,
              isInstrumental: song.genre === '纯音乐',
              isEncryptedPath: isEncryptedPath
            });
            
            // 如果是加密路径，尝试在uploads/audio目录中查找匹配的文件
            if (isEncryptedPath) {
              const audioDir = path.join(__dirname, '../../uploads/audio');
              if (fs.existsSync(audioDir)) {
                const matchingFiles = findAudioFilesByPattern(audioDir, song.title);
                if (matchingFiles.length > 0) {
                  console.log(`为加密路径的歌曲 ${song.title} 找到可能的音频文件:`, matchingFiles);
                  // 不直接替换wavFile，而是在处理函数中处理
                } else {
                  console.log(`未找到与加密路径歌曲 ${song.title} 匹配的音频文件`);
                }
              }
            }
            
            // 获取歌曲关联的艺术家状态信息和详细资料
            if (song.Artists && song.Artists.length > 0) {
              const artistIds = song.Artists.map(artist => artist.id);
              
              // 使用参数化查询代替直接拼接ID
              let placeholders = artistIds.map((_, index) => `:artistId${index}`).join(',');
              let replacements = {};
              artistIds.forEach((id, index) => {
                replacements[`artistId${index}`] = id;
              });
              
              const [artistDetailsResults] = await sequelize.query(`
                SELECT id, status, isNewArtist, realName, description, alias, artistType, region, avatarUrl
                FROM artists
                WHERE id IN (${placeholders})
              `, {
                replacements: replacements
              });
              
              if (artistDetailsResults && artistDetailsResults.length > 0) {
                // 将详细信息添加到艺术家对象中
                for (const artist of song.Artists) {
                  const artistDetails = artistDetailsResults.find(a => a.id === artist.id);
                  if (artistDetails) {
                    // 复制所有详细信息到艺术家对象
                    Object.assign(artist, artistDetails);
                    
                    // 确保布尔值正确转换
                    artist.isNewArtist = !!artistDetails.isNewArtist;
                    
                    if (artist.isNewArtist) {
                      console.log(`[DEBUG] 歌曲 ${song.title} 包含全新歌手: ${artist.name} (ID: ${artist.id})`);
                      console.log(`[DEBUG] 歌手详细信息: 实名=${artist.realName}, 类型=${artist.artistType}, 地区=${artist.region}, 头像=${artist.avatarUrl}`);
                    }
                  }
                }
              }
            }
          }
        } catch (songError) {
          console.error(`[ERROR] 获取歌曲 ${song.id} 详细信息失败:`, songError);
        }
      }
    } catch (error) {
      console.error('[ERROR] 获取专辑信息失败:', error);
    }

    // 创建临时目录结构
    const dirs = createTempDirectories(album);
    tempDir = dirs.tempDir;
    
    // 处理歌曲文件
    for (const song of album.Songs) {
      await processSongFiles(song, dirs, album);
    }
    
    // 添加专辑封面和描述文件
    await addAlbumFiles(album, dirs);
    
    // 创建Excel信息表
    await createExcelWorkbook(album, dirs.albumDir);
    
    // 创建并发送ZIP文件
    zipFilePath = await createAndSendZip(dirs, res, album);
    
    // 在响应结束后清理临时文件
    res.on('finish', async () => {
      try {
        // 延迟一段时间后删除临时文件，确保文件传输完成
        setTimeout(async () => {
          await cleanupTempFiles(tempDir);
        }, 5000); // 5秒后删除
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
    });
    
  } catch (error) {
    console.error('生成专辑发行文件失败:', error);
    
    // 清理临时文件
    await cleanupTempFiles(tempDir);
    
    // 只有在响应头尚未发送时才发送错误响应
    if (!res.headersSent) {
      res.status(500).json({
        message: '生成专辑发行文件失败',
        error: error.message
      });
    }
  }
});

module.exports = router;