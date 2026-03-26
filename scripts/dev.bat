@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 设置端口
set PORT=5000

:: 切换到项目目录
cd /d "%~dp0.."

echo ========================================
echo  AI Chat Assistant - 开发模式启动
echo ========================================
echo.

:: 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [INFO] 正在安装依赖...
    call pnpm install
    echo.
)

:: 检查 .env.local 是否存在
if not exist ".env.local" (
    echo [WARN] .env.local 文件不存在，请先配置环境变量
    echo [INFO] 可以复制 .env.example 为 .env.local 并填写配置
    echo.
)

echo [INFO] 启动开发服务器 (端口: %PORT%)...
echo [INFO] 访问地址: http://localhost:%PORT%
echo.

:: 设置环境变量并启动服务
set PORT=5000
npx tsx watch src/server.ts
