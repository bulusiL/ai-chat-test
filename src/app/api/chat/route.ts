import { NextRequest, NextResponse } from 'next/server';
import { OllamaService, OllamaMessage } from '@/lib/ollama';
import { KnowledgeService } from '@/lib/knowledge';

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
      enableKnowledge = false,  // 默认关闭知识库（需要配置 SDK）
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
          // 1. 知识库搜索（可选）
          let knowledgeContext = '';
          let knowledgeResults: any[] = [];
          
          if (enableKnowledge) {
            try {
              knowledgeResults = await KnowledgeService.searchKnowledge(message, {
                topK: 3,
                minScore: 0.3,
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
          const systemPrompt = `你是一个专业的图书推荐和学习辅导助手，专门为中国中小学生和家长提供服务。

## 身份定位
- 你是一个面向中国中小学生的智能学习助手
- 你的用户是中国的小学生、初中生、高中生以及他们的家长和老师
- 你必须使用**中文**回答所有问题

## 核心原则
1. **语言要求**：必须使用中文回答，禁止使用英文或其他语言
2. **图书推荐原则**：
   - 优先推荐**中国作家**的优秀作品
   - 推荐适合中国学生的经典图书
   - 推荐人民教育出版社、少年儿童出版社等国内知名出版社的图书
   - 如果推荐外国作品，必须推荐**中文译本**，并提供中文书名
3. **年级匹配**：根据学生年级推荐合适的图书，用"适合X年级阅读"明确标注
4. **诚实态度**：不要编造书名或作者，如果不确定某本书是否存在，请诚实说明
5. **友好表达**：用简单易懂的语言，适合中小学生理解

## 图书推荐示例格式

推荐《书名》（作者：XXX）
- 适合年级：X年级
- 推荐理由：简要说明为什么推荐这本书
- 内容简介：用一两句话概括书籍内容

## 禁止行为
- 禁止推荐英文原版图书（除非用户明确要求）
- 禁止使用英文书名（必须使用中文译名）
- 禁止编造不存在的图书
- 禁止推荐不适合中小学生的内容

${knowledgeContext ? `## 知识库检索结果
${knowledgeContext}

请优先参考上述知识库内容回答问题。
` : ``}
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

          // 5. 联网搜索（可选，需要配置 SDK）
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
                encoder.encode(`data: ${JSON.stringify({ content: '⚠️ 联网搜索暂时不可用，使用普通模式回复\n\n' })}\n\n`)
              );
              
              // 降级到普通对话
              for await (const chunk of OllamaService.streamChat(messages, { model })) {
                const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          } else {
            // 普通对话
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
          
          // 发送错误信息给前端
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              error: errorMessage,
              content: `\n\n❌ 错误: ${errorMessage}\n\n请检查:\n1. Ollama 服务是否已启动 (运行 ollama serve)\n2. 模型是否已下载 (运行 ollama pull deepseek-r1:8b)`
            })}\n\n`)
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
