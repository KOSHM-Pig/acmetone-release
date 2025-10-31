'use strict';

/**
 * 简单的 DDoS 保护中间件
 * 跟踪每个 IP 的请求数量，如果在短时间内请求过多，则暂时封禁该 IP
 */
 
// 存储 IP 请求计数和最后请求时间
const ipRequests = new Map();
// 存储被封禁的 IP
const bannedIPs = new Map();

// 配置
const config = {
  windowMs: 60 * 1000, // 1分钟窗口
  maxRequests: 5000, // 1分钟内最多允许5000个请求
  banTime: 5 * 60 * 1000 // 封禁5分钟
};

/**
 * DDoS 保护中间件
 */
const ddosProtection = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  // 检查是否被封禁
  if (bannedIPs.has(ip)) {
    const banExpires = bannedIPs.get(ip);
    if (now < banExpires) {
      // 仍在封禁期内
      return res.status(429).json({
        message: '请求过于频繁，您的 IP 已被临时封禁，请稍后再试'
      });
    } else {
      // 封禁期已过，移除封禁
      bannedIPs.delete(ip);
    }
  }
  
  // 获取该 IP 的请求记录
  if (!ipRequests.has(ip)) {
    // 首次请求
    ipRequests.set(ip, {
      count: 1,
      firstRequest: now,
      lastRequest: now
    });
  } else {
    const record = ipRequests.get(ip);
    const windowExpired = now - record.firstRequest > config.windowMs;
    
    if (windowExpired) {
      // 窗口已过期，重置计数
      record.count = 1;
      record.firstRequest = now;
    } else {
      // 增加计数
      record.count += 1;
      
      // 检查是否超过限制
      if (record.count > config.maxRequests) {
        // 封禁该 IP
        bannedIPs.set(ip, now + config.banTime);
        console.warn(`[DDoS Protection] IP ${ip} 已被临时封禁，原因：1分钟内请求 ${record.count} 次`);
        return res.status(429).json({
          message: '请求过于频繁，您的 IP 已被临时封禁，请稍后再试'
        });
      }
    }
    
    record.lastRequest = now;
    ipRequests.set(ip, record);
  }
  
  // 清理过期的记录
  if (now % 100 === 0) { // 每100次请求执行一次清理
    const expiryTime = now - config.windowMs;
    for (const [ip, record] of ipRequests.entries()) {
      if (record.lastRequest < expiryTime) {
        ipRequests.delete(ip);
      }
    }
  }
  
  next();
};

module.exports = ddosProtection; 