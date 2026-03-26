import { NextRequest, NextResponse } from 'next/server';
import { updateKnowledgeEntry, deleteKnowledgeEntry } from '@/lib/knowledge';

/**
 * PUT /api/admin/knowledge/[id]
 * 更新知识条目
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const knowledgeId = parseInt(id, 10);
    
    if (isNaN(knowledgeId)) {
      return NextResponse.json(
        { success: false, error: '无效的知识条目ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { title, content, category, tags, is_active, sort_order } = body;
    
    // 验证分类（如果提供）
    if (category && !['book', 'study', 'other'].includes(category)) {
      return NextResponse.json(
        { success: false, error: '分类必须是 book、study 或 other' },
        { status: 400 }
      );
    }
    
    const success = await updateKnowledgeEntry(knowledgeId, {
      title,
      content,
      category,
      tags,
      is_active,
      sort_order
    });
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '知识条目更新成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '更新失败，知识条目可能不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to update knowledge entry:', error);
    return NextResponse.json(
      { success: false, error: '更新知识条目失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/knowledge/[id]
 * 删除知识条目
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const knowledgeId = parseInt(id, 10);
    
    if (isNaN(knowledgeId)) {
      return NextResponse.json(
        { success: false, error: '无效的知识条目ID' },
        { status: 400 }
      );
    }
    
    const success = await deleteKnowledgeEntry(knowledgeId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '知识条目删除成功'
      });
    } else {
      return NextResponse.json(
        { success: false, error: '删除失败，知识条目可能不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to delete knowledge entry:', error);
    return NextResponse.json(
      { success: false, error: '删除知识条目失败' },
      { status: 500 }
    );
  }
}
