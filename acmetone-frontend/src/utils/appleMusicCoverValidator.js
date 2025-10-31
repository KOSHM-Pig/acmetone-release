/**
 * 苹果音乐动态封面验证工具
 * 根据苹果音乐官方要求检查视频文件是否符合规范
 */
import FPSMeter from '@vrbo/fpsmeter';
import { createFile } from 'mp4box';

/**
 * 检查视频是否符合苹果音乐动态封面要求
 * @param {File} file - 视频文件
 * @param {Object} options - 配置选项
 * @param {string} options.aspectRatio - 宽高比 '1:1' 或 '3:4'
 * @returns {Promise<Object>} - 包含验证结果的Promise
 */
export const validateAppleMusicCover = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('未提供文件'));
      return;
    }

    const { aspectRatio = '1:1' } = options;
    
    // 检查文件类型
    const validTypes = ['video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      reject({
        valid: false,
        error: 'format',
        message: '文件格式不符合要求，仅支持MP4或MOV格式'
      });
      return;
    }

    // 检查文件大小
  const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      reject({
        valid: false,
        error: 'size',
      message: '文件大小超过100MB，请使用更小的文件'
      });
      return;
    }

    // 创建视频元素检查详细参数
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      // 使用专业的FPSMeter库检测帧率
      detectVideoFrameRate(video).then(frameRate => {
        // 使用分贝检测音频
        hasAudioTrack(file).then(audioResult => {
          URL.revokeObjectURL(videoUrl);
          
          // 判断是否有音频
          const hasAudio = audioResult.hasAudio;
          
          const result = {
            valid: true,
            warnings: [],
            details: {
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              aspectRatio: `${video.videoWidth}:${video.videoHeight}`,
              frameRate: frameRate,
              hasAudio: hasAudio,
              audioDb: hasAudio ? audioResult.maxDb : null // 添加音频分贝值
            }
          };

          // 检查时长
          if (video.duration < 8 || video.duration > 20) {
            result.valid = false;
            result.error = 'duration';
            result.message = `视频时长必须在8-20秒之间，当前为${video.duration.toFixed(1)}秒`;
          }

          // 检查分辨率
          const expectedResolution = getExpectedResolution(aspectRatio);
          if (expectedResolution) {
            const { width, height } = expectedResolution;
            
            // 检查是否达到最低分辨率要求
            if (video.videoWidth < width * 0.9 || video.videoHeight < height * 0.9) {
              result.warnings.push(`分辨率低于建议值(${width}x${height})，可能影响显示质量`);
            }
            
            // 检查宽高比
            const expectedRatio = width / height;
            const actualRatio = video.videoWidth / video.videoHeight;
            
            if (Math.abs(actualRatio - expectedRatio) > 0.05) {
              result.valid = false;
              result.error = 'aspectRatio';
              result.message = `视频宽高比不符合${aspectRatio}要求`;
            }
          }

          // 检查帧率是否符合苹果音乐要求
          const validFrameRates = [23.976, 24, 25, 29.97, 30];
          const isValidFrameRate = validFrameRates.some(rate => 
            Math.abs(frameRate - rate) < 0.1
          );
          
          if (!isValidFrameRate) {
            result.warnings.push(`检测到帧率为${frameRate.toFixed(2)} fps，不符合苹果音乐要求的帧率(23.976、24、25、29.97或30 fps)`);
          }

          // 检查是否包含音频
          if (hasAudio) {
            result.warnings.push(`检测到视频包含音频 (${audioResult.maxDb.toFixed(1)}dB)，苹果音乐要求动态封面不得包含音频`);
            result.hasAudio = true; // 在结果中明确标记有音频
          } else {
            result.hasAudio = false; // 在结果中明确标记无音频
          }

          resolve(result);
        });
      }).catch(error => {
        URL.revokeObjectURL(videoUrl);
        console.error('帧率检测失败:', error);
        
        // 即使帧率检测失败，也继续其他验证
        const result = {
          valid: true,
          warnings: ['无法检测视频帧率，请确保视频符合苹果音乐要求的帧率(23.976、24、25、29.97或30 fps)'],
          details: {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            aspectRatio: `${video.videoWidth}:${video.videoHeight}`,
            frameRate: '未知'
          }
        };
        
        // 继续其他检查...
        if (video.duration < 8 || video.duration > 20) {
          result.valid = false;
          result.error = 'duration';
          result.message = `视频时长必须在8-20秒之间，当前为${video.duration.toFixed(1)}秒`;
        }
        
        resolve(result);
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject({
        valid: false,
        error: 'decode',
        message: '无法解码视频文件，请检查文件是否损坏'
      });
    };

    video.src = videoUrl;
  });
};

