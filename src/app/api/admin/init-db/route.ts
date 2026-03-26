import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';

/**
 * 初始化数据库表
 * POST /api/admin/init-db
 */
export async function POST(request: NextRequest) {
  try {
    // 先测试数据库连接
    const connectionTest = await Database.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: connectionTest.message,
        hint: '请检查数据库配置：\n1. 确保数据库服务已启动\n2. 检查 .env.local 中的数据库配置\n3. 确保数据库已创建'
      }, { status: 500 });
    }
    
    await Database.initDatabase();
    
    return NextResponse.json({
      success: true,
      message: '数据库表初始化成功',
      connection: connectionTest.message
    });
  } catch (error) {
    console.error('Init database error:', error);
    return NextResponse.json({
      success: false,
      error: '初始化失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}

/**
 * 获取数据库连接状态
 * GET /api/admin/init-db
 */
export async function GET(request: NextRequest) {
  try {
    const connectionTest = await Database.testConnection();
    const config = Database.getDatabaseConfig();
    
    return NextResponse.json({
      success: true,
      connected: connectionTest.success,
      message: connectionTest.message,
      config: {
        type: config.type,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username
        // 不返回密码
      }
    });
  } catch (error) {
    console.error('Get database status error:', error);
    return NextResponse.json({
      success: false,
      error: '获取状态失败'
    }, { status: 500 });
  }
}
