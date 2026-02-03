#!/bin/bash

# Yishe Uploader - 安装脚本

echo "=================================="
echo "Yishe Uploader - 安装向导"
echo "=================================="
echo ""

# 检查 Node.js
echo "检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 18.0.0 或更高版本"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，当前版本: $(node -v)"
    echo "请升级到 Node.js 18.0.0 或更高版本"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 检查 npm
echo "检查 npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ 未检测到 npm"
    exit 1
fi
echo "✅ npm 版本: $(npm -v)"
echo ""

# 安装依赖（前后端共用）
echo "=================================="
echo "安装依赖..."
echo "=================================="
npm install
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi
echo "✅ 依赖安装完成"
echo ""

# 创建必要的目录
echo "=================================="
echo "创建必要的目录..."
echo "=================================="
mkdir -p auth-data
mkdir -p temp
mkdir -p logs
echo "✅ 目录创建完成"
echo ""

# 安装 Playwright 浏览器
echo "=================================="
echo "安装 Playwright 浏览器..."
echo "=================================="
npx playwright install chromium
if [ $? -ne 0 ]; then
    echo "⚠️  Playwright 浏览器安装失败，但可以继续使用本地 Chrome"
fi
echo ""

# 完成
echo "=================================="
echo "✅ 安装完成！"
echo "=================================="
echo ""
echo "快速开始："
echo "1. 启动服务: npm start"
echo "2. 访问系统: http://localhost:7010"
echo ""
echo "详细文档："
echo "- 快速开始: QUICK_START.md"
echo "- 完整文档: README.md"
echo "- 迁移指南: MIGRATION_GUIDE.md"
echo ""
echo "祝你使用愉快！🎉"
