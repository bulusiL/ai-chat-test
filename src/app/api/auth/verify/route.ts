import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import crypto from 'crypto';

interface VerifyRequest {
  token: string;
  machineId: string;
}

/**
 * 生成机器码的哈希值
 */
function hashMachineId(machineId: string): string {
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

/**
 * 验证 token 并绑定机器码
 * POST /api/auth/verify
 */
export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { token, machineId } = body;

    if (!token || !machineId) {
      return NextResponse.json({
        success: false,
        error: 'Token 和机器码不能为空'
      }, { status: 400 });
    }

    const hashedMachineId = hashMachineId(machineId);

    // 1. 检查 token 是否存在于预生成的 token 表中
    const tokenRows: any = await Database.query(
      'SELECT * FROM auth_tokens WHERE token = ?',
      [token]
    );

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无效的 Token'
      }, { status: 401 });
    }

    const tokenRecord = tokenRows[0];

    // 2. 如果 token 已被使用，检查机器码是否匹配
    if (tokenRecord.is_used) {
      const userRows: any = await Database.query(
        'SELECT * FROM users WHERE token = ?',
        [token]
      );

      if (!userRows || userRows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Token 已被使用但未找到用户记录'
        }, { status: 401 });
      }

      const user = userRows[0];

      if (user.machine_id !== hashedMachineId) {
        return NextResponse.json({
          success: false,
          error: '此 Token 已绑定其他设备'
        }, { status: 403 });
      }

      // 更新最后活跃时间
      await Database.execute(
        'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      return NextResponse.json({
        success: true,
        message: '验证成功',
        machineId: machineId,
        user: {
          id: user.id,
          createdAt: user.created_at
        }
      });
    }

    // 3. Token 未被使用，绑定机器码
    // 开始事务
    try {
      // 标记 token 为已使用
      await Database.execute(
        'UPDATE auth_tokens SET is_used = TRUE, used_at = CURRENT_TIMESTAMP WHERE token = ?',
        [token]
      );

      // 创建用户记录
      const result = await Database.execute(
        'INSERT INTO users (token, machine_id, created_at, last_active_at, is_active) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE)',
        [token, hashedMachineId]
      );

      return NextResponse.json({
        success: true,
        message: '注册成功',
        machineId: machineId,
        user: {
          id: result.insertId,
          createdAt: new Date()
        }
      });
    } catch (dbError) {
      console.error('Database transaction error:', dbError);
      return NextResponse.json({
        success: false,
        error: '注册失败，请重试'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Auth verify error:', error);
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 });
  }
}

/**
 * 检查认证状态
 * GET /api/auth/verify?machineId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: '缺少机器码'
      }, { status: 400 });
    }

    const hashedMachineId = hashMachineId(machineId);

    // 查找用户
    const userRows: any = await Database.query(
      'SELECT * FROM users WHERE machine_id = ? AND is_active = TRUE',
      [hashedMachineId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json({
        success: true,
        authenticated: false
      });
    }

    const user = userRows[0];

    // 更新最后活跃时间
    await Database.execute(
      'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        createdAt: user.created_at,
        lastActiveAt: user.last_active_at
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: '服务器错误'
    }, { status: 500 });
  }
}
