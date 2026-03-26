'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Moon,
  Sun,
  Copy,
  Check,
  RefreshCw,
  Trash2
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

// 消息类型定义
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化深色模式
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedMode ? savedMode === 'true' : prefersDark;
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // 切换深色模式
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  // 从 localStorage 加载历史记录
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // 只恢复最近 50 条消息
        const recentMessages = parsed.slice(-50).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(recentMessages);
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, []);

  // 保存历史记录到 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      // 只保存最近 50 条消息
      const toSave = messages.slice(-50).map(m => ({
        ...m,
        isStreaming: false
      }));
      localStorage.setItem('chatHistory', JSON.stringify(toSave));
    }
  }, [messages]);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 检查健康状态
  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setIsConnected(data.status === 'ok');
    } catch (err) {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // 每30秒检查一次健康状态
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息的核心逻辑
  const sendMessageToAI = useCallback(async (
    messageText: string, 
    history: Message[],
    targetMessageId: string
  ) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageText,
          history: history.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // 流式传输完成
              setMessages(prev => 
                prev.map(m => 
                  m.id === targetMessageId 
                    ? { ...m, isStreaming: false } 
                    : m
                )
              );
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === targetMessageId 
                      ? { ...m, content: fullContent } 
                      : m
                  )
                );
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // 忽略解析错误，继续处理
              if (e instanceof SyntaxError) {
                continue;
              }
              throw e;
            }
          }
        }
      }
      
      return fullContent;
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : '发生未知错误';
      
      // 更新 AI 消息为错误状态
      setMessages(prev => 
        prev.map(m => 
          m.id === targetMessageId 
            ? { ...m, content: `错误: ${errorMessage}`, isStreaming: false } 
            : m
        )
      );
      
      throw err;
    }
  }, []);

  // 发送消息
  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    setError(null);
    setInputValue('');
    setIsLoading(true);

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // 添加 AI 消息占位
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      await sendMessageToAI(message, messages, aiMessageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // 重新生成消息
  const regenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;

    const previousUserMessage = messages[messageIndex - 1];
    if (previousUserMessage.role !== 'user') return;

    setIsLoading(true);
    setError(null);

    // 更新消息为重新生成状态
    setMessages(prev => 
      prev.map(m => 
        m.id === messageId 
          ? { ...m, content: '', isStreaming: true } 
          : m
      )
    );

    try {
      const historyBeforeMessage = messages.slice(0, messageIndex - 1);
      await sendMessageToAI(previousUserMessage.content, historyBeforeMessage, messageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 复制消息
  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 清空聊天记录
  const clearMessages = () => {
    setMessages([]);
    setError(null);
    localStorage.removeItem('chatHistory');
  };

  // 删除单条消息
  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-950 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      {/* 头部 */}
      <div className={`flex items-center justify-between px-6 py-4 border-b shadow-sm ${
        isDarkMode 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              AI Chat Assistant
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              智能对话助手
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            variant={isConnected ? "default" : "secondary"}
            className={isConnected 
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
            }
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                已连接
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                未连接
              </>
            )}
          </Badge>
          
          {/* 深色模式切换 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className={`${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearMessages}
              className={`${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </Button>
          )}
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">开始与 AI 对话吧</p>
            <p className="text-sm">输入消息，AI 将实时回复</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                    <Bot className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${
                  message.role === 'user' ? 'order-first' : ''
                }`}>
                  <Card className={`${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                      : isDarkMode 
                        ? 'bg-slate-800 border-slate-700' 
                        : 'bg-white border-slate-200'
                  }`}>
                    <div className={`px-4 py-3 ${
                      message.role === 'user' 
                        ? 'text-white prose-invert' 
                        : isDarkMode 
                          ? 'text-slate-200' 
                          : 'text-slate-800'
                    }`}>
                      {message.role === 'user' ? (
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      ) : (
                        <div>
                          {message.content ? (
                            <MarkdownRenderer content={message.content} />
                          ) : null}
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                  
                  {/* 消息操作按钮 */}
                  <div className={`flex gap-1 mt-1 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    {/* 复制按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMessage(message.id, message.content)}
                      className="h-6 px-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </>
                      )}
                    </Button>
                    
                    {/* 重新生成按钮 (仅 AI 消息) */}
                    {message.role === 'assistant' && !message.isStreaming && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => regenerateMessage(message.id)}
                        disabled={isLoading}
                        className="h-6 px-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        重新生成
                      </Button>
                    )}
                    
                    {/* 删除按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMessage(message.id)}
                      className="h-6 px-2 text-xs text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    <User className={`w-5 h-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className={`px-6 py-4 border-t ${
        isDarkMode 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className={`mb-3 p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-800' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm flex items-center gap-2 ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息... (支持 Markdown)"
              disabled={isLoading}
              className={`flex-1 h-12 px-4 text-base ${
                isDarkMode 
                  ? 'border-slate-600 focus:border-indigo-400 bg-slate-800 text-white' 
                  : 'border-slate-300 focus:border-indigo-500'
              }`}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          
          <p className={`mt-2 text-xs text-center ${
            isDarkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            按 Enter 发送消息 · 支持 Markdown 格式
          </p>
        </div>
      </div>
    </div>
  );
}
