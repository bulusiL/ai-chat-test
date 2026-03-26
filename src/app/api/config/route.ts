import { NextResponse } from 'next/server';
import { getSearchStatus } from '@/lib/search';

/**
 * GET /api/config
 * 获取系统配置状态
 */
export async function GET() {
  const searchStatus = getSearchStatus();
  
  return NextResponse.json({
    success: true,
    data: {
      search: {
        bing: searchStatus.bing,
        serpapi: searchStatus.serpapi,
        wikipedia: searchStatus.wikipedia,
        available: searchStatus.bing || searchStatus.serpapi || searchStatus.wikipedia,
      },
    }
  });
}
