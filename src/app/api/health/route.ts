import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function GET(request: NextRequest) {
  try {
    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    
    // 初始化 LLM 客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 测试连接 - 发送一个简单的消息
    const messages = [{ role: 'user' as const, content: 'hi' }];
    
    try {
      await client.invoke(messages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.7,
      });

      return NextResponse.json({
        status: 'ok',
        message: 'AI 服务连接正常',
        timestamp: new Date().toISOString()
      });
    } catch (apiError) {
      console.error('AI API connection failed:', apiError);
      return NextResponse.json({
        status: 'error',
        message: 'AI 服务连接失败',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      message: '健康检查失败',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
