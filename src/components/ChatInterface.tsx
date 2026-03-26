'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Send, 
  Sparkles, 
  User, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun,
  Copy,
  Check,
  Trash2,
  Plus,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookOpen,
  Zap,
  Bot,
  Menu
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
  const [enableKnowledge, setEnableKnowledge] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedMode ? savedMode === 'true' : prefersDark;
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);

    const savedMachineId = localStorage.getItem('machineId');
    if (savedMachineId) {
      checkAuthStatus(savedMachineId);
    }
    
    checkHealth();
  }, []);

  const checkAuthStatus = async (mid: string) => {
    try {
      const response = await fetch(`/api/auth/verify?machineId=${mid}`);
      const data = await response.json();
      
      if (data.authenticated) {
        setMachineId(mid);
        setIsAuthenticated(true);
        loadSessions(mid);
      } else {
        localStorage.removeItem('machineId');
        localStorage.removeItem('authToken');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const handleAuthSuccess = (mid: string) => {
    setMachineId(mid);
    setIsAuthenticated(true);
    loadSessions(mid);
  };

  const handleLogout = () => {
    localStorage.removeItem('machineId');
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setMachineId(null);
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  };

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setIsConnected(data.status === 'ok');
    } catch {
      setIsConnected(false);
    }
  };

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

  const loadMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/messages?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        const loadedMessages = data.messages.map((m: { id: number; role: string; content: string; created_at: string }) => ({
          id: m.id.toString(),
          role: m.role as 'user' | 'assistant',
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    await saveMessage('user', message);

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
          enableSearch,
          enableKnowledge
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

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    <div className={`flex h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950' 
        : 'bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50'
    }`}>
      {/* 侧边栏 */}
      <div className={`flex-shrink-0 border-r transition-all duration-300 ease-in-out ${
        showSidebar ? 'w-72' : 'w-0'
      } ${isDarkMode ? 'bg-slate-900/80 border-slate-800/50' : 'bg-white/80 border-slate-200/50'} backdrop-blur-xl`}>
        {showSidebar && (
          <div className="h-full flex flex-col">
            {/* Logo 区域 */}
            <div className={`p-5 border-b ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900"></div>
                </div>
                <div>
                  <h1 className="font-bold text-lg gradient-text">AI Chat</h1>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>智能学习助手</p>
                </div>
              </div>
              
              <Button
                onClick={createNewSession}
                className={`w-full h-11 btn-hover ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' 
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
                } text-white shadow-lg shadow-purple-500/25`}
              >
                <Plus className="w-4 h-4 mr-2" />
                新建对话
              </Button>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto p-3">
              {sessions.length === 0 ? (
                <div className={`text-center py-12 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">暂无对话记录</p>
                  <p className="text-xs mt-1 opacity-70">开始你的第一次对话吧</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sessions.map((session) => (
                    <div
                      key={session.session_id}
                      onClick={() => loadMessages(session.session_id)}
                      className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        currentSessionId === session.session_id
                          ? isDarkMode 
                            ? 'bg-purple-600/20 text-white shadow-lg shadow-purple-500/10' 
                            : 'bg-purple-50 text-purple-900 shadow-lg shadow-purple-500/5'
                          : isDarkMode
                            ? 'hover:bg-slate-800/50 text-slate-300'
                            : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {new Date(session.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.session_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>深色模式</span>
                <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className={`w-full justify-start ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 头部 */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800/50' : 'bg-white/50 border-slate-200/50'
        } backdrop-blur-xl`}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className={`h-9 w-9 p-0 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600'}`}
            >
              {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="hidden sm:flex items-center gap-2">
              <Badge 
                variant="secondary"
                className={`gap-1.5 px-3 py-1 ${
                  isConnected 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isConnected ? '已连接' : '离线'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 知识库开关 */}
            <Button
              variant={enableKnowledge ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableKnowledge(!enableKnowledge)}
              className={`h-8 gap-1.5 ${
                enableKnowledge 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' 
                  : isDarkMode 
                    ? 'border-slate-700 text-slate-400' 
                    : 'border-slate-300 text-slate-600'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">知识库</span>
            </Button>
            
            {/* 联网搜索开关 */}
            <Button
              variant={enableSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableSearch(!enableSearch)}
              className={`h-8 gap-1.5 ${
                enableSearch 
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
                  : isDarkMode 
                    ? 'border-slate-700 text-slate-400' 
                    : 'border-slate-300 text-slate-600'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">搜索</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className={`h-8 w-8 p-0 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-float">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 animate-pulse-ring"></div>
              </div>
              
              <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                你好，我是你的学习助手
              </h2>
              <p className={`text-center max-w-md mb-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                我可以帮你推荐图书、解答学习问题，让我们一起开始吧！
              </p>
              
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: BookOpen, text: '推荐几本适合五年级的书' },
                  { icon: Zap, text: '如何提高数学成绩？' },
                  { icon: Search, text: '今天北京天气怎么样？' },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(item.text)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 card-hover ${
                      isDarkMode 
                        ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-300' 
                        : 'bg-white hover:bg-slate-50 text-slate-600 shadow-sm'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* 头像 */}
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    message.role === 'user'
                      ? isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25'
                  }`}>
                    {message.role === 'user' ? (
                      <User className={`w-5 h-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                    ) : (
                      <Sparkles className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  {/* 消息内容 */}
                  <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === 'user' ? '' : 'min-w-[200px]'}`}>
                    <Card className={`message-bubble overflow-hidden ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                        : isDarkMode 
                          ? 'bg-slate-800/80 border-slate-700/50' 
                          : 'bg-white border-slate-200/50 shadow-lg'
                    }`}>
                      <div className={`px-4 py-3 ${
                        message.role === 'user' 
                          ? 'text-white' 
                          : isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        ) : (
                          <div>
                            {message.content ? <MarkdownRenderer content={message.content} /> : (
                              <div className="flex items-center gap-1 animate-typing">
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                    
                    {/* 操作按钮 */}
                    <div className={`flex gap-1 mt-1.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.id, message.content)}
                        className={`h-6 px-2 text-xs ${
                          isDarkMode 
                            ? 'text-slate-500 hover:text-slate-300' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
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
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className={`px-4 sm:px-6 py-4 border-t ${
          isDarkMode ? 'bg-slate-900/50 border-slate-800/50' : 'bg-white/50 border-slate-200/50'
        } backdrop-blur-xl`}>
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className={`mb-3 p-3 rounded-xl border ${
                isDarkMode ? 'bg-red-900/20 border-red-800/50 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                <p className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </p>
              </div>
            )}
            
            <div className="relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={enableSearch ? "问我任何问题..." : "输入消息..."}
                disabled={isLoading}
                className={`w-full h-12 sm:h-14 pl-4 pr-14 text-base rounded-xl input-glow transition-all duration-200 ${
                  isDarkMode 
                    ? 'border-slate-700/50 focus:border-purple-500/50 bg-slate-800/50 text-white placeholder:text-slate-500' 
                    : 'border-slate-200/50 focus:border-purple-500/50 bg-white text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-lg btn-hover ${
                  isLoading || !inputValue.trim()
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${enableKnowledge ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                知识库 {enableKnowledge ? '开启' : '关闭'}
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${enableSearch ? 'bg-purple-500' : 'bg-slate-400'}`}></span>
                搜索 {enableSearch ? '开启' : '关闭'}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                Enter 发送
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
