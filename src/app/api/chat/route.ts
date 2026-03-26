import { NextRequest, NextResponse } from 'next/server';
import { OllamaService, OllamaMessage } from '@/lib/ollama';
import { KnowledgeService } from '@/lib/knowledge';
import { HeaderUtils } from 'coze-coding-dev-sdk';

// 定义消息类型
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 定义请求体类型
interface ChatRequest {
  message: string;
  history?: Message[];
  enableSearch?: boolean;      // 是否启用联网搜索
  enableKnowledge?: boolean;   // 是否启用知识库
  model?: string;
  machineId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { 
      message, 
      history = [], 
      enableSearch = false, 
      enableKnowledge = true,  // 默认启用知识库
      model 
    } = body;

    if (!message || message.trim() === '') {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 提取请求头
          const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
          
          // 1. 如果启用知识库，先搜索相关知识
          let knowledgeContext = '';
          let knowledgeResults: any[] = [];
          
          if (enableKnowledge) {
            try {
              knowledgeResults = await KnowledgeService.searchKnowledge(message, {
                topK: 3,
                minScore: 0.3,
                customHeaders
              });
              
              if (knowledgeResults.length > 0) {
                knowledgeContext = '\n\n=== 相关知识库内容 ===\n';
                knowledgeResults.forEach((result, index) => {
                  knowledgeContext += `\n【参考资料 ${index + 1}】(相关度: ${(result.score * 100).toFixed(0)}%)\n${result.content}\n`;
                });
                knowledgeContext += '\n=== 知识库内容结束 ===\n';
              }
            } catch (searchError) {
              console.error('Knowledge search failed:', searchError);
              // 知识库搜索失败不影响对话继续
            }
          }

          // 2. 构建系统提示词
          const systemPrompt = `你是一个专业的图书推荐和学习辅导助手，专门帮助小学生和家长解决阅读和学习相关的问题。

## 核心原则
1. **准确性优先**：只回答你确定的知识，如果不确定或知识库中没有相关信息，请明确说明
2. **知识库优先**：优先使用提供的知识库内容回答问题
3. **诚实态度**：不要编造或猜测信息，宁可不回答也不要给出错误答案
4. **友好表达**：用简单易懂的语言，适合小学生理解
5. **推荐具体**：推荐图书时要具体说明适合几年级、为什么推荐

${knowledgeContext ? `## 知识库检索结果
${knowledgeContext}

请优先参考上述知识库内容回答问题。如果知识库中没有直接相关信息，请诚实说明，并基于你的一般知识给出建议，但要标注"以下建议仅供参考"。
` : `## 注意
知识库中没有找到与问题直接相关的内容。请基于你的基础知识回答，但要说明"知识库中暂无此信息，以下建议供参考"。
`}
`;

          // 3. 构建消息列表
          const messages: OllamaMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role, content: m.content }) as OllamaMessage),
            { role: 'user', content: message }
          ];

          // 4. 发送知识库匹配提示
          if (knowledgeResults.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                content: `📚 找到 ${knowledgeResults.length} 条相关知识\n\n` 
              })}\n\n`)
            );
          }

          // 5. 如果同时启用联网搜索
          if (enableSearch) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: '🔍 正在联网搜索...\n\n' })}\n\n`)
            );

            try {
              for await (const chunk of OllamaService.streamChatWithSearch(
                messages.slice(1),
                message,
                { model }
              )) {
                const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            } catch (searchError) {
              console.error('Web search failed:', searchError);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: '⚠️ 联网搜索暂时不可用\n\n' })}\n\n`)
              );
              
              for await (const chunk of OllamaService.streamChat(messages, { model })) {
                const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          } else {
            // 普通对话（使用知识库）
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
