'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Send, 
  Cpu, 
  User, 
  Loader2,
  AlertCircle,
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableKnowledge, setEnableKnowledge] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const isDark = savedMode ? savedMode === 'true' : true;
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
      console.error('认证检查失败:', err);
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
      console.error('加载会话失败:', err);
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
      console.error('加载消息失败:', err);
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
      console.error('创建会话失败:', err);
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
      console.error('删除会话失败:', err);
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
      console.error('保存消息失败:', err);
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
        console.error('创建会话失败:', err);
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
      console.error('对话错误:', err);
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
    <div className="flex h-screen bg-[#030014] overflow-hidden relative">
      {/* 动态背景 - 科技感光晕 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 紫色光晕 */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        {/* 蓝色光晕 */}
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        {/* 靛蓝光晕 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
        
        {/* 科技网格背景 */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        {/* 扫描线动画 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-scan"></div>
        </div>
      </div>

      {/* 侧边栏 */}
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out relative z-10 ${
        showSidebar ? 'w-72' : 'w-0'
      }`}>
        {showSidebar && (
          <div className="h-full flex flex-col bg-[#0a0a1a]/90 backdrop-blur-xl border-r border-purple-500/20">
            {/* Logo 区域 */}
            <div className="p-5 border-b border-purple-500/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                  {/* Logo 图标 */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Cpu className="w-6 h-6 text-white" />
                  </div>
                  {/* 在线状态 */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-[#0a0a1a] flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                  </div>
                </div>
                <div>
                  <h1 className="font-bold text-xl text-white">
                    智能助手
                  </h1>
                  <p className="text-sm text-purple-400">AI 学习伙伴</p>
                </div>
              </div>
              
              <Button
                onClick={createNewSession}
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 rounded-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                新建对话
              </Button>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/20 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-sm text-purple-300/70">暂无对话</p>
                  <p className="text-xs mt-1 text-purple-400/50">开始新的对话吧</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.session_id}
                      onClick={() => loadMessages(session.session_id)}
                      className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        currentSessionId === session.session_id
                          ? 'bg-gradient-to-r from-purple-500/30 to-indigo-500/30 border border-purple-500/40 text-white shadow-lg shadow-purple-500/10' 
                          : 'hover:bg-purple-500/10 text-purple-300/70 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-purple-400/60 mt-1">
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
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 text-purple-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className="p-4 border-t border-purple-500/20 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-purple-300/70">浅色模式</span>
                <Switch checked={!isDarkMode} onCheckedChange={toggleDarkMode} />
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-purple-300/70 hover:text-white hover:bg-purple-500/10"
              >
                <LogOut className="w-5 h-5 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-purple-500/20 bg-[#0a0a1a]/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="h-10 w-10 p-0 text-purple-300 hover:text-white hover:bg-purple-500/10"
            >
              {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="hidden sm:flex items-center gap-2">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                {isConnected && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>}
              </div>
              <span className="text-sm text-purple-300/70">{isConnected ? '已连接' : '离线'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={enableKnowledge ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableKnowledge(!enableKnowledge)}
              className={`h-9 gap-2 text-sm rounded-lg ${
                enableKnowledge 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30' 
                  : 'border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/10'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">知识库</span>
            </Button>
            
            <Button
              variant={enableSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setEnableSearch(!enableSearch)}
              className={`h-9 gap-2 text-sm rounded-lg ${
                enableSearch 
                  ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/30' 
                  : 'border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/10'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">联网搜索</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="h-9 w-9 p-0 text-purple-300 hover:text-white hover:bg-purple-500/10"
            >
              <Sun className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              {/* Logo 动画 */}
              <div className="relative mb-10">
                {/* 主图标 */}
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-purple-500/40 animate-float">
                  <Cpu className="w-14 h-14 text-white" />
                </div>
                {/* 外圈装饰 */}
                <div className="absolute -inset-5 rounded-[2rem] border-2 border-purple-500/30 animate-spin-slow"></div>
                <div className="absolute -inset-10 rounded-[3rem] border border-indigo-500/20"></div>
                {/* 光点 */}
                <div className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50 animate-pulse"></div>
                <div className="absolute -bottom-3 -left-3 w-4 h-4 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse" style={{animationDelay: '0.5s'}}></div>
              </div>
              
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                你好，我是你的学习助手
              </h2>
              <p className="text-center max-w-md mb-12 text-lg text-purple-300/70">
                我可以帮你推荐图书、解答学习问题、查询实时信息
              </p>
              
              {/* 快捷选项 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                {/* 选项1 */}
                <button
                  onClick={() => setInputValue('推荐五年级读物')}
                  className="group flex items-center gap-4 p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/15 hover:border-purple-500/40 transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <BookOpen className="w-6 h-6 text-purple-400" />
                  </div>
                  <span className="text-base text-purple-200 group-hover:text-white transition-colors">推荐五年级读物</span>
                </button>
                
                {/* 选项2 */}
                <button
                  onClick={() => setInputValue('数学学习方法')}
                  className="group flex items-center gap-4 p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 hover:border-violet-500/40 transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                    <Zap className="w-6 h-6 text-violet-400" />
                  </div>
                  <span className="text-base text-violet-200 group-hover:text-white transition-colors">数学学习方法</span>
                </button>
                
                {/* 选项3 */}
                <button
                  onClick={() => setInputValue('今天北京天气')}
                  className="group flex items-center gap-4 p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 hover:border-indigo-500/40 transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                    <Search className="w-6 h-6 text-indigo-400" />
                  </div>
                  <span className="text-base text-indigo-200 group-hover:text-white transition-colors">今天北京天气</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* 头像 */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20'
                      : 'bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/20'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Cpu className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  {/* 消息内容 */}
                  <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === 'assistant' ? 'min-w-[200px]' : ''}`}>
                    <Card className={`overflow-hidden transition-all duration-200 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 border-0'
                        : 'bg-[#0f0f1f]/90 border border-purple-500/20 backdrop-blur-sm'
                    }`}>
                      <div className={`px-5 py-4 ${
                        message.role === 'user' 
                          ? 'text-white' 
                          : 'text-purple-100'
                      }`}>
                        {message.role === 'user' ? (
                          <div className="whitespace-pre-wrap break-words text-base">{message.content}</div>
                        ) : (
                          <div>
                            {message.content ? (
                              <MarkdownRenderer content={message.content} />
                            ) : (
                              <div className="flex items-center gap-2 text-purple-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{animationDelay: '0ms'}}></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{animationDelay: '150ms'}}></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-current animate-bounce" style={{animationDelay: '300ms'}}></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                    
                    {/* 操作按钮 */}
                    <div className={`flex gap-2 mt-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.id, message.content)}
                        className="h-7 px-3 text-xs text-purple-400/70 hover:text-purple-300 hover:bg-purple-500/10"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" />
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
        <div className="px-4 sm:px-6 py-4 border-t border-purple-500/20 bg-[#0a0a1a]/70 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                <p className="text-sm flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </p>
              </div>
            )}
            
            <div className="relative">
              {/* 发光边框效果 */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/30 via-violet-500/30 to-indigo-500/30 blur-lg opacity-50"></div>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入你的问题..."
                disabled={isLoading}
                className="relative w-full h-14 pl-5 pr-16 text-base rounded-xl bg-[#0f0f1f]/90 border border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-purple-500/60 focus:bg-[#0f0f1f]"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-lg transition-all duration-300 ${
                  isLoading || !inputValue.trim()
                    ? 'bg-purple-900/50 text-purple-500/50'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-4 text-sm text-purple-400/60">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${enableKnowledge ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-purple-800'}`}></span>
                知识库 {enableKnowledge ? '已开启' : '已关闭'}
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${enableSearch ? 'bg-purple-400 shadow-lg shadow-purple-400/50' : 'bg-purple-800'}`}></span>
                搜索 {enableSearch ? '已开启' : '已关闭'}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-700"></span>
                按 回车 发送
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
