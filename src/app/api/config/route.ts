import { NextResponse } from 'next/server';
import { isWebSearchConfigured } from '@/lib/ollama';

/**
 * GET /api/config
 * 获取系统配置状态
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      webSearchEnabled: isWebSearchConfigured(),
      // 可以添加其他配置状态
    }
  });
}
