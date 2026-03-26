import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import crypto from 'crypto';

/**
 * 生成随机 token
 */
function generateToken(): string {
  return `sk_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * 获取所有 token
 * GET /api/admin/tokens
 */
export async function GET(request: NextRequest) {
  try {
    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      const tokens = await store.getTokens();
      
      // 隐藏部分 token（安全考虑）
      const safeTokens = tokens.map((t: any) => ({
        ...t,
        token: t.token.substring(0, 10) + '...' + t.token.substring(t.token.length - 4),
      }));
      
      return NextResponse.json({
        success: true,
        tokens: safeTokens,
        storage: 'memory'
      });
    }
    
    // 使用数据库
    const tokens: any = await Database.query(
      `SELECT t.id, t.token, t.is_used, t.created_at, t.used_at,
              u.machine_id, u.created_at as user_created_at
       FROM auth_tokens t
       LEFT JOIN users u ON t.token = u.token
       ORDER BY t.created_at DESC`
    );

    // 隐藏部分 token（安全考虑）
    const safeTokens = tokens.map((t: any) => ({
      ...t,
      token: t.token.substring(0, 10) + '...' + t.token.substring(t.token.length - 4),
      machine_id: t.machine_id ? t.machine_id.substring(0, 8) + '...' : null
    }));

    return NextResponse.json({
      success: true,
      tokens: safeTokens,
      storage: 'database'
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    return NextResponse.json({
      success: false,
      error: '获取 Token 列表失败'
    }, { status: 500 });
  }
}

/**
 * 生成新的 token
 * POST /api/admin/tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const count = body.count || 1; // 默认生成 1 个

    if (count < 1 || count > 100) {
      return NextResponse.json({
        success: false,
        error: '生成数量必须在 1-100 之间'
      }, { status: 400 });
    }

    const tokens: string[] = [];

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      for (let i = 0; i < count; i++) {
        const token = generateToken();
        await store.insertToken(token);
        tokens.push(token);
      }
      
      return NextResponse.json({
        success: true,
        message: `成功生成 ${count} 个 Token (内存存储)`,
        tokens,
        storage: 'memory'
      });
    }

    // 使用数据库
    for (let i = 0; i < count; i++) {
      const token = generateToken();
      await Database.execute(
        'INSERT INTO auth_tokens (token, is_used, created_at) VALUES (?, FALSE, CURRENT_TIMESTAMP)',
        [token]
      );
      tokens.push(token);
    }

    return NextResponse.json({
      success: true,
      message: `成功生成 ${count} 个 Token`,
      tokens,
      storage: 'database'
    });
  } catch (error) {
    console.error('Generate tokens error:', error);
    return NextResponse.json({
      success: false,
      error: '生成 Token 失败'
    }, { status: 500 });
  }
}

/**
 * 删除未使用的 token
 * DELETE /api/admin/tokens?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少 Token ID'
      }, { status: 400 });
    }

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      const deleted = await store.deleteToken(parseInt(id));
      
      if (!deleted) {
        return NextResponse.json({
          success: false,
          error: 'Token 不存在或已被使用'
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: true,
        message: '删除成功'
      });
    }

    // 使用数据库
    const tokens: any = await Database.query(
      'SELECT is_used FROM auth_tokens WHERE id = ?',
      [id]
    );

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Token 不存在'
      }, { status: 404 });
    }

    if (tokens[0].is_used) {
      return NextResponse.json({
        success: false,
        error: '已被使用的 Token 不能删除'
      }, { status: 400 });
    }

    await Database.execute('DELETE FROM auth_tokens WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Delete token error:', error);
    return NextResponse.json({
      success: false,
      error: '删除 Token 失败'
    }, { status: 500 });
  }
}
