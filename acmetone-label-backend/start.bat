@echo off
echo 启动 Acmetone 标签后端服务...
echo.

REM 检查是否安装了依赖
if not exist node_modules (
    echo 正在安装依赖...
    npm install
)

REM 启动服务
echo 正在启动开发模式服务器...
npm run dev
