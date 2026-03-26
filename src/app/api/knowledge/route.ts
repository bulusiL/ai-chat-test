import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/lib/knowledge';
import { HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * 搜索知识库
 * GET /api/knowledge?query=xxx&topK=5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const topK = parseInt(searchParams.get('topK') || '5');
    const minScore = parseFloat(searchParams.get('minScore') || '0.5');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: '缺少搜索关键词'
      }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const results = await KnowledgeService.searchKnowledge(query, {
      topK,
      minScore,
      customHeaders
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
 * 导入知识
 * POST /api/knowledge
 * Body: { entries: KnowledgeEntry[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries, url } = body;

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 如果是 URL 导入
    if (url) {
      const result = await KnowledgeService.importFromUrl(url, customHeaders);
      return NextResponse.json(result);
    }

    // 文本导入
    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({
        success: false,
        error: '缺少知识条目'
      }, { status: 400 });
    }

    const result = await KnowledgeService.importKnowledge(entries, customHeaders);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Import knowledge error:', error);
    return NextResponse.json({
      success: false,
      error: '导入失败'
    }, { status: 500 });
  }
}

/**
 * 初始化默认知识库
 * PUT /api/knowledge
 */
export async function PUT(request: NextRequest) {
  try {
    await KnowledgeService.initDefaultKnowledge();
    
    return NextResponse.json({
      success: true,
      message: '知识库初始化成功'
    });
  } catch (error) {
    console.error('Init knowledge error:', error);
    return NextResponse.json({
      success: false,
      error: '初始化失败'
    }, { status: 500 });
  }
}
