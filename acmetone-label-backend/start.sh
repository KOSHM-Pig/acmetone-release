#!/bin/bash

echo "启动 Acmetone 标签后端服务..."
echo

# 检查是否安装了依赖
if [ ! -d node_modules ]; then
    echo "正在安装依赖..."
    npm install
fi

# 启动服务
echo "正在启动开发模式服务器..."
npm run dev
