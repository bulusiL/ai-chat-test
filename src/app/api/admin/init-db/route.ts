import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/db';

/**
 * 初始化数据库表
 * POST /api/admin/init-db
 * 
 * 注意：生产环境中应该添加管理员认证
 */
export async function POST(request: NextRequest) {
  try {
    // 检查是否使用内存存储
    if (Database.isMemoryStore()) {
      return NextResponse.json({
        success: true,
        message: '使用内存存储模式，无需初始化数据库表',
        storage: 'memory',
        note: '数据仅在内存中保存，服务重启后会丢失。如需持久化存储，请配置数据库环境变量。'
      });
    }
    
    await Database.initDatabase();
    
    return NextResponse.json({
      success: true,
      message: '数据库表初始化成功',
      storage: 'database'
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
 * 获取存储状态
 * GET /api/admin/init-db
 */
export async function GET(request: NextRequest) {
  try {
    const isMemory = Database.isMemoryStore();
    
    return NextResponse.json({
      success: true,
      storage: isMemory ? 'memory' : 'database',
      message: isMemory 
        ? '当前使用内存存储，数据仅在内存中保存' 
        : '当前使用数据库存储'
    });
  } catch (error) {
    console.error('Get storage status error:', error);
    return NextResponse.json({
      success: false,
      error: '获取状态失败'
    }, { status: 500 });
  }
}
