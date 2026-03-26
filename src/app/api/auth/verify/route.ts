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

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      
      // 检查 token 是否存在
      const isValid = await store.validateToken(token);
      if (!isValid) {
        return NextResponse.json({
          success: false,
          error: '无效的 Token'
        }, { status: 401 });
      }

      // 检查是否已有用户使用此机器码
      const existingUser = await store.getUserByMachineId(hashedMachineId);
      if (existingUser) {
        // 如果机器码已绑定，检查 token 是否匹配
        if (existingUser.token !== token) {
          return NextResponse.json({
            success: false,
            error: '此设备已绑定其他 Token'
          }, { status: 403 });
        }
        
        // 已验证过，更新活跃时间
        existingUser.last_active_at = new Date();
        
        return NextResponse.json({
          success: true,
          message: '验证成功',
          machineId: machineId,
          user: {
            id: existingUser.id,
            createdAt: existingUser.created_at
          }
        });
      }

      // 检查 token 是否已被其他设备使用
      const tokenUser = await store.getUserByToken(token);
      if (tokenUser) {
        // Token 已被使用，检查机器码
        if (tokenUser.machine_id !== hashedMachineId) {
          return NextResponse.json({
            success: false,
            error: '此 Token 已绑定其他设备'
          }, { status: 403 });
        }
        
        // 已验证过，更新活跃时间
        tokenUser.last_active_at = new Date();
        
        return NextResponse.json({
          success: true,
          message: '验证成功',
          machineId: machineId,
          user: {
            id: tokenUser.id,
            createdAt: tokenUser.created_at
          }
        });
      }

      // Token 未被使用，绑定机器码
      await store.useToken(token);
      const userId = await store.createUser(token, hashedMachineId);

      return NextResponse.json({
        success: true,
        message: '注册成功',
        machineId: machineId,
        user: {
          id: userId,
          createdAt: new Date()
        }
      });
    }

    // 使用数据库
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

    // 使用内存存储
    if (Database.isMemoryStore()) {
      const store = Database.getMemoryStore();
      const user = await store.getUserByMachineId(hashedMachineId);
      
      if (!user) {
        return NextResponse.json({
          success: true,
          authenticated: false
        });
      }

      // 更新最后活跃时间
      user.last_active_at = new Date();

      return NextResponse.json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          createdAt: user.created_at,
          lastActiveAt: user.last_active_at
        }
      });
    }

    // 使用数据库
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
