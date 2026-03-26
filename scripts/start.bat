@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 设置端口
set PORT=5000

:: 切换到项目目录
cd /d "%~dp0.."

echo ========================================
echo  AI Chat Assistant - 生产模式启动
echo ========================================
echo.

:: 检查 dist 目录是否存在
if not exist "dist\server.js" (
    echo [ERROR] 未找到构建产物，请先运行 build.bat
    pause
    exit /b 1
)

echo [INFO] 启动生产服务器 (端口: %PORT%)...
echo [INFO] 访问地址: http://localhost:%PORT%
echo.

:: 启动服务
set PORT=5000
node dist\server.js
