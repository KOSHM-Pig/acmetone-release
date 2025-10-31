/**
 * 将日期对象格式化为MySQL日期时间格式 (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return null;
  
  // 如果传入的是字符串日期，转换为Date对象
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将日期对象格式化为MySQL日期格式 (YYYY-MM-DD)
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串
 */
function formatDateOnly(date) {
  if (!date) return null;
  
  // 如果传入的是字符串日期，转换为Date对象
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 获取当前日期时间的MySQL格式
 * @returns {string} - 当前日期时间的MySQL格式字符串
 */
function getCurrentDateTime() {
  return formatDate(new Date());
}

/**
 * 获取当前日期的MySQL格式
 * @returns {string} - 当前日期的MySQL格式字符串
 */
function getCurrentDate() {
  return formatDateOnly(new Date());
}

/**
 * 将日期对象格式化为用户友好的显示格式 (YYYY年MM月DD日)
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串
 */
function formatDateForDisplay(date) {
  if (!date) return '';
  
  // 如果传入的是字符串日期，转换为Date对象
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}年${month}月${day}日`;
}

/**
 * 计算两个日期之间的天数差
 * @param {Date} date1 - 第一个日期
 * @param {Date} date2 - 第二个日期
 * @returns {number} - 天数差
 */
function daysBetween(date1, date2) {
  // 确保传入的是Date对象
  if (typeof date1 === 'string') date1 = new Date(date1);
  if (typeof date2 === 'string') date2 = new Date(date2);
  
  // 转换为UTC时间戳，并计算天数差
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

module.exports = {
  formatDate,
  formatDateOnly,
  getCurrentDateTime,
  getCurrentDate,
  formatDateForDisplay,
  daysBetween
}; 