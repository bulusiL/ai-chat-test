import type { Metadata, Viewport } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AI Chat - 智能学习助手',
    template: '%s | AI Chat',
  },
  description: '面向中国中小学生的智能 AI 学习助手，支持图书推荐、学习方法指导、联网搜索等功能。',
  keywords: [
    'AI 助手',
    '学习助手',
    '图书推荐',
    '中小学生',
    '智能对话',
    'Ollama',
  ],
  authors: [{ name: 'AI Chat Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
