import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';

/**
 * 获取会话的所有消息
 * GET /api/messages?sessionId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '缺少会话ID'
      }, { status: 400 });
    }

    const messages: any = await Database.query(
      `SELECT id, role, content, created_at 
       FROM messages 
       WHERE session_id = ? 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return NextResponse.json({
      success: true,
      messages: messages || []
    });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({
      success: false,
      error: '获取消息失败: ' + (error instanceof Error ? error.message : '数据库连接失败')
    }, { status: 500 });
  }
}

/**
 * 保存消息
 * POST /api/messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, role, content } = body;

    if (!sessionId || !role || !content) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json({
        success: false,
        error: '无效的角色类型'
      }, { status: 400 });
    }

    const result = await Database.execute(
      'INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [sessionId, role, content]
    );

    // 更新会话的 updated_at
    await Database.execute(
      'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [sessionId]
    );

    return NextResponse.json({
      success: true,
      messageId: result.insertId
    });

  } catch (error) {
    console.error('Save message error:', error);
    return NextResponse.json({
      success: false,
      error: '保存消息失败: ' + (error instanceof Error ? error.message : '数据库连接失败')
    }, { status: 500 });
  }
}

/**
 * 批量保存消息
 * PUT /api/messages
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messages } = body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }

    // 批量插入消息
    for (const msg of messages) {
      await Database.execute(
        'INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [sessionId, msg.role, msg.content]
      );
    }

    // 更新会话的 updated_at
    await Database.execute(
      'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [sessionId]
    );

    return NextResponse.json({
      success: true,
      count: messages.length
    });

  } catch (error) {
    console.error('Batch save messages error:', error);
    return NextResponse.json({
      success: false,
      error: '批量保存消息失败: ' + (error instanceof Error ? error.message : '数据库连接失败')
    }, { status: 500 });
  }
}
