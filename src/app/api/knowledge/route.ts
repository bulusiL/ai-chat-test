import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/lib/knowledge';

/**
 * 搜索知识库
 * GET /api/knowledge?query=xxx&topK=5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const topK = parseInt(searchParams.get('topK') || '5');
    const minScore = parseFloat(searchParams.get('minScore') || '0.3');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: '缺少搜索关键词'
      }, { status: 400 });
    }

    const results = await KnowledgeService.searchKnowledge(query, {
      topK,
      minScore
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Search knowledge error:', error);
    return NextResponse.json({
      success: false,
      error: '搜索失败'
    }, { status: 500 });
  }
}

/**
 * 导入知识（当前版本使用内置知识库，不支持自定义导入）
 * POST /api/knowledge
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: '当前版本使用内置知识库，暂不支持自定义导入',
    hint: '如需自定义知识库，请配置 coze-coding-dev-sdk 相关凭证'
  }, { status: 400 });
}

/**
 * 获取知识库状态
 * PUT /api/knowledge
 */
export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: '知识库已就绪',
    type: 'builtin',
    entries: 6 // 内置知识条目数
  });
}
