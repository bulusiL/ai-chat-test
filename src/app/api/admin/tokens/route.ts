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
    // 先测试数据库连接
    const connectionTest = await Database.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败: ' + connectionTest.message,
        hint: '请检查 .env.local 中的数据库配置，并确保 MySQL 服务已启动'
      }, { status: 500 });
    }

    const tokens: any = await Database.query(`
      SELECT 
        t.id, 
        t.token, 
        t.device_count,
        t.is_active, 
        t.created_at,
        (SELECT COUNT(*) FROM devices d WHERE d.token = t.token) as actual_device_count
      FROM auth_tokens t
      ORDER BY t.created_at DESC
    `);

    // 隐藏部分 token（安全考虑）
    const safeTokens = tokens.map((t: any) => ({
      ...t,
      token: t.token.substring(0, 10) + '...' + t.token.substring(t.token.length - 4),
    }));

    return NextResponse.json({
      success: true,
      tokens: safeTokens
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    return NextResponse.json({
      success: false,
      error: '获取 Token 列表失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}

/**
 * 生成新的 token
 * POST /api/admin/tokens
 */
export async function POST(request: NextRequest) {
  try {
    // 先测试数据库连接
    const connectionTest = await Database.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败: ' + connectionTest.message,
        hint: '请检查 .env.local 中的数据库配置，并确保 MySQL 服务已启动'
      }, { status: 500 });
    }

    // 安全解析 JSON 请求体
    let body: { count?: number } = { count: 1 };
    try {
      const text = await request.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      // JSON 解析失败，使用默认值
      console.log('Request body parse error, using default count=1');
    }
    
    const count = body.count || 1;

    if (count < 1 || count > 100) {
      return NextResponse.json({
        success: false,
        error: '生成数量必须在 1-100 之间'
      }, { status: 400 });
    }

    const tokens: string[] = [];

    for (let i = 0; i < count; i++) {
      const token = generateToken();
      await Database.execute(
        'INSERT INTO auth_tokens (token, device_count, is_active, created_at) VALUES (?, 0, TRUE, CURRENT_TIMESTAMP)',
        [token]
      );
      tokens.push(token);
    }

    return NextResponse.json({
      success: true,
      message: `成功生成 ${count} 个 Token`,
      tokens
    });
  } catch (error) {
    console.error('Generate tokens error:', error);
    return NextResponse.json({
      success: false,
      error: '生成 Token 失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}

/**
 * 删除 token（软删除 - 标记为无效）
 * DELETE /api/admin/tokens?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    // 先测试数据库连接
    const connectionTest = await Database.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败: ' + connectionTest.message
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少 Token ID'
      }, { status: 400 });
    }

    // 检查 Token 是否存在
    const tokens: any = await Database.query(
      'SELECT * FROM auth_tokens WHERE id = ?',
      [id]
    );

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Token 不存在'
      }, { status: 404 });
    }

    // 标记为无效（软删除）
    await Database.execute(
      'UPDATE auth_tokens SET is_active = FALSE WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Token 已禁用'
    });
  } catch (error) {
    console.error('Delete token error:', error);
    return NextResponse.json({
      success: false,
      error: '删除 Token 失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}

/**
 * 启用/禁用 Token
 * PUT /api/admin/tokens
 */
export async function PUT(request: NextRequest) {
  try {
    // 先测试数据库连接
    const connectionTest = await Database.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败: ' + connectionTest.message
      }, { status: 500 });
    }

    // 安全解析 JSON 请求体
    let body: { id?: number; isActive?: boolean } = {};
    try {
      const text = await request.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      // JSON 解析失败
    }
    
    const { id, isActive } = body;

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }

    await Database.execute(
      'UPDATE auth_tokens SET is_active = ? WHERE id = ?',
      [isActive, id]
    );

    return NextResponse.json({
      success: true,
      message: isActive ? 'Token 已启用' : 'Token 已禁用'
    });
  } catch (error) {
    console.error('Update token error:', error);
    return NextResponse.json({
      success: false,
      error: '更新 Token 失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}
