# AI Chat Assistant 🤖

智能 AI 对话助手，基于 Next.js 16 + TypeScript + AI 大模型

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

- 💬 **智能对话** - 接入 AI 大模型，支持自然语言对话
- 🌊 **流式输出** - 实时展示 AI 回复，打字机效果
- 💾 **历史记录** - 自动保存聊天历史，支持会话恢复
- 🎨 **现代 UI** - 基于 shadcn/ui 的美观界面
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🔄 **实时状态** - 显示连接状态和加载状态

## 🛠️ 技术栈

### 前端
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React

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
│   │   └── ChatInterface.tsx        # 聊天界面组件
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

## 🎨 功能亮点

### 1. 流式输出
使用 Server-Sent Events (SSE) 实现实时流式输出，用户可以看到 AI 逐字生成回复，提供更好的交互体验。

### 2. 历史记录
- 自动保存最近 50 条聊天记录到浏览器本地存储
- 页面刷新后自动恢复历史对话
- 支持清空聊天记录

### 3. 响应式设计
- 桌面端和移动端完美适配
- 流畅的动画效果
- 深色模式支持（跟随系统）

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

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

Made with ❤️ by AI Chat Assistant Team
