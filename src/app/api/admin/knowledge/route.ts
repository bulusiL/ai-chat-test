import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/lib/knowledge';

/**
 * 初始化知识库
 * POST /api/admin/knowledge/init
 */
export async function POST(request: NextRequest) {
  try {
    await KnowledgeService.initDefaultKnowledge();
    
    return NextResponse.json({
      success: true,
      message: '知识库初始化成功',
      dataset: KnowledgeService.KNOWLEDGE_DATASET
    });
  } catch (error) {
    console.error('Init knowledge error:', error);
    return NextResponse.json({
      success: false,
      error: '初始化失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}

/**
 * 测试知识库搜索
 * GET /api/admin/knowledge/test?query=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '小学生阅读推荐';

    const results = await KnowledgeService.searchKnowledge(query, {
      topK: 3,
      minScore: 0.3
    });

    return NextResponse.json({
      success: true,
      query,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Test knowledge error:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败'
    }, { status: 500 });
  }
}
