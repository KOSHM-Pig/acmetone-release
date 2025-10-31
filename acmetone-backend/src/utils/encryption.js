const CryptoJS = require('crypto-js');
const crypto = require('crypto');

// 加密密钥，应该从环境变量中获取
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'acmetone-default-encryption-key-2023';
const IV_LENGTH = 16; // AES-256-CBC使用16字节IV

/**
 * 加密敏感信息
 * @param {string} text 要加密的文本
 * @returns {string} 加密后的文本
 */
function encrypt(text) {
  try {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('加密失败:', error);
    // 返回原始文本，确保系统可以继续运行
    return text;
  }
}

/**
 * 解密敏感信息
 * @param {string} encryptedText 加密的文本
 * @returns {string} 解密后的文本
 */
function decrypt(encryptedText) {
  try {
    if (!encryptedText) return null;
    
    // 如果是加密失败时返回的原始文本，直接返回
    if (!encryptedText.startsWith('U2F') && !encryptedText.startsWith('A') && encryptedText.length < 30) {
      return encryptedText;
    }
    
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('解密失败:', error);
    // 返回原始加密文本，确保系统可以继续运行
    return encryptedText;
  }
}

/**
 * 掩码显示身份证号码
 * @param {string} idNumber 身份证号码
 * @returns {string} 掩码后的身份证号码
 */
function maskIdNumber(idNumber) {
  try {
    if (!idNumber) return '';
    return idNumber.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');
  } catch (error) {
    console.error('身份证号掩码处理失败:', error);
    return idNumber ? '******' : '';
  }
}

/**
 * 掩码显示银行账号
 * @param {string} bankAccount 银行账号
 * @returns {string} 掩码后的银行账号
 */
function maskBankAccount(bankAccount) {
  try {
    if (!bankAccount) return '';
    // 保留前4位和后4位，中间用星号代替
    return bankAccount.replace(/^(.{4})(.*)(.{4})$/, '$1****$3');
  } catch (error) {
    console.error('银行账号掩码处理失败:', error);
    return bankAccount ? '******' : '';
  }
}

/**
 * 加密文件路径 - 优化版本，生成更短的加密字符串
 * @param {string} filePath - 要加密的文件路径
 * @returns {string} - 加密后的字符串（限制在200字符以内）
 */
function encryptFilePath(filePath) {
  try {
    if (!filePath) return '';

    // 使用CryptoJS的AES加密，生成更短的字符串
    const encrypted = CryptoJS.AES.encrypt(filePath, SECRET_KEY).toString();

    // 检查长度，如果超过200字符，使用base64编码进一步压缩
    if (encrypted.length > 200) {
      // 使用更简单的base64编码 + 简单混淆
      const base64 = Buffer.from(filePath).toString('base64');
      // 添加简单的混淆标识符
      return 'b64:' + base64;
    }

    return encrypted;
  } catch (error) {
    console.error('加密文件路径失败:', error);
    // 如果加密失败，使用base64编码作为备选
    try {
      const base64 = Buffer.from(filePath).toString('base64');
      return 'b64:' + base64;
    } catch (fallbackError) {
      console.error('备选编码也失败:', fallbackError);
      return filePath;
    }
  }
}

/**
 * 解密文件路径 - 优化版本，支持多种加密格式
 * @param {string} encryptedPath - 加密后的文件路径
 * @returns {string} - 解密后的文件路径
 */
function decryptFilePath(encryptedPath) {
  try {
    if (!encryptedPath) return encryptedPath;

    // 检查是否是base64编码格式
    if (encryptedPath.startsWith('b64:')) {
      const base64Data = encryptedPath.substring(4);
      return Buffer.from(base64Data, 'base64').toString('utf8');
    }

    // 检查是否是旧版本的IV:encrypted格式
    if (encryptedPath.includes(':') && /^[0-9a-f]{32}:.+$/.test(encryptedPath)) {
      // 分离IV和加密内容
      const parts = encryptedPath.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      // 确保密钥长度为32字节(256位)
      const key = Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));

      // 创建解密器
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      // 解密文件路径
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }

    // 尝试CryptoJS解密
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedPath, SECRET_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (decrypted) {
        return decrypted;
      }
    } catch (cryptoError) {
      console.warn('CryptoJS解密失败，尝试其他方法');
    }

    // 如果都失败了，返回原始路径
    return encryptedPath;
  } catch (error) {
    console.error('解密文件路径失败:', error);
    // 如果解密失败，返回原始加密路径
    return encryptedPath;
  }
}

/**
 * 检查路径是否已加密
 * @param {string} path - 要检查的路径
 * @returns {boolean} - 路径是否已加密
 */
function isPathEncrypted(path) {
  if (!path || typeof path !== 'string') return false;

  // 检查是否是base64编码格式
  if (path.startsWith('b64:')) return true;

  // 检查是否是旧版本的IV:加密内容格式
  if (path.includes(':') && /^[0-9a-f]{32}:.+$/.test(path)) return true;

  // 检查是否是CryptoJS加密格式
  // CryptoJS加密后的字符串特征：
  // 1. 通常以 "U2FsdGVkX1" 开头（"Salted__"的base64编码）
  // 2. 或者是长度较长且包含base64字符的字符串
  // 3. 不包含文件路径的特征（如 / 或 \）
  if (path.startsWith('U2FsdGVkX1')) return true;

  // 检查是否是其他CryptoJS格式（长字符串，包含base64字符，不像文件路径）
  if (path.length > 50 &&
      !path.includes('/') &&
      !path.includes('\\') &&
      !path.includes('.') &&
      /^[A-Za-z0-9+/=]+$/.test(path)) {
    return true;
  }

  return false;
}

// 测试函数 - 可以在开发环境中使用
function testEncryption() {
  const testPath = 'uploads/audio/2025/01/test-song-file-name-very-long.wav';
  console.log('测试路径:', testPath);
  console.log('原始长度:', testPath.length);

  const encrypted = encryptFilePath(testPath);
  console.log('加密后:', encrypted);
  console.log('加密长度:', encrypted.length);
  console.log('是否被识别为加密:', isPathEncrypted(encrypted));

  const decrypted = decryptFilePath(encrypted);
  console.log('解密后:', decrypted);
  console.log('解密正确:', decrypted === testPath);

  // 测试旧数据兼容性
  const oldEncryptedPath = 'U2FsdGVkX1+5pZ8gkJ/glgRFHdGdxL3kW8Atjw4nh7il6IHX3DEcIqKURnwWSnYeQo39qxo4lWJhpkluLz7isaMaW6QmM0MmHL+i864KTLqkFdL/zWuUczPp8KxP3WnChapI/iPV72X5ZovQY8kWNB5QT8ppmR/B3aQRu0Ht1OI=';
  console.log('旧数据是否被识别为加密:', isPathEncrypted(oldEncryptedPath));

  try {
    const oldDecrypted = decryptFilePath(oldEncryptedPath);
    console.log('旧数据解密结果:', oldDecrypted);
  } catch (error) {
    console.log('旧数据解密失败:', error.message);
  }

  return {
    original: testPath,
    encrypted: encrypted,
    decrypted: decrypted,
    encryptedLength: encrypted.length,
    isCorrect: decrypted === testPath,
    oldPathDetected: isPathEncrypted(oldEncryptedPath)
  };
}

module.exports = {
  encrypt,
  decrypt,
  maskIdNumber,
  maskBankAccount,
  encryptFilePath,
  decryptFilePath,
  isPathEncrypted,
  testEncryption // 导出测试函数
};