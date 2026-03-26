@echo off
chcp 65001 >nul

:: 切换到项目目录
cd /d "%~dp0.."

echo ========================================
echo  AI Chat Assistant - 安装依赖
echo ========================================
echo.

echo [INFO] 正在安装依赖...
call pnpm install

echo.
echo ========================================
echo  安装完成！
echo ========================================
echo.
echo 下一步:
echo   1. 复制 .env.example 为 .env.local
echo   2. 编辑 .env.local 填写配置
echo   3. 运行 dev.bat 启动开发服务器
echo.
pause
