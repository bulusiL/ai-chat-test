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
      setError('TOKEN REQUIRED');
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
        setError(data.error || 'AUTH FAILED');
      }
    } catch {
      setError('NETWORK ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background grid-bg">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl"></div>
        
        {/* 角落装饰 */}
        <div className="absolute top-10 left-10 w-20 h-20 border-l-2 border-t-2 border-indigo-500/20"></div>
        <div className="absolute top-10 right-10 w-20 h-20 border-r-2 border-t-2 border-indigo-500/20"></div>
        <div className="absolute bottom-10 left-10 w-20 h-20 border-l-2 border-b-2 border-indigo-500/20"></div>
        <div className="absolute bottom-10 right-10 w-20 h-20 border-r-2 border-b-2 border-indigo-500/20"></div>
      </div>

      <Card className="w-full max-w-md relative tech-card neon-border overflow-hidden">
        {/* 扫描线 */}
        <div className="absolute inset-0 scanline pointer-events-none"></div>
        
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow">
                <Cpu className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -inset-3 rounded-2xl border border-indigo-500/20 animate-spin-slow"></div>
            </div>
            
            <h1 className="text-3xl font-bold mb-2 neon-text font-mono">
              AI CHAT
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              v2.0.0 · LEARNING ASSISTANT
            </p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="relative inline-block mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center glow-cyan">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-2 rounded-full border-2 border-emerald-500/30 animate-ping"></div>
              </div>
              
              <h2 className="text-xl font-semibold mb-2 neon-text font-mono">
                ACCESS GRANTED
              </h2>
              <p className="text-sm text-muted-foreground font-mono">
                INITIALIZING SYSTEM...
              </p>
              
              <div className="flex justify-center mt-6">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  INPUT ACCESS TOKEN
                </label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="sk_xxxxxxxxxx"
                  disabled={isLoading}
                  className="h-12 rounded-lg input-tech bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground font-mono text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-destructive" />
                  <p className="text-sm font-mono text-destructive">{error}</p>
                </div>
              )}

              <Button
                onClick={handleAuth}
                disabled={isLoading || !token.trim()}
                className={`w-full h-12 rounded-lg font-mono text-sm btn-tech ${
                  isLoading || !token.trim()
                    ? 'bg-secondary text-muted-foreground'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white glow'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    VERIFYING...
                  </>
                ) : (
                  'INITIALIZE CONNECTION'
                )}
              </Button>

              <div className="text-center pt-4 space-y-2 font-mono text-xs text-muted-foreground">
                <p className="flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  DEVICE AUTO-BIND ON FIRST AUTH
                </p>
                <p>
                  MULTI-DEVICE SUPPORT ENABLED
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部状态栏 */}
        <div className="px-8 py-3 border-t border-border bg-secondary/30">
          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>POWERED BY OLLAMA</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SYSTEM READY
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
