/**
 * 创建交互式背景
 * 一个随鼠标移动产生交互效果的背景
 */
export function initInteractiveBackground(containerId) {
  // 获取容器元素
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('初始化背景失败: 找不到容器元素', containerId);
    return () => {}; // 返回空函数以避免错误
  }

  // 检查是否已存在canvas，避免重复创建
  const existingCanvas = container.querySelector('canvas[data-interactive-bg="true"]');
  if (existingCanvas) {
    
    container.removeChild(existingCanvas);
  }

  // 创建画布
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-interactive-bg', 'true');
  const ctx = canvas.getContext('2d');
  
  // 设置样式
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '-1';
  canvas.style.opacity = '0.8';
  canvas.style.pointerEvents = 'none'; // 确保点击事件穿透到下方元素
  
  // 将画布添加到容器
  container.style.position = 'relative';
  container.appendChild(canvas);

  // 确保canvas尺寸设置正确
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  
  // 增强的粒子配置
  const PARTICLE_COUNT = 750; // 大幅增加粒子数量
  const PARTICLE_BASE_RADIUS = 1.2; // 稍微减小基础半径
  const PARTICLE_ADDITIONAL_RADIUS = 1.6; // 调整额外半径
  const PARTICLE_BASE_SPEED = 0.3; // 大幅降低基础速度
  const PARTICLE_COLORS = ['#5e7eb6', '#6688c3', '#a2b3d1', '#3a5a8d', '#425981', '#7a99d0', '#d4dded'];
  const CONNECTION_DISTANCE = 100; // 减少连接距离以避免过多连线
  const CONNECTION_WIDTH = 0.5; // 减小线宽
  const MOUSE_REPEL_RADIUS = 80; // 鼠标排斥半径
  const MOUSE_REPEL_STRENGTH = 20; // 降低鼠标排斥力度
  const MOUSE_ATTRACT_RADIUS = 200; // 鼠标吸引半径
  const MOUSE_ATTRACT_STRENGTH = 1.5; // 降低鼠标吸引力度
  
  // 鼠标追踪效果
  const TRAIL_POINTS = 8; // 鼠标轨迹点数
  const trailPositions = Array(TRAIL_POINTS).fill().map(() => ({ x: 0, y: 0 }));
  
  let mousePosition = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };
  
  let lastMousePosition = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  // 用于控制动画循环的状态
  let isAnimating = true;
  let animationFrameId = null;
  let lastTimestamp = 0;
  
  // 跟踪鼠标位置
  const mouseMoveHandler = (e) => {
    // 获取容器的位置信息
    const containerRect = container.getBoundingClientRect();
    
    // 计算鼠标在容器内的相对位置
    if (
      e.clientX >= containerRect.left && 
      e.clientX <= containerRect.right && 
      e.clientY >= containerRect.top && 
      e.clientY <= containerRect.bottom
    ) {
      lastMousePosition.x = mousePosition.x;
      lastMousePosition.y = mousePosition.y;
      
      // 使用偏移量计算正确的相对位置
      mousePosition.x = e.clientX - containerRect.left;
      mousePosition.y = e.clientY - containerRect.top;
      
      // 更新轨迹点
      trailPositions.pop();
      trailPositions.unshift({ x: mousePosition.x, y: mousePosition.y });
    }
  };
  
  // 添加鼠标进入容器事件，立即更新鼠标位置
  const mouseEnterHandler = (e) => {
    const containerRect = container.getBoundingClientRect();
    
    // 重置鼠标位置和轨迹
    mousePosition.x = e.clientX - containerRect.left;
    mousePosition.y = e.clientY - containerRect.top;
    lastMousePosition.x = mousePosition.x;
    lastMousePosition.y = mousePosition.y;
    
    // 清空轨迹点
    for (let i = 0; i < trailPositions.length; i++) {
      trailPositions[i] = { x: mousePosition.x, y: mousePosition.y };
    }
  };

  // 页面可见性变化处理
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // 页面不可见时暂停动画
      isAnimating = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    } else {
      // 页面可见时恢复动画
      if (!isAnimating) {
        isAnimating = true;
        lastTimestamp = performance.now();
        animationFrameId = requestAnimationFrame(animate);
      }
    }
  };

  // 窗口获取/失去焦点处理
  const handleFocusChange = (focused) => {
    if (!focused) {
      // 失去焦点时暂停动画
      isAnimating = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    } else {
      // 获取焦点时恢复动画
      if (!isAnimating) {
        isAnimating = true;
        lastTimestamp = performance.now();
        animationFrameId = requestAnimationFrame(animate);
      }
    }
  };
  
  document.addEventListener('mousemove', mouseMoveHandler);
  container.addEventListener('mouseenter', mouseEnterHandler);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', () => handleFocusChange(true));
  window.addEventListener('blur', () => handleFocusChange(false));
  
  // 初始化
  function initMousePosition() {
    // 重置鼠标位置到容器中心
    const { width, height } = container.getBoundingClientRect();
    mousePosition.x = width / 2;
    mousePosition.y = height / 2;
    lastMousePosition.x = mousePosition.x;
    lastMousePosition.y = mousePosition.y;
    
    // 重置轨迹
    for (let i = 0; i < trailPositions.length; i++) {
      trailPositions[i] = { x: mousePosition.x, y: mousePosition.y };
    }
  }
  
  // 更增强的粒子类
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = Math.random() * PARTICLE_BASE_SPEED * 2 - PARTICLE_BASE_SPEED;
      this.vy = Math.random() * PARTICLE_BASE_SPEED * 2 - PARTICLE_BASE_SPEED;
      this.radius = PARTICLE_BASE_RADIUS + Math.random() * PARTICLE_ADDITIONAL_RADIUS;
      this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      this.originalRadius = this.radius;
      this.targetRadius = this.radius;
      this.glowing = false;
      this.glowIntensity = 0;
      this.maxGlowIntensity = 0.5 + Math.random() * 0.5; // 随机光晕强度
      
      // 为粒子添加自主运动特性
      this.angle = Math.random() * Math.PI * 2; // 随机初始角度
      this.angleSpeed = (Math.random() * 0.01 - 0.005) * PARTICLE_BASE_SPEED; // 减小角速度
      this.oscillationAmplitude = Math.random() * 0.3 + 0.1; // 减小振幅
      this.oscillationPeriod = Math.random() * 300 + 100; // 增加周期，使运动更缓慢
      this.oscillationOffset = Math.random() * 100; // 偏移量
      this.lastUpdate = Date.now();
    }
    
    update() {
      const now = Date.now();
      const delta = (now - this.lastUpdate) / 16; // 归一化为约60fps的速率
      this.lastUpdate = now;
      
      // 自然运动 - 增加自主运动效果
      // 1. 角度变化导致方向变化
      this.angle += this.angleSpeed * delta;
      
      // 2. 添加正弦波动让粒子产生有机的运动
      const time = now / this.oscillationPeriod + this.oscillationOffset;
      const oscillationX = Math.sin(time) * this.oscillationAmplitude * delta * 0.05;
      const oscillationY = Math.cos(time * 0.7) * this.oscillationAmplitude * delta * 0.05;
      
      // 3. 基础速度 + 方向变化 + 波动效果
      this.vx += oscillationX + Math.cos(this.angle) * 0.005 * delta;
      this.vy += oscillationY + Math.sin(this.angle) * 0.005 * delta;
      
      // 基础移动
      this.x += this.vx * delta;
      this.y += this.vy * delta;
      
      // 边界检查 - 让粒子在边界处平滑反弹
      if (this.x < 0) {
        this.x = 0;
        this.vx = Math.abs(this.vx) * 0.8;
        this.angle = Math.PI - this.angle;
      } else if (this.x > canvas.width) {
        this.x = canvas.width;
        this.vx = -Math.abs(this.vx) * 0.8;
        this.angle = Math.PI - this.angle;
      }
      
      if (this.y < 0) {
        this.y = 0;
        this.vy = Math.abs(this.vy) * 0.8;
        this.angle = -this.angle;
      } else if (this.y > canvas.height) {
        this.y = canvas.height;
        this.vy = -Math.abs(this.vy) * 0.8;
        this.angle = -this.angle;
      }
      
      // 与鼠标交互
      const dx = this.x - mousePosition.x;
      const dy = this.y - mousePosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 在鼠标附近有更强的反应
      if (distance < MOUSE_REPEL_RADIUS) {
        // 排斥效果 - 远离鼠标
        const force = (MOUSE_REPEL_RADIUS - distance) / MOUSE_REPEL_RADIUS;
        const angle = Math.atan2(dy, dx);
        this.vx += Math.cos(angle) * force * MOUSE_REPEL_STRENGTH * 0.05 * delta;
        this.vy += Math.sin(angle) * force * MOUSE_REPEL_STRENGTH * 0.05 * delta;
        
        // 在鼠标附近放大粒子并发光
        this.targetRadius = this.originalRadius * 2;
        this.glowing = true;
      } else if (distance < MOUSE_ATTRACT_RADIUS) {
        // 吸引效果 - 朝向鼠标
        const force = (MOUSE_ATTRACT_RADIUS - distance) / MOUSE_ATTRACT_RADIUS;
        const angle = Math.atan2(dy, dx);
        this.vx -= Math.cos(angle) * force * MOUSE_ATTRACT_STRENGTH * 0.01 * delta;
        this.vy -= Math.sin(angle) * force * MOUSE_ATTRACT_STRENGTH * 0.01 * delta;
        
        // 轻微放大
        this.targetRadius = this.originalRadius * 1.5;
        this.glowing = true;
      } else {
        this.targetRadius = this.originalRadius;
        this.glowing = false;
      }
      
      // 平滑过渡到目标半径
      this.radius += (this.targetRadius - this.radius) * 0.1 * delta;
      
      // 控制发光效果
      if (this.glowing) {
        this.glowIntensity = Math.min(this.maxGlowIntensity, this.glowIntensity + 0.05 * delta);
      } else {
        this.glowIntensity = Math.max(0, this.glowIntensity - 0.02 * delta);
      }
      
      // 速度限制 - 确保粒子不会太快
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > 3) {
        this.vx = (this.vx / speed) * 3;
        this.vy = (this.vy / speed) * 3;
      }
      
      // 阻尼效果 - 减缓速度，但不要完全停下来
      this.vx *= Math.pow(0.97, delta);
      this.vy *= Math.pow(0.97, delta);
      
      // 确保粒子始终有最小速度，保持运动
      const minSpeed = 0.1 * PARTICLE_BASE_SPEED;
      const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (currentSpeed < minSpeed) {
        const factor = minSpeed / (currentSpeed || 0.1); // 避免除以零
        this.vx *= factor;
        this.vy *= factor;
      }
    }
    
    draw() {
      // 确保半径是正数
      const safeRadius = Math.max(0.1, this.radius);
      
      // 绘制发光效果
      if (this.glowIntensity > 0) {
        const innerRadius = Math.max(0.1, safeRadius * 0.5);
        const outerRadius = Math.max(0.5, safeRadius * 3);
        
        try {
          const glow = ctx.createRadialGradient(
            this.x, this.y, innerRadius,
            this.x, this.y, outerRadius
          );
          glow.addColorStop(0, `rgba(94, 126, 182, ${this.glowIntensity})`);
          glow.addColorStop(1, 'rgba(94, 126, 182, 0)');
          
          ctx.beginPath();
          ctx.arc(this.x, this.y, outerRadius, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        } catch (error) {
          // 忽略渐变创建错误
          console.debug('渐变创建错误:', error);
        }
      }
      
      // 绘制粒子 - 确保使用正数半径
      ctx.beginPath();
      // 使用Math.abs确保半径始终为正数
      const radius = Math.abs(safeRadius);
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }
  
  let particles = [];
  
  // 创建粒子
  function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
  }
  
  // 调整画布大小
  function resizeCanvas() {
    if (!container || !canvas) return;
    
    const { width, height } = container.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    
    // 当画布尺寸改变时，重新创建粒子
    createParticles();
  }
  
  // 绘制增强的连接线
  function drawConnections() {
    ctx.lineWidth = CONNECTION_WIDTH;
    
    for (let i = 0; i < particles.length; i++) {
      // 优化: 只连接部分粒子，降低计算量
      if (i % 2 === 0) {
        for (let j = i + 1; j < particles.length; j += 2) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < CONNECTION_DISTANCE) {
            // 设置线的透明度，距离越远越透明
            const opacity = 1 - (distance / CONNECTION_DISTANCE);
            ctx.strokeStyle = `rgba(94, 126, 182, ${opacity * 0.6})`;
            
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }
  }
  
  // 绘制鼠标轨迹
  function drawMouseTrail() {
    // 检查鼠标轨迹是否有效
    const hasValidTrail = trailPositions.some(pos => pos.x !== 0 || pos.y !== 0);
    if (!hasValidTrail) return;

    // 检查鼠标是否移动过
    if (mousePosition.x === lastMousePosition.x && mousePosition.y === lastMousePosition.y) {
      // 只绘制光晕效果
      const glow = ctx.createRadialGradient(
        mousePosition.x, mousePosition.y, 0,
        mousePosition.x, mousePosition.y, 40
      );
      glow.addColorStop(0, 'rgba(94, 126, 182, 0.2)');
      glow.addColorStop(1, 'rgba(94, 126, 182, 0)');
      
      ctx.beginPath();
      ctx.arc(mousePosition.x, mousePosition.y, 40, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      return;
    }
    
    // 绘制鼠标轨迹
    ctx.beginPath();
    ctx.moveTo(trailPositions[0].x, trailPositions[0].y);
    
    for (let i = 1; i < trailPositions.length; i++) {
      const point = trailPositions[i];
      const prevPoint = trailPositions[i-1];
      
      // 如果点无效（初始状态）则跳过
      if ((point.x === 0 && point.y === 0) || (prevPoint.x === 0 && prevPoint.y === 0)) continue;
      
      ctx.strokeStyle = `rgba(94, 126, 182, ${1 - i / TRAIL_POINTS})`;
      ctx.lineWidth = 4 * (1 - i / TRAIL_POINTS);
      
      // 绘制轨迹线
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      
      // 轨迹点
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3 * (1 - i / TRAIL_POINTS), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(94, 126, 182, ${0.5 - i / TRAIL_POINTS * 0.5})`;
      ctx.fill();
    }
    
    // 在鼠标位置绘制光晕
    const glow = ctx.createRadialGradient(
      mousePosition.x, mousePosition.y, 0,
      mousePosition.x, mousePosition.y, 40
    );
    glow.addColorStop(0, 'rgba(94, 126, 182, 0.3)');
    glow.addColorStop(1, 'rgba(94, 126, 182, 0)');
    
    ctx.beginPath();
    ctx.arc(mousePosition.x, mousePosition.y, 40, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }
  
  // 动画循环
  function animate(timestamp) {
    if (!isAnimating || !ctx) return;
    
    // 计算帧间隔时间，用于平滑动画
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制鼠标轨迹
    drawMouseTrail();
    
    // 绘制连接线
    drawConnections();
    
    // 更新和绘制粒子
    for (let particle of particles) {
      particle.update();
      particle.draw();
    }
    
    animationFrameId = requestAnimationFrame(animate);
  }
  
  // 监听窗口大小变化
  window.addEventListener('resize', resizeCanvas);
  
  // 初始化
  resizeCanvas();
  initMousePosition(); // 初始化鼠标位置
  lastTimestamp = performance.now();
  animationFrameId = requestAnimationFrame(animate);
  
  // 返回清理函数
  return () => {
    isAnimating = false; // 停止动画循环
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    window.removeEventListener('resize', resizeCanvas);
    document.removeEventListener('mousemove', mouseMoveHandler);
    container.removeEventListener('mouseenter', mouseEnterHandler);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', () => handleFocusChange(true));
    window.removeEventListener('blur', () => handleFocusChange(false));
    if (container && container.contains(canvas)) {
      container.removeChild(canvas);
    }
  };
}