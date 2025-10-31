/**
 * 中国地区数据
 * 用于歌手Wiki的地区选择
 */

export const regionData = [
  {
    value: 'china',
    label: '中国',
    children: [
      {
        value: 'mainland',
        label: '中国大陆',
        children: [
          { value: '北京', label: '北京' },
          { value: '上海', label: '上海' },
          { value: '广东', label: '广东' },
          { value: '江苏', label: '江苏' },
          { value: '浙江', label: '浙江' },
          { value: '四川', label: '四川' },
          { value: '重庆', label: '重庆' },
          { value: '天津', label: '天津' },
          { value: '福建', label: '福建' },
          { value: '湖南', label: '湖南' },
          { value: '湖北', label: '湖北' },
          { value: '河南', label: '河南' },
          { value: '河北', label: '河北' },
          { value: '山东', label: '山东' },
          { value: '山西', label: '山西' },
          { value: '陕西', label: '陕西' },
          { value: '安徽', label: '安徽' },
          { value: '江西', label: '江西' },
          { value: '黑龙江', label: '黑龙江' },
          { value: '吉林', label: '吉林' },
          { value: '辽宁', label: '辽宁' },
          { value: '内蒙古', label: '内蒙古' },
          { value: '新疆', label: '新疆' },
          { value: '宁夏', label: '宁夏' },
          { value: '甘肃', label: '甘肃' },
          { value: '青海', label: '青海' },
          { value: '西藏', label: '西藏' },
          { value: '云南', label: '云南' },
          { value: '贵州', label: '贵州' },
          { value: '广西', label: '广西' },
          { value: '海南', label: '海南' }
        ]
      },
      {
        value: 'hongkong',
        label: '香港特别行政区',
        children: [
          { value: '香港', label: '香港' }
        ]
      },
      {
        value: 'macao',
        label: '澳门特别行政区',
        children: [
          { value: '澳门', label: '澳门' }
        ]
      },
      {
        value: 'taiwan',
        label: '台湾省',
        children: [
          { value: '台湾', label: '台湾' }
        ]
      }
    ]
  },
  {
    value: 'foreign',
    label: '国外',
    children: [
      {
        value: 'asia',
        label: '亚洲',
        children: [
          { value: '日本', label: '日本' },
          { value: '韩国', label: '韩国' },
          { value: '新加坡', label: '新加坡' },
          { value: '马来西亚', label: '马来西亚' },
          { value: '泰国', label: '泰国' },
          { value: '印度', label: '印度' },
          { value: '其他亚洲国家', label: '其他亚洲国家' }
        ]
      },
      {
        value: 'europe',
        label: '欧洲',
        children: [
          { value: '英国', label: '英国' },
          { value: '法国', label: '法国' },
          { value: '德国', label: '德国' },
          { value: '意大利', label: '意大利' },
          { value: '西班牙', label: '西班牙' },
          { value: '俄罗斯', label: '俄罗斯' },
          { value: '其他欧洲国家', label: '其他欧洲国家' }
        ]
      },
      {
        value: 'america',
        label: '美洲',
        children: [
          { value: '美国', label: '美国' },
          { value: '加拿大', label: '加拿大' },
          { value: '墨西哥', label: '墨西哥' },
          { value: '巴西', label: '巴西' },
          { value: '阿根廷', label: '阿根廷' },
          { value: '其他美洲国家', label: '其他美洲国家' }
        ]
      },
      {
        value: 'oceania',
        label: '大洋洲',
        children: [
          { value: '澳大利亚', label: '澳大利亚' },
          { value: '新西兰', label: '新西兰' },
          { value: '其他大洋洲国家', label: '其他大洋洲国家' }
        ]
      },
      {
        value: 'africa',
        label: '非洲',
        children: [
          { value: '埃及', label: '埃及' },
          { value: '南非', label: '南非' },
          { value: '其他非洲国家', label: '其他非洲国家' }
        ]
      }
    ]
  },
  {
    value: 'unknown',
    label: '未知地区'
  }
];

/**
 * 将级联选择器的值转换为字符串
 * @param {Array} regionArray 级联选择器的值，如 ['china', 'mainland', '北京']
 * @returns {string} 格式化的地区字符串，如 "中国-中国大陆-北京"
 */
export const formatRegion = (regionArray) => {
  if (!regionArray || !Array.isArray(regionArray) || regionArray.length === 0) {
    return '';
  }
  
  // 如果只有一个值且为'unknown'
  if (regionArray.length === 1 && regionArray[0] === 'unknown') {
    return '未知地区';
  }
  
  // 查找对应的标签
  const labels = [];
  let currentLevel = regionData;
  
  for (let i = 0; i < regionArray.length; i++) {
    const value = regionArray[i];
    const found = currentLevel.find(item => item.value === value);
    
    if (found) {
      labels.push(found.label);
      currentLevel = found.children || [];
    } else {
      // 如果找不到对应的值，直接使用原始值
      labels.push(value);
    }
  }
  
  return labels.join('-');
};

/**
 * 将地区字符串解析为级联选择器的值
 * @param {string} regionString 地区字符串，如 "中国-中国大陆-北京" 或 "北京"
 * @returns {Array} 级联选择器的值，如 ['china', 'mainland', '北京']
 */
export const parseRegion = (regionString) => {
  if (!regionString) {
    return [];
  }
  
  // 处理特殊情况
  if (regionString === '未知地区') {
    return ['unknown'];
  }
  
  // 处理简单情况，如只有省份名称
  const parts = regionString.split('-');
  if (parts.length === 1) {
    // 尝试查找省份
    for (const country of regionData) {
      if (country.children) {
        for (const region of country.children) {
          if (region.children) {
            const province = region.children.find(p => p.label === parts[0]);
            if (province) {
              return [country.value, region.value, province.value];
            }
          }
        }
      }
    }
    
    // 如果找不到匹配，返回中国大陆 + 省份名称
    return ['china', 'mainland', parts[0]];
  }
  
  // 处理完整路径
  // 这里简化处理，实际应用中可能需要更复杂的匹配逻辑
  if (parts[0] === '中国') {
    if (parts[1] === '中国大陆') {
      return ['china', 'mainland', parts[2]];
    } else if (parts[1] === '香港特别行政区') {
      return ['china', 'hongkong', '香港'];
    } else if (parts[1] === '澳门特别行政区') {
      return ['china', 'macao', '澳门'];
    } else if (parts[1] === '台湾省') {
      return ['china', 'taiwan', '台湾'];
    }
  } else if (parts[0] === '国外') {
    // 处理国外地区
    const continents = {
      '亚洲': 'asia',
      '欧洲': 'europe',
      '美洲': 'america',
      '大洋洲': 'oceania',
      '非洲': 'africa'
    };
    
    if (continents[parts[1]]) {
      return ['foreign', continents[parts[1]], parts[2]];
    }
  }
  
  // 默认返回空数组
  return [];
};

export default {
  regionData,
  formatRegion,
  parseRegion
}; 