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
  if (cachedModels && now - lastModelCheck < 5 * 60 * 1000) {
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
 * 检查模型是否存在
 */
export async function checkModelExists(model: string, baseUrl: string = DEFAULT_OLLAMA_URL): Promise<boolean> {
  const models = await getAvailableModels(baseUrl);
  return models.length > 0 && models.some(m => m === model || m.startsWith(model.split(':')[0]));
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

  // 检查模型是否存在
  const models = await getAvailableModels(baseUrl);
  const modelExists = models.some(m => m === model || m.startsWith(model.split(':')[0]));
  
  if (!modelExists && models.length > 0) {
    // 模型不存在，尝试使用第一个可用模型
    const fallbackModel = models[0];
    console.warn(`Model ${model} not found, using ${fallbackModel} instead`);
    yield `⚠️ 模型 ${model} 未找到，使用 ${fallbackModel}\n\n`;
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: fallbackModel,
        messages,
        stream: true,
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
    return;
  }

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
      throw new Error(`模型 "${model}" 不存在。请运行: ollama pull ${model}`);
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
 * 注意：需要配置 coze-coding-dev-sdk
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

  // 1. 尝试联网搜索
  let searchContext = '';
  try {
    const { SearchClient, Config } = await import('coze-coding-dev-sdk');
    const searchConfig = new Config();
    const searchClient = new SearchClient(searchConfig);
    
    const searchResult = await searchClient.webSearch(searchQuery, searchCount, true);
    
    if (searchResult.web_items && searchResult.web_items.length > 0) {
      searchContext = '\n\n=== 联网搜索结果 ===\n';
      
      if (searchResult.summary) {
        searchContext += `\n摘要: ${searchResult.summary}\n`;
      }
      
      searchContext += '\n相关网页:\n';
      searchResult.web_items.forEach((item, index) => {
        searchContext += `\n${index + 1}. ${item.title}\n`;
        searchContext += `   来源: ${item.site_name}\n`;
        searchContext += `   摘要: ${item.snippet}\n`;
        searchContext += `   链接: ${item.url}\n`;
      });
      
      searchContext += '\n=== 搜索结果结束 ===\n\n';
    }
  } catch (error) {
    console.error('Web search failed:', error);
    // 搜索失败不影响对话继续
    yield '⚠️ 联网搜索暂时不可用\n\n';
  }

  // 2. 构建带搜索上下文的消息
  const systemMessage: OllamaMessage = {
    role: 'system',
    content: `你是一个有帮助的 AI 助手。${searchContext ? `当用户提供搜索结果时，请基于搜索结果回答问题，并注明信息来源。${searchContext}` : ''}`
  };

  const messagesWithContext = [systemMessage, ...messages];

  // 3. 调用 Ollama 进行对话
  yield* streamChat(messagesWithContext, { model, baseUrl });
}

export const OllamaService = {
  checkHealth: checkOllamaHealth,
  getModels: getAvailableModels,
  checkModelExists,
  streamChat,
  streamGenerate,
  chat,
  streamChatWithSearch,
};