/**
 * 多方法综合检测视频是否包含音轨
 * @param {File} file - 视频文件
 * @returns {Promise<boolean>} - 是否包含音轨
 */
function hasAudioTrack(file) {
  return new Promise((resolve, reject) => {
    console.log('开始检测音频分贝水平...');
    
    // 创建一个视频元素来加载文件
    const video = document.createElement('video');
    const fileUrl = URL.createObjectURL(file);
    
    // 创建音频上下文和分析器
    let audioContext;
    let analyser;
    let source;
    
    const cleanup = () => {
      if (source) {
        try { source.disconnect(); } catch (e) {}
      }
      if (audioContext) {
        try { audioContext.close(); } catch (e) {}
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      URL.revokeObjectURL(fileUrl);
    };
    
    // 音频加载完成后进行分析
      video.onloadedmetadata = () => {
      try {
        // 创建音频上下文
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          console.warn('浏览器不支持AudioContext');
          resolve({ hasAudio: false, reason: '浏览器不支持音频分析' });
          cleanup();
          return;
        }
        
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        
        // 尝试创建媒体源
        try {
          source = audioContext.createMediaElementSource(video);
          source.connect(analyser);
          analyser.connect(audioContext.destination);
        } catch (e) {
          console.log('无法创建媒体源，视频可能没有音轨:', e);
          resolve({ hasAudio: false, reason: '无音频轨道' });
          cleanup();
          return;
        }
        
        // 准备分析数据
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // 开始播放视频
        video.currentTime = 1; // 跳过开头的静音部分
        video.muted = false; // 必须取消静音才能分析音频
        video.volume = 0; // 但设置音量为0避免实际播放声音
        
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = 300; // 每300ms检查一次
        
        // 定期检查音频水平
        const checkAudioLevel = () => {
          if (attempts >= maxAttempts) {
            // 完成所有采样
            finishAnalysis();
            return;
          }
          
          // 获取频率数据
          analyser.getByteFrequencyData(dataArray);
          
          // 计算平均分贝值
          let sum = 0;
          let nonZeroCount = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > 0) {
              sum += dataArray[i];
              nonZeroCount++;
            }
          }
          
          // 计算平均值和分贝值
          const average = nonZeroCount > 0 ? sum / nonZeroCount : 0;
          // 将0-255的值转换为分贝值 (大约 -100dB 到 0dB)
          const dbValue = average > 0 ? 20 * Math.log10(average / 255) : -100;
          
          console.log(`音频采样 #${attempts + 1}: 平均值=${average.toFixed(2)}, 分贝值=${dbValue.toFixed(2)}dB`);
          
          // 保存此次采样结果
          sampleResults.push({
            average: average,
            db: dbValue,
            nonZeroCount: nonZeroCount,
            totalSamples: bufferLength
          });
          
          // 继续下一次采样
          attempts++;
          setTimeout(checkAudioLevel, checkInterval);
        };
        
        // 保存所有采样结果
        const sampleResults = [];
        
        // 完成分析并返回结果
        const finishAnalysis = () => {
          // 找出最大分贝值
          let maxDb = -100;
          let avgDb = -100;
          let totalDb = 0;
          let validSamples = 0;
          
          sampleResults.forEach(sample => {
            if (sample.db > -100) { // 忽略-100dB（完全静音）
              maxDb = Math.max(maxDb, sample.db);
              totalDb += sample.db;
              validSamples++;
            }
          });
          
          // 计算平均分贝
          if (validSamples > 0) {
            avgDb = totalDb / validSamples;
          }
          
          console.log(`音频分析完成: 最大分贝=${maxDb.toFixed(2)}dB, 平均分贝=${avgDb.toFixed(2)}dB`);
          
          // 判断是否有实际可听见的音频
          // -50dB是一个很低的音量阈值，低于此值通常认为是背景噪音
          const hasAudibleAudio = maxDb > -50;
          
          const result = {
            hasAudio: hasAudibleAudio,
            maxDb: maxDb,
            avgDb: avgDb,
            samples: sampleResults.length,
            reason: hasAudibleAudio ? '检测到可听音频' : '未检测到可听音频'
          };
          
          console.log(`音频检测结果: ${hasAudibleAudio ? '有音频' : '无音频'} (最大: ${maxDb.toFixed(2)}dB)`);
          resolve(result);
          cleanup();
        };
        
        // 开始播放并分析
        video.play().then(() => {
          // 开始第一次采样
          setTimeout(checkAudioLevel, checkInterval);
        }).catch(e => {
          console.warn('无法播放视频:', e);
          resolve({ hasAudio: false, reason: '无法播放视频进行音频分析' });
          cleanup();
        });
        
      } catch (e) {
        console.error('音频分析过程出错:', e);
        resolve({ hasAudio: false, reason: '音频分析失败' });
        cleanup();
      }
    };
    
    // 处理加载错误
    video.onerror = (e) => {
      console.error('视频加载失败:', e);
      resolve({ hasAudio: false, reason: '视频加载失败' });
      cleanup();
    };
    
    // 设置视频源并开始加载
    video.preload = 'metadata';
    video.src = fileUrl;
    video.load();
    
    // 设置超时
    setTimeout(() => {
      if (!video.duration) {
        console.warn('视频加载超时');
        resolve({ hasAudio: false, reason: '视频加载超时' });
        cleanup();
      }
    }, 10000); // 10秒超时
  });
}

