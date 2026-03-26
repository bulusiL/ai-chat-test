'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Cpu, Terminal } from 'lucide-react';

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
      setError('请输入访问令牌');
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#030014]">
      {/* 科技感背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 渐变光晕 */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px]"></div>
        
        {/* 科技网格 */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        {/* 扫描线 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-scan"></div>
        </div>
        
        {/* 角落装饰 */}
        <div className="absolute top-10 left-10 w-24 h-24 border-l-2 border-t-2 border-purple-500/30"></div>
        <div className="absolute top-10 right-10 w-24 h-24 border-r-2 border-t-2 border-purple-500/30"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 border-l-2 border-b-2 border-purple-500/30"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 border-r-2 border-b-2 border-purple-500/30"></div>
      </div>

      <Card className="w-full max-w-md relative bg-[#0a0a1a]/90 backdrop-blur-xl border border-purple-500/20 overflow-hidden">
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-purple-500/40 animate-float">
                <Cpu className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -inset-4 rounded-3xl border-2 border-purple-500/30 animate-spin-slow"></div>
              <div className="absolute -inset-8 rounded-[2rem] border border-indigo-500/20"></div>
            </div>
            
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              智能助手
            </h1>
            <p className="text-sm text-purple-400/70">
              专属学习伙伴
            </p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -inset-3 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
              </div>
              
              <h2 className="text-xl font-semibold mb-2 text-emerald-400">
                认证成功
              </h2>
              <p className="text-sm text-purple-300/70">
                正在进入系统...
              </p>
              
              <div className="flex justify-center mt-6">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-purple-300/70 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  输入访问令牌
                </label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="请输入您的访问令牌"
                  disabled={isLoading}
                  className="h-12 rounded-xl bg-[#0f0f1f]/90 border-purple-500/30 text-white placeholder:text-purple-400/50 focus:border-purple-500/60"
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <Button
                onClick={handleAuth}
                disabled={isLoading || !token.trim()}
                className={`w-full h-12 rounded-xl text-base font-medium transition-all duration-300 ${
                  isLoading || !token.trim()
                    ? 'bg-purple-900/30 text-purple-400/50'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    正在验证...
                  </>
                ) : (
                  '开始使用'
                )}
              </Button>

              <div className="text-center pt-4 space-y-2 text-sm text-purple-400/60">
                <p className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></span>
                  首次登录将自动绑定设备
                </p>
                <p>
                  支持多设备同时使用
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部状态栏 */}
        <div className="px-8 py-4 border-t border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between text-sm text-purple-400/60">
            <span>由 Ollama 提供支持</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
              系统就绪
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
