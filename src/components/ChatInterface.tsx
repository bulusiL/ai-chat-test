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
  Moon,
  Sun,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import AuthScreen from './AuthScreen';

// 消息类型定义
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// 会话类型定义
interface Session {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatInterface() {
  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [machineId, setMachineId] = useState<string | null>(null);
  
  // 聊天状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 会话状态
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // UI 状态
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [enableSearch, setEnableSearch] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化
  useEffect(() => {
    // 检查深色模式
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedMode ? savedMode === 'true' : prefersDark;
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);

    // 检查认证状态
    const savedMachineId = localStorage.getItem('machineId');
    if (savedMachineId) {
      checkAuthStatus(savedMachineId);
    }
    
    // 检查 Ollama 连接
    checkHealth();
  }, []);

  // 检查认证状态
  const checkAuthStatus = async (mid: string) => {
    try {
      const response = await fetch(`/api/auth/verify?machineId=${mid}`);
      const data = await response.json();
      
      if (data.authenticated) {
        setMachineId(mid);
        setIsAuthenticated(true);
        loadSessions(mid);
      } else {
        // 认证失效，清除本地存储
        localStorage.removeItem('machineId');
        localStorage.removeItem('authToken');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  // 认证成功回调
  const handleAuthSuccess = (mid: string) => {
    setMachineId(mid);
    setIsAuthenticated(true);
    loadSessions(mid);
  };

  // 登出
  const handleLogout = () => {
    localStorage.removeItem('machineId');
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setMachineId(null);
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
  };

  // 切换深色模式
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  // 检查 Ollama 健康状态
  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setIsConnected(data.status === 'ok');
    } catch (err) {
      setIsConnected(false);
    }
  };

  // 加载会话列表
  const loadSessions = async (mid: string) => {
    try {
      const response = await fetch(`/api/sessions?machineId=${mid}`);
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Load sessions failed:', err);
    }
  };

  // 加载会话消息
  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/messages?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        const loadedMessages = data.messages.map((m: any) => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at)
        }));
        setMessages(loadedMessages);
        setCurrentSessionId(sessionId);
      }
    } catch (err) {
      console.error('Load messages failed:', err);
    }
  };

  // 创建新会话
  const createNewSession = async () => {
    if (!machineId) return;
    
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineId })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentSessionId(data.sessionId);
        setMessages([]);
        loadSessions(machineId);
      }
    } catch (err) {
      console.error('Create session failed:', err);
    }
  };

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions?sessionId=${sessionId}`, { method: 'DELETE' });
      if (sessionId === currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      if (machineId) {
        loadSessions(machineId);
      }
    } catch (err) {
      console.error('Delete session failed:', err);
    }
  };

  // 保存消息到数据库
  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!currentSessionId) return;
    
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, role, content })
      });
    } catch (err) {
      console.error('Save message failed:', err);
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    // 如果没有当前会话，先创建一个
    let sessionId = currentSessionId;
    if (!sessionId && machineId) {
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ machineId, title: message.substring(0, 30) })
        });
        const data = await response.json();
        if (data.success) {
          sessionId = data.sessionId;
          setCurrentSessionId(sessionId);
          loadSessions(machineId);
        }
      } catch (err) {
        console.error('Create session failed:', err);
        return;
      }
    }

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
    
    // 保存用户消息
    await saveMessage('user', message);

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          enableSearch
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
              setMessages(prev => 
                prev.map(m => 
                  m.id === aiMessageId 
                    ? { ...m, isStreaming: false } 
                    : m
                )
              );
              // 保存 AI 消息
              if (fullContent) {
                await saveMessage('assistant', fullContent);
              }
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === aiMessageId 
                      ? { ...m, content: fullContent } 
                      : m
                  )
                );
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = err instanceof Error ? err.message : '发生未知错误';
      setError(errorMessage);
      
      setMessages(prev => 
        prev.map(m => 
          m.id === aiMessageId 
            ? { ...m, content: `错误: ${errorMessage}`, isStreaming: false } 
            : m
        )
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
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

  // 如果未认证，显示认证界面
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} isDarkMode={isDarkMode} />;
  }

  // 主聊天界面
  return (
    <div className={`flex h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-950 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      {/* 侧边栏 */}
      <div className={`flex-shrink-0 border-r transition-all duration-300 ${
        showSidebar ? 'w-64' : 'w-0'
      } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {showSidebar && (
          <div className="h-full flex flex-col">
            {/* 侧边栏头部 */}
            <div className={`p-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <Button
                onClick={createNewSession}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                新对话
              </Button>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <div className={`text-center py-8 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无对话记录</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((session) => (
                    <div
                      key={session.session_id}
                      onClick={() => loadMessages(session.session_id)}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        currentSessionId === session.session_id
                          ? isDarkMode 
                            ? 'bg-slate-800 text-white' 
                            : 'bg-slate-100 text-slate-900'
                          : isDarkMode
                            ? 'hover:bg-slate-800/50 text-slate-300'
                            : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.session_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 侧边栏底部 */}
            <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className={`w-full ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className={isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600'}
            >
              {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                AI Chat
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Ollama + 联网搜索
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 联网搜索开关 */}
            <Button
              variant={enableSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableSearch(!enableSearch)}
              className={enableSearch 
                ? "bg-indigo-500 hover:bg-indigo-600" 
                : isDarkMode 
                  ? "border-slate-600 text-slate-300" 
                  : "border-slate-300 text-slate-600"
              }
            >
              <Search className="w-4 h-4 mr-1" />
              {enableSearch ? '搜索开启' : '搜索关闭'}
            </Button>
            
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
                  Ollama
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  断开
                </>
              )}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className={isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">开始与 AI 对话吧</p>
              <p className="text-sm">
                {enableSearch ? '联网搜索已开启，可获取实时信息' : '输入消息，AI 将实时回复'}
              </p>
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
                  
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <Card className={`${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        : isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className={`px-4 py-3 ${
                        message.role === 'user' 
                          ? 'text-white prose-invert' 
                          : isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        ) : (
                          <div>
                            {message.content ? <MarkdownRenderer content={message.content} /> : null}
                            {message.isStreaming && (
                              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                    
                    <div className={`flex gap-1 mt-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
        <div className={`px-6 py-4 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="max-w-4xl mx-auto">
            {error && (
              <div className={`mb-3 p-3 rounded-lg border ${
                isDarkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                <p className="text-sm flex items-center gap-2">
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
                placeholder={enableSearch ? "输入消息... (联网搜索已开启)" : "输入消息..."}
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
            
            <p className={`mt-2 text-xs text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              按 Enter 发送 · {enableSearch ? '联网搜索开启' : '联网搜索关闭'} · Ollama 本地模型
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
