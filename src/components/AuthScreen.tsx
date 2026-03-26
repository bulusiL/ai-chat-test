'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Moon, Sun } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (machineId: string) => void;
  isDarkMode: boolean;
}

export default function AuthScreen({ onAuthSuccess, isDarkMode }: AuthScreenProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const generateMachineId = async (): Promise<string> => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || '',
      Date.now().toString(36),
    ];
    
    const encoder = new TextEncoder();
    const data = encoder.encode(components.join('|'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `mc_${hashHex.substring(0, 32)}`;
  };

  const handleAuth = async () => {
    if (!token.trim()) {
      setError('请输入 Token');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const machineId = await generateMachineId();
      
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), machineId })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        localStorage.setItem('machineId', machineId);
        localStorage.setItem('authToken', token.trim());
        
        setTimeout(() => {
          onAuthSuccess(machineId);
        }, 1500);
      } else {
        setError(data.error || '认证失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950' 
        : 'bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50'
    }`}>
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${
          isDarkMode ? 'bg-purple-600/20' : 'bg-purple-300/30'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${
          isDarkMode ? 'bg-indigo-600/20' : 'bg-indigo-300/30'
        }`}></div>
      </div>

      <Card className={`w-full max-w-md relative ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/50' 
          : 'bg-white/80 border-slate-200/50'
      } backdrop-blur-xl shadow-2xl`}>
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 animate-pulse"></div>
            </div>
            
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <span className="gradient-text">AI Chat</span>
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              智能学习助手 · 为中小学生服务
            </p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-500/20 animate-pulse-ring"></div>
              </div>
              
              <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                验证成功！
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                正在进入聊天界面...
              </p>
              
              <div className="flex justify-center mt-6">
                <Loader2 className={`w-5 h-5 animate-spin ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  输入访问密钥
                </label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="sk_xxxxxxxxxx"
                  disabled={isLoading}
                  className={`h-12 rounded-xl input-glow ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-purple-500/50' 
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-purple-500'
                  }`}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>

              {error && (
                <div className={`flex items-center gap-2 p-3 rounded-xl ${
                  isDarkMode 
                    ? 'bg-red-900/20 text-red-400 border border-red-800/50' 
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={handleAuth}
                disabled={isLoading || !token.trim()}
                className={`w-full h-12 rounded-xl btn-hover ${
                  isLoading || !token.trim()
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  '开始使用'
                )}
              </Button>

              <div className={`text-center pt-4 space-y-2 ${
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <p className="text-xs flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  首次验证将自动绑定当前设备
                </p>
                <p className="text-xs">
                  一个 Token 支持多设备使用
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部 */}
        <div className={`px-8 py-4 border-t ${isDarkMode ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Powered by Ollama
            </p>
            <div className="flex items-center gap-2">
              {isDarkMode ? (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
