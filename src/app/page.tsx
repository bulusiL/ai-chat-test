import type { Metadata } from 'next';
import ChatInterface from '@/components/ChatInterface';

export const metadata: Metadata = {
  title: 'AI Chat Assistant - 智能对话助手',
  description: '基于 AI 的智能对话助手，支持实时流式对话',
};

export default function Home() {
  return <ChatInterface />;
}
