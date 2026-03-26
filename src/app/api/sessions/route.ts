import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import crypto from 'crypto';

/**
 * 生成会话 ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * 哈希机器码
 */
function hashMachineId(machineId: string): string {
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

/**
 * 获取用户的所有会话
 * GET /api/sessions?machineId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      return NextResponse.json({
        success: false,
        error: '缺少机器码'
      }, { status: 400 });
    }

    const hashedMachineId = hashMachineId(machineId);

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      const sessions = await store.getSessionsByMachineId(hashedMachineId);
      
      return NextResponse.json({
        success: true,
        sessions: sessions.map(s => ({
          session_id: s.session_id,
          title: s.title,
          created_at: s.created_at,
          updated_at: s.updated_at
        }))
      });
    }

    // 使用数据库
    const sessions: any = await Database.query(
      `SELECT session_id, title, created_at, updated_at 
       FROM sessions 
       WHERE machine_id = ? AND is_deleted = FALSE 
       ORDER BY updated_at DESC`,
      [hashedMachineId]
    );

    return NextResponse.json({
      success: true,
      sessions: sessions || []
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({
      success: false,
      error: '获取会话列表失败'
    }, { status: 500 });
  }
}

/**
 * 创建新会话
 * POST /api/sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineId, title = '新对话' } = body;

    if (!machineId) {
      return NextResponse.json({
        success: false,
        error: '缺少机器码'
      }, { status: 400 });
    }

    const hashedMachineId = hashMachineId(machineId);
    const sessionId = generateSessionId();

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      await store.createSession(sessionId, hashedMachineId, title);
      
      return NextResponse.json({
        success: true,
        sessionId,
        title
      });
    }

    // 使用数据库
    await Database.execute(
      'INSERT INTO sessions (session_id, machine_id, title, created_at, updated_at, is_deleted) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE)',
      [sessionId, hashedMachineId, title]
    );

    return NextResponse.json({
      success: true,
      sessionId,
      title
    });

  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({
      success: false,
      error: '创建会话失败'
    }, { status: 500 });
  }
}

/**
 * 更新会话标题
 * PUT /api/sessions
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, title } = body;

    if (!sessionId || !title) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      await store.updateSessionTitle(sessionId, title);
      
      return NextResponse.json({
        success: true,
        message: '更新成功'
      });
    }

    // 使用数据库
    await Database.execute(
      'UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [title, sessionId]
    );

    return NextResponse.json({
      success: true,
      message: '更新成功'
    });

  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json({
      success: false,
      error: '更新会话失败'
    }, { status: 500 });
  }
}

/**
 * 删除会话（软删除）
 * DELETE /api/sessions?sessionId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: '缺少会话ID'
      }, { status: 400 });
    }

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      await store.deleteSession(sessionId);
      
      return NextResponse.json({
        success: true,
        message: '删除成功'
      });
    }

    // 使用数据库
    await Database.execute(
      'UPDATE sessions SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [sessionId]
    );

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({
      success: false,
      error: '删除会话失败'
    }, { status: 500 });
  }
}
