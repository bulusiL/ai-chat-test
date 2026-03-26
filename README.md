# AI Chat Assistant 🤖

智能 AI 对话助手，基于 Next.js 16 + TypeScript + AI 大模型

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

### 核心功能
- 💬 **智能对话** - 接入 AI 大模型 (doubao-seed-1-8-251228)，支持自然语言对话
- 🌊 **流式输出** - 实时展示 AI 回复，打字机效果
- 💾 **历史记录** - 自动保存最近 50 条消息，支持会话恢复
- 🔄 **多轮对话** - 完整的上下文管理，支持连续对话

### 用户体验
- 🌙 **深色模式** - 一键切换明暗主题，自动保存偏好
- 📋 **消息复制** - 一键复制消息内容到剪贴板
- 🔄 **重新生成** - 对 AI 回复不满意？一键重新生成
- 🗑️ **消息删除** - 支持删除单条消息

### Markdown 支持
- ✅ **Markdown 渲染** - 完整支持 Markdown 语法
- ✅ **代码高亮** - 自动识别编程语言并高亮显示
- ✅ **代码复制** - 一键复制代码块
- ✅ **GFM 支持** - GitHub Flavored Markdown 完全兼容

## 🛠️ 技术栈

### 前端
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Markdown**: react-markdown + remark-gfm + rehype-highlight

### 后端
- **Runtime**: Node.js
- **AI SDK**: coze-coding-dev-sdk
- **API**: Next.js API Routes (SSE)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:5000 启动

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 📁 项目结构

```
ai-chat-assistant/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts        # 聊天 API
│   │   │   └── health/
│   │   │       └── route.ts        # 健康检查 API
│   │   ├── layout.tsx               # 根布局
│   │   ├── page.tsx                 # 首页
│   │   └── globals.css              # 全局样式
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 组件
│   │   ├── ChatInterface.tsx        # 聊天界面组件
│   │   └── MarkdownRenderer.tsx     # Markdown 渲染组件
│   └── lib/
│       └── utils.ts                 # 工具函数
├── public/                          # 静态资源
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API 接口

### 流式聊天

- **URL**: `/api/chat`
- **Method**: `POST`
- **Body**: 
  ```json
  {
    "message": "你好",
    "history": [
      { "role": "user", "content": "之前的问题" },
      { "role": "assistant", "content": "之前的回答" }
    ]
  }
  ```
- **Response**: Server-Sent Events (SSE)
  ```
  data: {"content":"你"}
  data: {"content":"好"}
  data: [DONE]
  ```

### 健康检查

- **URL**: `/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "message": "AI 服务连接正常",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

## 🎨 功能详解

### 1. 流式输出
使用 Server-Sent Events (SSE) 实现实时流式输出，用户可以看到 AI 逐字生成回复，提供更好的交互体验。

### 2. Markdown 渲染
- 支持完整的 Markdown 语法
- 自动识别编程语言并应用语法高亮
- 代码块支持一键复制
- 支持 GitHub Flavored Markdown (GFM)

### 3. 深色模式
- 一键切换明暗主题
- 自动保存用户偏好到本地存储
- 跟随系统主题自动适配

### 4. 消息管理
- 复制：一键复制消息内容
- 重新生成：对 AI 回复不满意时重新生成
- 删除：删除单条消息
- 清空：清空所有聊天记录

### 5. 多轮对话
- 自动管理对话上下文
- 支持连续对话
- 智能历史记录管理

## 🔧 配置说明

### 环境变量

项目使用 `coze-coding-dev-sdk`，API 凭证会自动从环境变量加载，无需手动配置。

### 自定义配置

如需自定义 AI 模型参数，可修改 `src/app/api/chat/route.ts`：

```typescript
const llmStream = client.stream(messages, {
  model: 'doubao-seed-1-8-251228',  // 模型选择
  temperature: 0.7,                  // 温度参数 (0-2)
});
```

### 可用模型

| 模型 | 描述 |
|------|------|
| `doubao-seed-1-8-251228` | 多模态 Agent 优化模型 (默认) |
| `doubao-seed-2-0-pro-260215` | 旗舰模型，复杂推理 |
| `doubao-seed-2-0-lite-260215` | 平衡性能和成本 |
| `deepseek-v3-2-251201` | DeepSeek V3.2 模型 |
| `kimi-k2-5-260127` | Kimi 最强模型 |

## 📝 开发说明

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件采用函数式写法 + Hooks

### 提交规范

遵循 Conventional Commits 规范：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

## 🚢 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 自动部署完成

### Docker 部署

```bash
# 构建镜像
docker build -t ai-chat-assistant .

# 运行容器
docker run -p 5000:5000 ai-chat-assistant
```

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [react-markdown](https://github.com/remarkjs/react-markdown)

---

Made with ❤️ by AI Chat Assistant Team
