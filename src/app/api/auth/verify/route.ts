import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';
import crypto from 'crypto';

interface VerifyRequest {
  token: string;
  machineId: string;
  deviceName?: string;
}

/**
 * 生成机器码的哈希值（用于安全存储）
 */
function hashMachineId(machineId: string): string {
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

/**
 * 验证 token
 * 一个 Token 可以被多个设备使用，不限制激活数量
 * POST /api/auth/verify
 */
export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { token, machineId, deviceName } = body;

    if (!token || !machineId) {
      return NextResponse.json({
        success: false,
        error: 'Token 和机器码不能为空'
      }, { status: 400 });
    }

    const hashedMachineId = hashMachineId(machineId);

    // 1. 检查 Token 是否存在且有效
    const tokenRows: any = await Database.query(
      'SELECT * FROM auth_tokens WHERE token = ? AND is_active = TRUE',
      [token]
    );

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无效的 Token 或 Token 已被禁用'
      }, { status: 401 });
    }

    const tokenRecord = tokenRows[0];

    // 2. 检查设备是否已注册
    const deviceRows: any = await Database.query(
      'SELECT * FROM devices WHERE machine_id = ?',
      [hashedMachineId]
    );

    if (deviceRows && deviceRows.length > 0) {
      // 设备已注册，检查使用的 Token
      const device = deviceRows[0];
      
      if (device.token !== token) {
        // 设备使用的是其他 Token，更新为新 Token
        await Database.execute(
          'UPDATE devices SET token = ?, device_name = ?, last_active_at = CURRENT_TIMESTAMP WHERE machine_id = ?',
          [token, deviceName || device.device_name, hashedMachineId]
        );
      } else {
        // 更新最后活跃时间
        await Database.execute(
          'UPDATE devices SET last_active_at = CURRENT_TIMESTAMP WHERE machine_id = ?',
          [hashedMachineId]
        );
      }

      return NextResponse.json({
        success: true,
        message: '验证成功',
        machineId: machineId,
        device: {
          id: device.id,
          deviceName: device.device_name,
          createdAt: device.created_at
        }
      });
    }

    // 3. 新设备注册
    await Database.execute(
      'INSERT INTO devices (token, machine_id, device_name, last_active_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [token, hashedMachineId, deviceName || 'Unknown Device']
    );

    // 4. 更新 Token 的设备计数
    await Database.execute(
      'UPDATE auth_tokens SET device_count = device_count + 1 WHERE id = ?',
      [tokenRecord.id]
    );

    return NextResponse.json({
      success: true,
      message: '设备注册成功',
      machineId: machineId,
      device: {
        deviceName: deviceName || 'Unknown Device',
        createdAt: new Date()
      }
    });

  } catch (error) {
    console.error('Auth verify error:', error);
    return NextResponse.json({
      success: false,
      error: '服务器错误: ' + (error instanceof Error ? error.message : '数据库连接失败')
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

    // 查找设备
    const deviceRows: any = await Database.query(`
      SELECT d.*, t.is_active as token_active
      FROM devices d
      JOIN auth_tokens t ON d.token = t.token
      WHERE d.machine_id = ?
    `, [hashedMachineId]);

    if (!deviceRows || deviceRows.length === 0) {
      return NextResponse.json({
        success: true,
        authenticated: false
      });
    }

    const device = deviceRows[0];

    // 检查 Token 是否仍然有效
    if (!device.token_active) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        error: 'Token 已被禁用'
      });
    }

    // 更新最后活跃时间
    await Database.execute(
      'UPDATE devices SET last_active_at = CURRENT_TIMESTAMP WHERE machine_id = ?',
      [hashedMachineId]
    );

    return NextResponse.json({
      success: true,
      authenticated: true,
      device: {
        id: device.id,
        deviceName: device.device_name,
        createdAt: device.created_at,
        lastActiveAt: device.last_active_at
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: '服务器错误: ' + (error instanceof Error ? error.message : '数据库连接失败')
    }, { status: 500 });
  }
}
