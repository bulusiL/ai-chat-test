# AI Chat Assistant 🤖

智能 AI 对话助手，基于 Next.js 16 + TypeScript + Ollama 本地模型 + 知识库

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Ollama](https://img.shields.io/badge/Ollama-Local-green)
![Knowledge](https://img.shields.io/badge/Knowledge-RAG-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

### 核心功能
- 💬 **Ollama 本地模型** - 支持所有 Ollama 模型，完全本地运行
- 🌊 **流式输出** - 实时展示 AI 回复，打字机效果
- 🔍 **联网搜索** - 一键开启联网搜索，获取实时信息
- 📚 **知识库** - 内置图书推荐和学习辅导知识，确保回答准确性
- 💾 **会话管理** - 多会话支持，独立保存对话记录

### 知识库特性
- 📖 **图书推荐** - 小学各年级阅读书目推荐
- 📝 **学习方法** - 语文、数学、英语学习指导
- 🎯 **准确回答** - 基于知识库回答，避免编造信息
- 🛡️ **防幻觉** - 不确定时会明确说明，不会随意回答

### 认证系统
- 🔐 **Token 认证** - 安全的 Token 认证机制
- 📱 **多设备支持** - 一个 Token 可在多个设备上使用
- 👤 **用户隔离** - 每个设备独立的会话和数据

### 用户体验
- 🌙 **深色模式** - 一键切换明暗主题
- 📋 **消息复制** - 一键复制消息内容
- 🎨 **Markdown 渲染** - 完整支持 Markdown 和代码高亮
- 📱 **响应式设计** - 完美适配桌面和移动设备

## 🛠️ 技术栈

### 前端
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS 4

### 后端
- **Runtime**: Node.js
- **AI**: Ollama 本地模型
- **Search**: coze-coding-dev-sdk (联网搜索)
- **Database**: MySQL / PostgreSQL (Supabase)

## 🚀 快速开始

### 1. 环境要求

- Node.js 18+
- Ollama (本地运行)
- MySQL 或 Supabase 数据库

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```env
# Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# 数据库配置
DB_TYPE=mysql  # 或 postgresql
DB_HOST=localhost
DB_PORT=3306   # PostgreSQL 使用 5432
DB_NAME=ai_chat
DB_USER=root
DB_PASSWORD=your_password
```

### 4. 初始化数据库

```bash
# 启动服务后，访问初始化接口
curl -X POST http://localhost:5000/api/admin/init-db
```

### 5. 生成认证 Token

```bash
# 生成单个 Token
curl -X POST http://localhost:5000/api/admin/tokens

# 批量生成 10 个 Token
curl -X POST http://localhost:5000/api/admin/tokens \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'
```

### 6. 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:5000 启动

## 📁 项目结构

```
ai-chat-assistant/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── verify/
│   │   │   │       └── route.ts     # 认证 API
│   │   │   ├── admin/
│   │   │   │   ├── init-db/
│   │   │   │   │   └── route.ts     # 数据库初始化
│   │   │   │   └── tokens/
│   │   │   │       └── route.ts     # Token 管理
│   │   │   ├── sessions/
│   │   │   │   └── route.ts         # 会话管理
│   │   │   ├── messages/
│   │   │   │   └── route.ts         # 消息管理
│   │   │   ├── chat/
│   │   │   │   └── route.ts         # 聊天 API
│   │   │   └── health/
│   │   │       └── route.ts         # 健康检查
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── ChatInterface.tsx        # 主聊天界面
│   │   ├── AuthScreen.tsx           # 认证界面
│   │   └── MarkdownRenderer.tsx     # Markdown 渲染
│   └── lib/
│       ├── ollama.ts                # Ollama 服务
│       ├── db.ts                    # 数据库服务
│       └── utils.ts
├── package.json
└── README.md
```

## 🔌 API 接口

### 认证相关

#### Token 验证
```
POST /api/auth/verify
Body: { "token": "sk_xxx", "machineId": "mc_xxx" }
```

#### 检查认证状态
```
GET /api/auth/verify?machineId=mc_xxx
```

### 聊天相关

#### 流式聊天
```
POST /api/chat
Body: { 
  "message": "你好",
  "history": [...],
  "enableSearch": false
}
```

### 会话管理

#### 获取会话列表
```
GET /api/sessions?machineId=mc_xxx
```

#### 创建新会话
```
POST /api/sessions
Body: { "machineId": "mc_xxx", "title": "新对话" }
```

#### 删除会话
```
DELETE /api/sessions?sessionId=xxx
```

### 管理接口

#### 初始化数据库
```
POST /api/admin/init-db
```

#### 生成 Token
```
POST /api/admin/tokens
Body: { "count": 10 }
```

## 🗄️ 数据库表结构

### Token 表 (auth_tokens)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| token | VARCHAR(255) | 预生成的 Token |
| device_count | INT | 已激活设备数 |
| is_active | BOOLEAN | 是否有效 |
| created_at | TIMESTAMP | 创建时间 |

### 设备表 (devices)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| token | VARCHAR(255) | 使用的 Token |
| machine_id | VARCHAR(255) | 机器码（唯一） |
| device_name | VARCHAR(255) | 设备名称 |
| last_active_at | TIMESTAMP | 最后活跃时间 |
| created_at | TIMESTAMP | 首次激活时间 |

### 会话表 (sessions)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| session_id | VARCHAR(255) | 会话 ID |
| machine_id | VARCHAR(255) | 机器码 |
| title | VARCHAR(255) | 会话标题 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| is_deleted | BOOLEAN | 是否删除 |

### 消息表 (messages)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| session_id | VARCHAR(255) | 会话 ID |
| role | ENUM | 角色 (user/assistant/system) |
| content | TEXT | 消息内容 |
| created_at | TIMESTAMP | 创建时间 |

## 🔧 配置说明

### Ollama 模型配置

支持所有 Ollama 模型，常用模型：

| 模型 | 大小 | 说明 |
|------|------|------|
| qwen2.5:7b | 4.7GB | 推荐，中文友好 |
| llama3.2:3b | 2GB | 轻量级 |
| deepseek-r1:7b | 4.7GB | 推理能力强 |
| codellama:7b | 3.8GB | 代码专用 |

```bash
# 拉取模型
ollama pull qwen2.5:7b
```

### 联网搜索

联网搜索使用 coze-coding-dev-sdk，需要在环境中配置相关凭证。

## 📝 使用流程

1. **启动 Ollama**
   ```bash
   ollama serve
   ```

2. **初始化数据库**
   - 访问 `/api/admin/init-db`

3. **生成 Token**
   - 调用 `/api/admin/tokens` 生成 Token

4. **用户认证**
   - 打开网页，输入 Token
   - 系统自动绑定机器码

5. **开始对话**
   - 创建新会话
   - 开启/关闭联网搜索
   - 发送消息

## 📄 许可证

[MIT License](LICENSE)

---

Made with ❤️ by AI Chat Assistant Team
