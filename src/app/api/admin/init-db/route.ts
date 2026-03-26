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
    await Database.initDatabase();
    
    return NextResponse.json({
      success: true,
      message: '数据库表初始化成功'
    });
  } catch (error) {
    console.error('Init database error:', error);
    return NextResponse.json({
      success: false,
      error: '初始化失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 });
  }
}