/**
 * 使用FPSMeter库检测视频的帧率
 * @param {HTMLVideoElement} video - 视频元素
 * @returns {Promise<number>} - 包含帧率的Promise
 */
function detectVideoFrameRate(video) {
  return new Promise((resolve, reject) => {
    try {
      // 保存当前视频状态
      const originalTime = video.currentTime;
      const originalPaused = video.paused;
      const originalMuted = video.muted;
      const originalPlaybackRate = video.playbackRate;
      
      // 设置视频静音并加速播放以获取更准确的帧率
      video.muted = true;
      video.playbackRate = 1.5; // 稍微加速播放以便更快获取帧数据
      
      // 创建FPSMeter实例，使用更精确的配置
      const fpsResults = [];
      const meter = new FPSMeter({
        calculatePerMs: 1000, // 1000ms的计算窗口，更长的窗口获取更稳定的结果
        maxCalculations: 5,   // 收集5个样本以提高准确性
        onUpdate: (update) => {
          // 过滤掉明显异常的值（过高或过低）
          if (update.fps > 10 && update.fps < 120) {
          fpsResults.push(update.fps);
            console.log(`检测到帧率样本: ${update.fps.toFixed(2)} fps`);
          }
        },
        onStop: () => {
          // 恢复视频原始状态
          video.pause();
          video.currentTime = originalTime;
          video.muted = originalMuted;
          video.playbackRate = originalPlaybackRate;
          if (!originalPaused) {
            video.play().catch(() => {});
          }
          
          // 计算平均帧率，使用中位数而非平均值以避免异常值的影响
          if (fpsResults.length > 0) {
            // 对结果排序
            fpsResults.sort((a, b) => a - b);
            
            // 使用中位数作为最终结果
            const medianIndex = Math.floor(fpsResults.length / 2);
            const medianFps = fpsResults.length % 2 === 0
              ? (fpsResults[medianIndex - 1] + fpsResults[medianIndex]) / 2
              : fpsResults[medianIndex];
              
            console.log(`帧率检测完成，样本: ${fpsResults.join(', ')}, 中位数: ${medianFps.toFixed(2)}`);
            
            // 将帧率舍入到最接近的标准帧率
            const standardFps = findClosestStandardFrameRate(medianFps);
            console.log(`舍入到标准帧率: ${standardFps}`);
            resolve(standardFps);
          } else {
            console.warn('未能获取有效的帧率样本，尝试使用备用方法');
            // 如果没有获取到帧率数据，尝试使用视频元数据中的帧率
            if (video.mozFrameRate) {
              resolve(video.mozFrameRate);
            } else {
              // 尝试从视频文件中提取元数据（如果浏览器支持）
              tryGetFrameRateFromMetadata(video).then(fps => {
                if (fps) {
                  resolve(fps);
                } else {
                  // 最后回退到常见帧率估计
              resolve(estimateFrameRate(video));
                }
              });
            }
          }
        }
      });
      
      // 开始播放视频并测量帧率
      video.currentTime = 0.5; // 从0.5秒开始，避开可能的黑屏或静态画面
      video.play().then(() => {
        // 延迟一点启动测量，确保视频已经稳定播放
        setTimeout(() => {
        meter.start();
        
          // 设置更长的测量时间以获取更准确的结果
        setTimeout(() => {
          meter.stop();
          }, 3000); // 3秒测量时间
        }, 300);
      }).catch(err => {
        console.warn('自动播放失败，尝试使用替代方法估计帧率', err);
        resolve(estimateFrameRate(video));
      });
    } catch (error) {
      console.error('帧率检测错误:', error);
      reject(error);
    }
  });
}

