import { NextRequest, NextResponse } from 'next/server';
import { getAllKnowledgeEntries, addKnowledgeEntry, KnowledgeEntry } from '@/lib/knowledge';

/**
 * GET /api/admin/knowledge
 * 获取所有知识条目
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';
    
    const entries = await getAllKnowledgeEntries(includeInactive);
    
    return NextResponse.json({
      success: true,
      data: entries,
      total: entries.length
    });
  } catch (error) {
    console.error('Failed to get knowledge entries:', error);
    return NextResponse.json(
      { success: false, error: '获取知识库失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/knowledge
 * 添加新的知识条目
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, category, tags, is_active, sort_order } = body;
    
    // 验证必填字段
    if (!title || !content || !category) {
      return NextResponse.json(
        { success: false, error: '标题、内容和分类为必填项' },
        { status: 400 }
      );
    }
    
    // 验证分类
    if (!['book', 'study', 'other'].includes(category)) {
      return NextResponse.json(
        { success: false, error: '分类必须是 book、study 或 other' },
        { status: 400 }
      );
    }
    
    const entry: KnowledgeEntry = {
      title,
      content,
      category,
      tags: tags || [],
      is_active: is_active ?? true,
      sort_order: sort_order ?? 0
    };
    
    const id = await addKnowledgeEntry(entry);
    
    if (id) {
      return NextResponse.json({
        success: true,
        message: '知识条目添加成功',
        data: { id, ...entry }
      });
    } else {
      return NextResponse.json(
        { success: false, error: '添加知识条目失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to add knowledge entry:', error);
    return NextResponse.json(
      { success: false, error: '添加知识条目失败' },
      { status: 500 }
    );
  }
}
