'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, Key, Fingerprint } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (machineId: string) => void;
  isDarkMode: boolean;
}

export default function AuthScreen({ onAuthSuccess, isDarkMode }: AuthScreenProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 生成机器码（基于浏览器指纹）
  const generateMachineId = async (): Promise<string> => {
    // 使用浏览器信息生成机器码
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || '',
      // 添加一些随机性确保唯一性
      Date.now().toString(36),
    ];
    
    // 使用 SubtleCrypto 生成哈希
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
        // 保存机器码到本地
        localStorage.setItem('machineId', machineId);
        localStorage.setItem('authToken', token.trim());
        
        setTimeout(() => {
          onAuthSuccess(machineId);
        }, 1000);
      } else {
        setError(data.error || '认证失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-950 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      <Card className={`w-full max-w-md p-8 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Key className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            身份验证
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            请输入您的 Token 进行身份验证
          </p>
        </div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className={`text-xl font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              验证成功！
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              正在进入聊天界面...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="请输入 Token"
                disabled={isLoading}
                className={`h-12 ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' 
                    : 'bg-white border-slate-300'
                }`}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              />
              <Fingerprint className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-400'
              }`} />
            </div>

            {error && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                isDarkMode 
                  ? 'bg-red-900/20 text-red-400 border border-red-800' 
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button
              onClick={handleAuth}
              disabled={isLoading || !token.trim()}
              className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                '验证身份'
              )}
            </Button>

            <div className={`text-center pt-4 ${
              isDarkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <p className="text-xs">
                首次验证将自动绑定当前设备
              </p>
              <p className="text-xs mt-1">
                Token 只能绑定一个设备
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
