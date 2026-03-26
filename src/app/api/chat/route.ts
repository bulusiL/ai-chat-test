import { NextRequest, NextResponse } from 'next/server';
import { OllamaService, OllamaMessage } from '@/lib/ollama';

// 定义消息类型
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 定义请求体类型
interface ChatRequest {
  message: string;
  history?: Message[];
  enableSearch?: boolean;  // 是否启用联网搜索
  model?: string;          // 指定模型
  machineId?: string;      // 用户机器码（认证后使用）
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history = [], enableSearch = false, model } = body;

    if (!message || message.trim() === '') {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 构建消息列表
    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: '你是一个友好、专业的 AI 助手。请用简洁、清晰的语言回答用户的问题。如果提供了搜索结果，请基于搜索结果回答并注明来源。'
      },
      ...history.map(m => ({ role: m.role, content: m.content }) as OllamaMessage),
      { role: 'user', content: message }
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 如果启用联网搜索
          if (enableSearch) {
            // 先发送搜索提示
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: '🔍 正在联网搜索...\n\n' })}\n\n`)
            );

            try {
              // 使用带搜索的流式对话
              for await (const chunk of OllamaService.streamChatWithSearch(
                messages.slice(1), // 不重复发送 system message
                message,
                { model }
              )) {
                const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            } catch (searchError) {
              // 如果搜索失败，降级到普通对话
              console.error('Search failed, falling back to normal chat:', searchError);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: '⚠️ 联网搜索暂时不可用，使用本地知识回答\n\n' })}\n\n`)
              );
              
              for await (const chunk of OllamaService.streamChat(messages, { model })) {
                const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          } else {
            // 普通对话（无联网搜索）
            for await (const chunk of OllamaService.streamChat(messages, { model })) {
              const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // 发送结束标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