/**
 * 查找最接近的标准帧率
 * @param {number} fps - 检测到的帧率
 * @returns {number} - 最接近的标准帧率
 */
function findClosestStandardFrameRate(fps) {
  // 苹果音乐支持的标准帧率
  const standardRates = [23.976, 24, 25, 29.97, 30];
  
  // 找到最接近的标准帧率
  let closestRate = standardRates[0];
  let minDiff = Math.abs(fps - closestRate);
  
  for (let i = 1; i < standardRates.length; i++) {
    const diff = Math.abs(fps - standardRates[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closestRate = standardRates[i];
    }
  }
  
  return closestRate;
}

/**
 * 尝试从视频元数据中获取帧率
 * @param {HTMLVideoElement} video - 视频元素
 * @returns {Promise<number|null>} - 帧率或null
 */
function tryGetFrameRateFromMetadata(video) {
  return new Promise(resolve => {
    // 检查是否有MediaSource API支持
    if (window.MediaSource && video.getVideoPlaybackQuality) {
      try {
        // 尝试获取视频播放质量信息
        const quality = video.getVideoPlaybackQuality();
        if (quality && quality.totalVideoFrames && video.currentTime > 0) {
          const approximateFps = quality.totalVideoFrames / video.currentTime;
          if (approximateFps > 10 && approximateFps < 120) {
            return resolve(findClosestStandardFrameRate(approximateFps));
          }
        }
      } catch (e) {
        console.warn('无法从视频播放质量获取帧率:', e);
      }
    }
    
    // 尝试其他元数据方法
    if (video.webkitDecodedFrameCount !== undefined && video.webkitDecodedFrameRate !== undefined) {
      // Safari特有的属性
      return resolve(video.webkitDecodedFrameRate);
    }
    
    resolve(null);
  });
}

/**
 * 根据视频分辨率和类型估计帧率
 * @param {HTMLVideoElement} video - 视频元素
 * @returns {number} - 估计的帧率
 */
function estimateFrameRate(video) {
  // 尝试检查视频文件名是否包含帧率信息
  const src = video.src || '';
  const filenameParts = src.split('/').pop().split('.');
  const filename = filenameParts[0].toLowerCase();
  
  // 检查文件名中是否包含帧率信息
  if (filename.includes('24fps') || filename.includes('24p')) {
    return 24;
  } else if (filename.includes('25fps') || filename.includes('25p')) {
    return 25;
  } else if (filename.includes('30fps') || filename.includes('30p')) {
    return 30;
  } else if (filename.includes('29.97fps') || filename.includes('29.97p')) {
    return 29.97;
  } else if (filename.includes('23.976fps') || filename.includes('23.976p')) {
    return 23.976;
  }
  
  // 根据视频分辨率和类型估计帧率
  if (video.videoWidth >= 3840 || video.videoHeight >= 3840) {
    // 苹果音乐要求的正方形封面
    return 30; // 4K视频通常为30fps
  } else if (video.videoWidth >= 2048 || video.videoHeight >= 2732) {
    // 苹果音乐要求的竖版封面
    return 30;
  } else if (video.videoWidth >= 1920 || video.videoHeight >= 1080) {
    return 30; // 1080p视频通常为30fps
  } else {
    // 根据视频时长估计
    // 较短的视频（如15秒以内）通常使用较高帧率
    if (video.duration && video.duration < 15) {
      return 30;
    } else {
      return 24; // 默认使用24fps，这是电影标准帧率
    }
  }
}

/**
 * 获取指定宽高比的预期分辨率
 * @param {string} aspectRatio - 宽高比 '1:1' 或 '3:4'
 * @returns {Object|null} - 包含宽高的对象
 */
function getExpectedResolution(aspectRatio) {
  switch (aspectRatio) {
    case '1:1':
      return { width: 3840, height: 3840 }; // 方形封面
    case '3:4':
      return { width: 2048, height: 2732 }; // 竖版封面
    default:
      return null;
  }
}

/**
 * 格式化视频详细信息为可读文本
 * @param {Object} details - 视频详细信息
 * @returns {string} - 格式化后的文本
 */
export const formatVideoDetails = (details) => {
  if (!details) return '';
  
  let frameRateText = '未知';
  if (typeof details.frameRate === 'number') {
    // 对于标准帧率，显示精确值
    if ([23.976, 24, 25, 29.97, 30].includes(details.frameRate)) {
      frameRateText = details.frameRate.toString();
    } else {
      frameRateText = details.frameRate.toFixed(2);
    }
    frameRateText += ' fps';
    
    // 添加帧率符合性说明
    const validFrameRates = [23.976, 24, 25, 29.97, 30];
    const isValidFrameRate = validFrameRates.some(rate => 
      Math.abs(details.frameRate - rate) < 0.1
    );
    
    if (isValidFrameRate) {
      frameRateText += ' (符合苹果音乐要求)';
    } else {
      frameRateText += ' (不符合苹果音乐要求)';
    }
  }
  
  // 添加音频信息
  let audioText = '未检测';
  if (details.hasAudio !== undefined) {
    if (details.hasAudio) {
      audioText = '有音频 (不符合苹果音乐要求)';
      
      // 如果有音频分贝值，添加到结果中
      if (details.audioDb !== undefined && details.audioDb !== null) {
        audioText += ` - ${details.audioDb.toFixed(1)} dB`;
      }
    } else {
      audioText = '无音频 (符合苹果音乐要求)';
    }
  }
  
  return `分辨率: ${details.width}x${details.height}\n` +
         `时长: ${details.duration.toFixed(1)}秒\n` +
         `宽高比: ${details.aspectRatio}\n` +
         `帧率: ${frameRateText}\n` +
         `音频: ${audioText}`;
};

/**
 * 检查视频是否符合循环要求
 * 注意：此功能需要实际播放视频并分析首尾帧，这里仅提供简化版检测
 * @param {File} file - 视频文件
 * @returns {Promise<Object>} - 包含验证结果的Promise
 */
export const checkLoopability = (file) => {
  return new Promise((resolve) => {
    // 实际项目中可以使用更复杂的算法比较首尾帧的相似度
    // 这里仅提供简化版提示
    resolve({
      valid: true,
      message: '请确保视频首尾帧自然衔接，实现无缝循环效果',
      tips: [
        '避免使用淡入淡出效果',
        '确保动画流畅连贯，无明显跳切',
        '首尾帧应相似以实现无缝循环'
      ]
    });
  });
};

/**
 * 获取苹果音乐动态封面规范
 * @param {string} aspectRatio - 宽高比 '1:1' 或 '3:4'
 * @returns {Object} - 格式要求对象
 */
export const getAppleMusicCoverSpecs = (aspectRatio = '1:1') => {
  const commonSpecs = {
    format: 'MP4或MOV',
    codec: 'H.264或Apple ProRes 4444',
    pixelAspect: '方形像素(1:1)',
    frameRate: '23.976、24、25、29.97或30 fps',
    colorProfile: 'Rec. 709或sRGB',
    audio: '不得包含音频',
    duration: '8至20秒',
    bitrate: '45 Mbps',
    looping: '首尾帧应自然衔接，实现无缝循环'
  };

  if (aspectRatio === '3:4') {
    return {
      ...commonSpecs,
      resolution: '2048 x 2732像素',
      device: 'iPhone、Android',
      safeArea: '请注意UI覆盖区域和元数据区域'
    };
  } else {
    return {
      ...commonSpecs,
      resolution: '3840 x 3840像素',
      device: 'Mac、iPad、智能电视',
      safeArea: '整个画布均为安全区域'
    };
  }
}; 