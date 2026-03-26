import { NextResponse } from 'next/server';
import { OllamaService } from '@/lib/ollama';

export async function GET() {
  try {
    // 检查 Ollama 连接状态
    const ollamaConnected = await OllamaService.checkHealth();
    
    // 获取可用模型列表
    let models: string[] = [];
    if (ollamaConnected) {
      try {
        models = await OllamaService.getModels();
      } catch (e) {
        console.error('Failed to get models:', e);
      }
    }

    return NextResponse.json({
      status: ollamaConnected ? 'ok' : 'error',
      ollama: ollamaConnected ? 'connected' : 'disconnected',
      models,
      message: ollamaConnected 
        ? 'Ollama 服务连接正常' 
        : 'Ollama 服务未连接，请确保 Ollama 正在运行',
      timestamp: new Date().toISOString(),
      config: {
        ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_MODEL || 'qwen2.5:7b'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      message: '健康检查失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
