/**
 * DuckDuckGo 免费搜索服务
 * 完全免费，无需 API Key
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  site_name?: string;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

/**
 * DuckDuckGo 搜索
 * 使用 DuckDuckGo Instant Answer API
 */
export async function duckDuckGoSearch(
  query: string,
  options: {
    maxResults?: number;
    region?: string; // 地区代码，如 'cn-zh' 中国，'us-en' 美国
  } = {}
): Promise<SearchResponse> {
  const { maxResults = 5, region = 'cn-zh' } = options;
  
  try {
    // 使用 DuckDuckGo HTML 搜索页面进行爬取
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${region}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`搜索请求失败: ${response.status}`);
    }

    const html = await response.text();
    
    // 解析搜索结果
    const results = parseDuckDuckGoResults(html, maxResults);
    
    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('DuckDuckGo search failed:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : '搜索失败',
    };
  }
}

/**
 * 解析 DuckDuckGo HTML 结果
 */
function parseDuckDuckGoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  
  // 使用正则表达式解析 HTML
  // DuckDuckGo HTML 页面的结果格式：
  // <a class="result__a" href="...">标题</a>
  // <a class="result__url" href="...">域名</a>
  // <span class="result__snippet">摘要</span>
  
  const resultRegex = /<div class="result[^"]*"[^>]*>[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__url"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<span class="result__snippet">([\s\S]*?)<\/span>)?/gi;
  
  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
    const url = decodeHTMLEntities(match[1]);
    const title = cleanText(match[2]);
    const siteName = cleanText(match[3]);
    const snippet = cleanText(match[4] || '');
    
    // 过滤掉广告和无效链接
    if (url && title && !url.includes('duckduckgo.com')) {
      // 处理 DuckDuckGo 的重定向链接
      const actualUrl = extractActualUrl(url);
      
      results.push({
        title,
        snippet,
        url: actualUrl,
        site_name: siteName,
      });
    }
  }
  
  // 如果正则匹配失败，尝试备用解析方式
  if (results.length === 0) {
    const simpleRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    
    while ((match = simpleRegex.exec(html)) !== null && results.length < maxResults) {
      const url = decodeHTMLEntities(match[1]);
      const title = cleanText(match[2]);
      
      if (url && title && !url.includes('duckduckgo.com')) {
        const actualUrl = extractActualUrl(url);
        
        results.push({
          title,
          snippet: '',
          url: actualUrl,
        });
      }
    }
  }
  
  return results;
}

/**
 * 从 DuckDuckGo 重定向链接中提取实际 URL
 */
function extractActualUrl(redirectUrl: string): string {
  // DuckDuckGo 使用重定向链接格式：/l/?uddg=实际URL
  try {
    if (redirectUrl.includes('/l/?uddg=')) {
      const match = redirectUrl.match(/uddg=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return redirectUrl;
  } catch {
    return redirectUrl;
  }
}

/**
 * 清理 HTML 文本
 */
function cleanText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // 移除 HTML 标签
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 解码 HTML 实体
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * 统一搜索接口
 * 优先使用配置的搜索服务，未配置时使用免费的 DuckDuckGo
 */
export async function webSearch(
  query: string,
  options: {
    maxResults?: number;
    preferFree?: boolean; // 优先使用免费搜索
  } = {}
): Promise<SearchResponse> {
  const { maxResults = 5, preferFree = true } = options;
  
  // 如果优先使用免费搜索，直接使用 DuckDuckGo
  if (preferFree) {
    return duckDuckGoSearch(query, { maxResults });
  }
  
  // 否则尝试 Coze SDK（如果已配置）
  try {
    const { SearchClient, Config } = await import('coze-coding-dev-sdk');
    const apiKey = process.env.COZE_API_KEY;
    
    if (!apiKey) {
      // 未配置，降级到 DuckDuckGo
      return duckDuckGoSearch(query, { maxResults });
    }
    
    const config = new Config();
    const client = new SearchClient(config);
    const result = await client.webSearch(query, maxResults, true);
    
    if (result.web_items && result.web_items.length > 0) {
      return {
        success: true,
        results: result.web_items
          .filter(item => item.url) // 过滤掉没有 URL 的结果
          .map(item => ({
            title: item.title,
            snippet: item.snippet,
            url: item.url!,
            site_name: item.site_name,
          })),
      };
    }
    
    return { success: true, results: [] };
  } catch (error) {
    console.error('Coze search failed, falling back to DuckDuckGo:', error);
    // 降级到 DuckDuckGo
    return duckDuckGoSearch(query, { maxResults });
  }
}

export const SearchService = {
  duckDuckGoSearch,
  webSearch,
};
