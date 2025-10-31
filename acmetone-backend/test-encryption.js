const { testEncryption, isPathEncrypted, decryptFilePath } = require('./src/utils/encryption');

console.log('=== 加密系统测试 ===');

// 测试新的加密功能
console.log('\n1. 测试新的加密功能:');
const testResult = testEncryption();

// 测试旧数据兼容性
console.log('\n2. 测试旧数据兼容性:');
const oldEncryptedPath = 'U2FsdGVkX1+5pZ8gkJ/glgRFHdGdxL3kW8Atjw4nh7il6IHX3DEcIqKURnwWSnYeQo39qxo4lWJhpkluLz7isaMaW6QmM0MmHL+i864KTLqkFdL/zWuUczPp8KxP3WnChapI/iPV72X5ZovQY8kWNB5QT8ppmR/B3aQRu0Ht1OI=';

console.log('旧加密路径:', oldEncryptedPath);
console.log('旧路径长度:', oldEncryptedPath.length);
console.log('是否被识别为加密:', isPathEncrypted(oldEncryptedPath));

try {
  const decrypted = decryptFilePath(oldEncryptedPath);
  console.log('解密结果:', decrypted);
  console.log('解密成功:', !!decrypted && decrypted !== oldEncryptedPath);
} catch (error) {
  console.log('解密失败:', error.message);
}

// 测试其他格式
console.log('\n3. 测试其他格式:');
const formats = [
  'b64:dXBsb2Fkcy9hdWRpby8yMDI1LzAxL3Rlc3Qud2F2', // base64格式
  'b40e69a804533d070fdad972d847d933:611b43240f2736af94cccc651ffd679a', // 旧IV格式
  'uploads/audio/2025/01/normal-path.wav' // 普通路径
];

formats.forEach((format, index) => {
  console.log(`格式${index + 1}: ${format.substring(0, 50)}...`);
  console.log(`是否加密: ${isPathEncrypted(format)}`);
});

console.log('\n=== 测试完成 ===');
