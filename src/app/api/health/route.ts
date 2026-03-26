import { NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import { OllamaService } from '@/lib/ollama';

/**
 * 健康检查 API
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  
  // 检查数据库连接
  const dbStatus = await Database.testConnection();
  
  // 检查 Ollama 服务
  const ollamaStatus = await OllamaService.checkHealth();
  
  // 获取可用模型
  const models = ollamaStatus.healthy ? await OllamaService.getModels() : [];
  
  const responseTime = Date.now() - startTime;
  
  const isHealthy = dbStatus.success && ollamaStatus.healthy;
  
  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    services: {
      database: {
        status: dbStatus.success ? 'connected' : 'disconnected',
        message: dbStatus.message
      },
      ollama: {
        status: ollamaStatus.healthy ? 'running' : 'stopped',
        message: ollamaStatus.message,
        models: models,
        defaultModel: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      }
    },
    config: {
      dbType: process.env.DB_TYPE || 'mysql',
      ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      ollamaModel: process.env.OLLAMA_MODEL || 'qwen2.5:7b'
    }
  }, { 
    status: isHealthy ? 200 : 503 
  });
}
