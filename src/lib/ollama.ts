/**
 * Ollama 本地模型服务
 * 用于连接本地 Ollama 服务进行 AI 对话
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaRequest {
  model: string;
  messages?: OllamaMessage[];
  prompt?: string;
  stream?: boolean;
  context?: number[];
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  response?: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

// 默认配置
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

// 缓存可用模型列表
let cachedModels: string[] = [];
let lastModelCheck = 0;

/**
 * 检查联网搜索 SDK 是否已配置
 */
export function isWebSearchConfigured(): boolean {
  // 检查必要的环境变量
  const apiKey = process.env.COZE_API_KEY;
  const baseUrl = process.env.COZE_BASE_URL;
  
  // 需要至少有 API Key
  return !!(apiKey && apiKey.length > 0);
}

/**
 * 检查 Ollama 服务是否可用
 */
export async function checkOllamaHealth(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<{
  healthy: boolean;
  message: string;
  models?: string[];
}> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return {
        healthy: false,
        message: `Ollama 服务响应异常: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    
    return {
      healthy: true,
      message: `Ollama 服务正常，可用模型: ${models.join(', ') || '无'}`,
      models
    };
  } catch (error) {
    return {
      healthy: false,
      message: `无法连接到 Ollama 服务 (${baseUrl})。请确保:\n1. Ollama 已安装并运行 (运行 ollama serve)\n2. 已下载模型 (运行 ollama pull ${DEFAULT_MODEL})`
    };
  }
}

/**
 * 获取可用的模型列表
 */
export async function getAvailableModels(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<string[]> {
  // 使用缓存（5分钟有效）
  const now = Date.now();
  if (cachedModels.length > 0 && now - lastModelCheck < 5 * 60 * 1000) {
    return cachedModels;
  }
  
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return [];
    
    const data = await response.json();
    cachedModels = data.models?.map((m: any) => m.name) || [];
    lastModelCheck = now;
    return cachedModels;
  } catch (error) {
    console.error('Failed to get models:', error);
    return [];
  }
}

/**
 * 流式聊天 - 使用 messages API (推荐)
 */
export async function* streamChat(
  messages: OllamaMessage[],
  options: {
    model?: string;
    baseUrl?: string;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const { model = DEFAULT_MODEL, baseUrl = DEFAULT_OLLAMA_URL } = options;

  // 直接尝试调用 API
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      // 模型不存在，尝试获取可用模型列表
      const availableModels = await getAvailableModels(baseUrl);
      if (availableModels.length > 0) {
        const fallbackModel = availableModels[0];
        console.warn(`Model ${model} not found, using ${fallbackModel} instead`);
        yield `⚠️ 模型 "${model}" 未找到，自动使用 "${fallbackModel}"\n\n`;
        
        // 使用第一个可用模型重试
        const retryResponse = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: fallbackModel,
            messages,
            stream: true,
          }),
        });
        
        if (retryResponse.ok) {
          const reader = retryResponse.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());
                for (const line of lines) {
                  try {
                    const data: OllamaResponse = JSON.parse(line);
                    if (data.message?.content) {
                      yield data.message.content;
                    }
                  } catch (e) {}
                }
              }
            } finally {
              reader.releaseLock();
            }
          }
          return;
        }
      }
      
      throw new Error(`模型 "${model}" 不存在。\n\n可用模型: ${availableModels.length > 0 ? availableModels.join(', ') : '无'}\n\n请运行: ollama pull ${model}`);
    }
    throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法获取响应流');
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data: OllamaResponse = JSON.parse(line);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 流式聊天 - 使用 generate API (兼容旧模型)
 */
export async function* streamGenerate(
  prompt: string,
  options: {
    model?: string;
    baseUrl?: string;
    context?: number[];
  } = {}
): AsyncGenerator<{ content: string; context?: number[] }, void, unknown> {
  const { model = DEFAULT_MODEL, baseUrl = DEFAULT_OLLAMA_URL, context } = options;

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法获取响应流');
  }

  const decoder = new TextDecoder();
  let lastContext: number[] | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data: OllamaResponse = JSON.parse(line);
          if (data.response) {
            yield { content: data.response, context: data.context };
            if (data.context) {
              lastContext = data.context;
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (lastContext) {
    yield { content: '', context: lastContext };
  }
}

/**
 * 非流式聊天
 */
export async function chat(
  messages: OllamaMessage[],
  options: {
    model?: string;
    baseUrl?: string;
  } = {}
): Promise<string> {
  const { model = DEFAULT_MODEL, baseUrl = DEFAULT_OLLAMA_URL } = options;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`);
  }

  const data: OllamaResponse = await response.json();
  return data.message?.content || '';
}

