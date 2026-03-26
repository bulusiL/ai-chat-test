import { NextResponse } from 'next/server';
import { initializeKnowledgeBase } from '@/lib/knowledge';

/**
 * POST /api/admin/knowledge/init
 * 初始化知识库（从内置数据导入到数据库）
 */
export async function POST() {
  try {
    const count = await initializeKnowledgeBase();
    
    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: `知识库初始化成功，导入了 ${count} 条知识`,
        data: { count }
      });
    } else {
      return NextResponse.json({
        success: true,
        message: '知识库已有数据，无需初始化',
        data: { count: 0 }
      });
    }
  } catch (error) {
    console.error('Failed to initialize knowledge base:', error);
    return NextResponse.json(
      { success: false, error: '初始化知识库失败' },
      { status: 500 }
    );
  }
}
