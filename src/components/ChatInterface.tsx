'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Send, 
  Cpu, 
  User, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sun,
  Copy,
  Check,
  Trash2,
  Plus,
  MessageSquare,
  Search,
  ChevronLeft,
  LogOut,
  BookOpen,
  Zap,
  Menu,
  Terminal,
  Activity
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import AuthScreen from './AuthScreen';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface Session {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function ChatInterface() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true); // 默认深色模式
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableKnowledge, setEnableKnowledge] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const isDark = savedMode ? savedMode === 'true' : true; // 默认深色
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

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} isDarkMode={isDarkMode} />;
  }

  return (
    <div className="flex h-screen bg-background grid-bg overflow-hidden">
      {/* 侧边栏 */}
      <div className={`flex-shrink-0 border-r transition-all duration-300 ease-in-out ${
        showSidebar ? 'w-72' : 'w-0'
      } bg-sidebar border-sidebar-border`}>
        {showSidebar && (
          <div className="h-full flex flex-col scanline">
            {/* Logo 区域 */}
            <div className="p-5 border-b border-sidebar-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow">
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-glow"></div>
                </div>
                <div>
                  <h1 className="font-bold text-lg neon-text">AI Chat</h1>
                  <p className="text-xs text-muted-foreground font-mono">v2.0.0</p>
                </div>
              </div>
              
              <Button
                onClick={createNewSession}
                className="w-full h-10 btn-tech bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建会话
              </Button>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto p-3">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-lg border border-border bg-secondary/50 flex items-center justify-center">
                    <Terminal className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">无会话记录</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">开始新对话</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sessions.map((session, index) => (
                    <div
                      key={session.session_id}
                      onClick={() => loadMessages(session.session_id)}
                      className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        currentSessionId === session.session_id
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-foreground' 
                          : 'hover:bg-secondary/50 border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-mono text-indigo-400">{String(index + 1).padStart(2, '0')}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {new Date(session.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.session_id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className="p-4 border-t border-sidebar-border space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground">LIGHT MODE</span>
                <Switch checked={!isDarkMode} onCheckedChange={toggleDarkMode} />
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出系统
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Activity className={`w-4 h-4 ${isConnected ? 'text-emerald-500' : 'text-destructive'}`} />
                <span className="text-xs font-mono text-muted-foreground">
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={enableKnowledge ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableKnowledge(!enableKnowledge)}
              className={`h-8 gap-1.5 font-mono text-xs ${
                enableKnowledge 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white glow' 
                  : 'border-border text-muted-foreground'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">KNOWLEDGE</span>
            </Button>
            
            <Button
              variant={enableSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableSearch(!enableSearch)}
              className={`h-8 gap-1.5 font-mono text-xs ${
                enableSearch 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white glow' 
                  : 'border-border text-muted-foreground'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SEARCH</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <Sun className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow animate-float">
                  <Cpu className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -inset-4 rounded-2xl border border-indigo-500/20 animate-spin-slow"></div>
                <div className="absolute -inset-8 rounded-3xl border border-purple-500/10"></div>
              </div>
              
              <h2 className="text-2xl font-bold mb-2 neon-text">
                SYSTEM READY
              </h2>
              <p className="text-center max-w-md mb-8 text-muted-foreground font-mono text-sm">
                AI 学习助手已就绪 · 等待输入指令
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                {[
                  { icon: BookOpen, text: '推荐五年级读物', cmd: 'BOOK_RECOMMEND' },
                  { icon: Zap, text: '数学学习方法', cmd: 'MATH_TIPS' },
                  { icon: Search, text: '查询天气', cmd: 'WEATHER' },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(item.text)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-indigo-500/30 transition-all duration-200 text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20">
                      <item.icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.text}</p>
                      <p className="text-xs font-mono text-muted-foreground">{item.cmd}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* 头像 */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-secondary border border-border'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 glow'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Cpu className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  {/* 消息内容 */}
                  <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === 'assistant' ? 'min-w-[200px]' : ''}`}>
                    <Card className={`message-bubble overflow-hidden ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'tech-card neon-border'
                    }`}>
                      <div className={`px-4 py-3 ${
                        message.role === 'user' 
                          ? 'text-white' 
                          : 'text-foreground'
                      }`}>
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap break-words font-mono text-sm">{message.content}</div>
                        ) : (
                          <div>
                            {message.content ? (
                              <MarkdownRenderer content={message.content} />
                            ) : (
                              <div className="flex items-center gap-2 text-indigo-400 animate-typing font-mono text-sm">
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
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground font-mono"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            COPIED
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            COPY
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
        <div className="px-4 sm:px-6 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                <p className="text-sm flex items-center gap-2 text-destructive font-mono">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>ERROR: {error}</span>
                </p>
              </div>
            )}
            
            <div className="relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="INPUT MESSAGE..."
                disabled={isLoading}
                className="w-full h-12 pl-4 pr-14 text-base font-mono rounded-lg input-tech bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 p-0 rounded-lg btn-tech ${
                  isLoading || !inputValue.trim()
                    ? 'bg-secondary text-muted-foreground'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white glow'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-3 font-mono text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${enableKnowledge ? 'bg-emerald-500' : 'bg-muted'}`}></span>
                KB {enableKnowledge ? 'ON' : 'OFF'}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${enableSearch ? 'bg-indigo-500' : 'bg-muted'}`}></span>
                SEARCH {enableSearch ? 'ON' : 'OFF'}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                ENTER TO SEND
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