/**
 * 带联网搜索的对话
 * 支持多种搜索方式，优先使用免费的 Wikipedia
 */
export async function* streamChatWithSearch(
  messages: OllamaMessage[],
  searchQuery: string,
  options: {
    model?: string;
    baseUrl?: string;
    searchCount?: number;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const { model = DEFAULT_MODEL, baseUrl = DEFAULT_OLLAMA_URL, searchCount = 5 } = options;

  // 1. 联网搜索
  let searchContext = '';
  let searchSource = '';
  
  try {
    const { webSearch, shouldSearch, getSearchStatus } = await import('./search');
    
    // 检查是否需要搜索
    if (!shouldSearch(searchQuery)) {
      yield '💡 这个问题可能不需要联网搜索，我将使用知识库回答。\n\n';
    } else {
      // 显示搜索状态
      const status = getSearchStatus();
      const availableServices = [];
      if (status.bing) availableServices.push('Bing');
      if (status.serpapi) availableServices.push('SerpAPI');
      availableServices.push('Wikipedia');
      
      yield `🔍 正在联网搜索...（可用服务: ${availableServices.join(', ')}）\n\n`;
      
      const result = await webSearch(searchQuery, { maxResults: searchCount });
      
      if (result.success && result.results.length > 0) {
        searchSource = result.source || '';
        searchContext = '\n\n=== 联网搜索结果 ===\n';
        searchContext += `\n来源: ${searchSource}\n`;
        searchContext += '\n找到以下相关信息:\n';
        
        result.results.forEach((item, index) => {
          searchContext += `\n${index + 1}. ${item.title}\n`;
          if (item.site_name) {
            searchContext += `   来源: ${item.site_name}\n`;
          }
          if (item.snippet) {
            searchContext += `   摘要: ${item.snippet}\n`;
          }
          searchContext += `   链接: ${item.url}\n`;
        });
        
        searchContext += '\n=== 搜索结果结束 ===\n\n';
      } else if (!result.success) {
        yield `⚠️ ${result.error || '搜索失败'}\n\n`;
      } else {
        yield '⚠️ 未找到相关搜索结果\n\n';
      }
    }
  } catch (error) {
    console.error('Web search failed:', error);
    yield '⚠️ 联网搜索暂时不可用，将使用知识库回答\n\n';
  }

  // 2. 构建系统提示词
  const systemPrompt = `你是一个专业的 AI 助手，专门为中国中小学生和家长提供服务。

## 核心原则
1. 必须使用中文回答
2. 优先使用简单易懂的语言
3. 回答要准确、有帮助
4. 如果提供了搜索结果，请基于搜索结果回答，并注明信息来源

${searchContext ? `## 搜索结果
${searchContext}

请基于上述搜索结果回答用户问题，并在回答中引用相关信息来源。
` : ''}`;

  // 3. 构建消息列表
  const messagesWithContext: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // 4. 调用 Ollama 进行对话
  yield* streamChat(messagesWithContext, { model, baseUrl });
}

export const OllamaService = {
  checkHealth: checkOllamaHealth,
  getModels: getAvailableModels,
  streamChat,
  streamGenerate,
  chat,
  streamChatWithSearch,
};
