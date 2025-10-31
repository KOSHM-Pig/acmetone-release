// 判断亮度，接收颜色值
export function isLightColor(hexOrRgbaColor) {
  let r, g, b;

  if (hexOrRgbaColor.startsWith('#')) {
    const hex = hexOrRgbaColor.length === 4
      ? hexOrRgbaColor.substring(1).split('').map(x => x + x).join('')
      : hexOrRgbaColor.substring(1);

    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (hexOrRgbaColor.startsWith('rgb')) {
    const parts = hexOrRgbaColor.match(/\d+/g).map(Number);
    r = parts[0];
    g = parts[1];
    b = parts[2];
    const alpha = parts.length === 4 ? parts[3] : 1;
    if (alpha && alpha < 0.5) { // 简化处理透明度
      return false;
    }
  } else {
    console.warn('无法识别的颜色格式:', hexOrRgbaColor);
    return false;
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const threshold = 0.55; // 这个阈值可以根据实际效果调整
  return luminance > threshold;
}