/**
 * 音乐流派常量
 */
export const genres = [
  '流行 Pop', '摇滚 Rock', '民谣 Folk', '电子 Electronic',
  '爵士 Jazz', '古典 Classical', '嘻哈 Hip - Hop',
  '金属 Metal', '乡村 Country', '布鲁斯 Blues',
  '雷鬼 Reggae', '史诗 Epic', '世界音乐 World',
  '原声音乐 Soundtrack', '其他 Other'
];

/**
 * 身份证号码验证正则表达式
 */
export const idNumberRegex = /(^\d{18}$)|(^\d{17}(\d|X|x)$)/;

/**
 * 平台链接验证正则表达式
 */
export const platformRegex = {
  netease: /^https?:\/\/(music\.163\.com\/#\/artist\?id=|music\.163\.com\/artist\?id=)[0-9]+/i,
  qq: /^https?:\/\/y\.qq\.com\/(n\/ryqq\/singer\/|singer\/)[a-zA-Z0-9\-_%]+/i,
  kugou: /^https?:\/\/(www\.)?kugou\.com\/singer\/[a-zA-Z0-9\-_%]+/i,
  kuwo: /^https?:\/\/(www\.)?kuwo\.cn\/singer_detail\/[a-zA-Z0-9\-_%]+/i,
  qishui: /^https?:\/\/qishui\.douyin\.com\/s\/[a-zA-Z0-9\-_%]+/i,
  spotify: /^https?:\/\/open\.spotify\.com\/artist\/[a-zA-Z0-9\-_%]+/i,
  youtube: /^https?:\/\/(music\.youtube\.com\/channel\/|www\.youtube\.com\/channel\/)[a-zA-Z0-9_\-%.]+/i,
  appleMusic: /^https?:\/\/music\.apple\.com\/[a-z]{2}\/artist\/[a-zA-Z0-9\-_%]+/i,
  soundCloud: /^https?:\/\/(www\.)?soundcloud\.com\/[a-zA-Z0-9_\-%.]+/i
};

/**
 * 专辑表单验证规则
 */
export const albumRules = {
  title: [
    { required: true, message: '请输入专辑名称', trigger: 'blur' },
  ],
  type: [
    { required: true, message: '请选择专辑类型', trigger: 'change' },
  ],
  releaseDate: [
    { required: true, message: '请选择发行日期', trigger: 'change' },
  ],
  displayInfo: [
    { required: true, message: '请输入发行外显', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请输入专辑简介', trigger: 'blur' },
  ],
  performers: [
    { required: true, message: '请至少添加一位表演者', trigger: 'change' },
  ],
};

/**
 * 验证平台链接
 * @param {string} url - 要验证的URL
 * @param {string} platform - 平台名称
 * @returns {boolean} - 验证结果
 */
export const validatePlatformUrl = (url, platform) => {
  if (!url) return true; // 允许为空
  if (!platformRegex[platform]) return true; // 如果没有对应平台的正则，默认通过
  
  // 对URL进行预处理，确保百分号编码的URL也能被正确验证
  try {
    // 尝试解码URL，处理可能的百分号编码
    const decodedUrl = decodeURIComponent(url);
    if (platformRegex[platform].test(decodedUrl)) {
      return true;
    }
  } catch (e) {
    // 解码失败，可能是无效的URL编码，继续使用原始URL测试
  }
  
  return platformRegex[platform].test(url);
}; 