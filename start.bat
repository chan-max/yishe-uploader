@echo off
chcp 65001 >nul
echo ==================================
echo 易社媒体发布系统 - 启动脚本
echo ==================================
echo.

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo ⚠️  检测到未安装依赖，正在自动安装...
    call install.bat
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 安装失败
        pause
        exit /b 1
    )
)

echo 正在启动服务...
echo.
echo 访问地址: http://localhost:7010
echo.
echo 按 Ctrl+C 停止服务
echo ==================================
echo.

start "Yishe Uploader" cmd /k "npm start"

echo.
echo ✅ 服务已启动！
echo.
echo 请在浏览器中访问: http://localhost:7010
echo.
pause
