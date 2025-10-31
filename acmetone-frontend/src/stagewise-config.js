// stagewise-config.js
// Stagewise工具栏配置文件

// 检测是否为开发环境
const isDev = () => {
  try {
    // 检查当前URL是否包含开发服务器的端口或主机名
    return window.location.host.includes('localhost') || 
           window.location.host.includes('127.0.0.1') || 
           window.location.port.match(/\d{4,5}/);
  } catch (e) {
    return false;
  }
};

const stagewiseConfig = {
  name: 'acmetone-frontend-plugin',
  description: '为Acmetone极音记前端提供额外的组件上下文',
  shortInfoForPrompt: () => {
    // 这里返回关于当前页面或组件的额外信息
    return "Acmetone极音记是一个音乐专辑管理平台，使用Vue 3、Element Plus和Pinia构建";
  },
  actions: [
    {
      name: '查看组件结构',
      description: '显示当前选中元素的组件结构',
      execute: (element) => {
        console.log('当前选中元素:', element);
        alert(`已选中元素: ${element.tagName}\n类名: ${element.className}`);
      },
    },
  ],
  // 添加其他配置选项
  options: {
    logLevel: 'info',
    projectName: 'Acmetone极音记',
    projectDescription: '音乐专辑管理和发行平台',
    enabled: true // 仅在开发环境中启用
  }
};

export default stagewiseConfig; 