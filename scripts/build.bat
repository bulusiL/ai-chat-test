@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 切换到项目目录
cd /d "%~dp0.."

echo ========================================
echo  AI Chat Assistant - 构建项目
echo ========================================
echo.

echo [1/3] 安装依赖...
call pnpm install --prefer-frozen-lockfile
echo.

echo [2/3] 构建 Next.js 项目...
call npx next build
echo.

echo [3/3] 打包服务器...
call npx tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify
echo.

echo ========================================
echo  构建完成！
echo ========================================
