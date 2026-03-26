# Windows 使用指南

## 📋 前置要求

1. **安装 Node.js** (v20+)
   - 下载地址: https://nodejs.org/
   - 推荐使用 LTS 版本

2. **安装 pnpm**
   ```powershell
   npm install -g pnpm
   ```

3. **安装 Ollama**
   - 下载地址: https://ollama.com/download
   - 安装后拉取模型: `ollama pull qwen2.5:7b`

4. **安装数据库** (可选，默认使用 SQLite)
   - PostgreSQL: https://www.postgresql.org/download/windows/
   - MySQL: https://dev.mysql.com/downloads/mysql/

## 🚀 快速启动

### 方式一：使用批处理脚本

```powershell
# 1. 安装依赖
.\scripts\install.bat

# 2. 配置环境变量
copy .env.example .env.local
# 编辑 .env.local 填写配置

# 3. 启动开发服务器
.\scripts\dev.bat
```

### 方式二：使用 npm scripts

```powershell
# 安装依赖
pnpm install

# 配置环境变量
copy .env.example .env.local
# 编辑 .env.local 填写配置

# 启动开发服务器
pnpm dev:win

# 构建生产版本
pnpm build:win

# 启动生产服务器
pnpm start:win
```

## 📁 环境变量配置

复制 `.env.example` 为 `.env.local` 并修改：

```env
# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# 数据库配置 (如果不配置，使用内存存储)
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_chat
DB_USER=postgres
DB_PASSWORD=your_password
```

## 🔧 可用脚本

| 脚本 | 说明 | Windows 命令 |
|------|------|-------------|
| install | 安装依赖 | `.\scripts\install.bat` |
| dev | 开发模式 | `.\scripts\dev.bat` 或 `pnpm dev:win` |
| build | 构建项目 | `.\scripts\build.bat` 或 `pnpm build:win` |
| start | 生产模式 | `.\scripts\start.bat` 或 `pnpm start:win` |

## ⚠️ 注意事项

1. **PowerShell 执行策略**
   如果无法运行 `.bat` 文件，可能需要调整执行策略：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **端口占用**
   确保 5000 端口没有被其他程序占用

3. **Ollama 服务**
   确保 Ollama 服务已启动：
   ```powershell
   ollama serve
   ```

## 🌐 访问地址

启动后访问: http://localhost:5000

## 🆘 常见问题

### Q: pnpm install 报错？
A: 确保已全局安装 pnpm: `npm install -g pnpm`

### Q: Ollama 连接失败？
A: 
1. 确认 Ollama 已安装并运行
2. 检查 OLLAMA_BASE_URL 配置是否正确
3. 尝试在浏览器访问 http://localhost:11434

### Q: 数据库连接失败？
A:
1. 确认数据库服务已启动
2. 检查 .env.local 中的数据库配置
3. 确认数据库已创建
