const axios = require('axios');

/**
 * Looks up the geographical location of an IP address.
 * @param {string} ip The IP address to look up.
 * @returns {Promise<string>} A string describing the location, e.g., "国家 省份 城市".
 */
async function lookupIp(ip) {
  // Ignore private IPs and localhost
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return '本地或私有地址';
  }
  
  try {
    // Using a free IP lookup API with Chinese language support
    const response = await axios.get(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,message,country,regionName,city`);
    
    if (response.data.status === 'success') {
      const { country, regionName, city } = response.data;
      return `${country || ''} ${regionName || ''} ${city || ''}`.trim();
    }
    
    console.warn(`IP lookup warning for ${ip}: ${response.data.message}`);
    return '地区未知';
  } catch (error) {
    console.error(`IP lookup failed for ${ip}:`, error.message);
    return '地区查询失败';
  }
}

module.exports = { lookupIp }; 