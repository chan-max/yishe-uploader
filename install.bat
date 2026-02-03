@echo off
chcp 65001 >nul
echo ==================================
echo Yishe Uploader - 安装向导
echo ==================================
echo.

REM 检查 Node.js
echo 检查 Node.js 版本...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js 18.0.0 或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%
echo.

REM 检查 npm
echo 检查 npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未检测到 npm
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✅ npm 版本: %NPM_VERSION%
echo.

REM 安装依赖（前后端共用）
echo ==================================
echo 安装依赖...
echo ==================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成
echo.

REM 创建必要的目录
echo ==================================
echo 创建必要的目录...
echo ==================================
if not exist "auth-data" mkdir auth-data
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs
echo ✅ 目录创建完成
echo.

REM 安装 Playwright 浏览器
echo ==================================
echo 安装 Playwright 浏览器...
echo ==================================
call npx playwright install chromium
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Playwright 浏览器安装失败，但可以继续使用本地 Chrome
)
echo.

REM 完成
echo ==================================
echo ✅ 安装完成！
echo ==================================
echo.
echo 快速开始：
echo 1. 启动服务: npm start
echo 2. 访问系统: http://localhost:7010
echo.
echo 详细文档：
echo - 快速开始: QUICK_START.md
echo - 完整文档: README.md
echo - 迁移指南: MIGRATION_GUIDE.md
echo.
echo 祝你使用愉快！🎉
echo.
pause
