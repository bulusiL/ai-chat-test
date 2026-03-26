/**
 * 多源免费搜索服务
 * 支持：Wikipedia API、模拟搜索、离线知识库
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
  source?: string; // 数据来源
}

/**
 * Wikipedia API 搜索（完全免费，无需配置）
 * 适合查询知识性问题
 */
export async function wikipediaSearch(
  query: string,
  options: { maxResults?: number; language?: string } = {}
): Promise<SearchResponse> {
  const { maxResults = 3, language = 'zh' } = options;
  
  try {
    // 搜索 Wikipedia
    const searchUrl = `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=${maxResults}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'AI-Chat-Assistant/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Wikipedia API 错误: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.query?.search || data.query.search.length === 0) {
      return { success: true, results: [], source: 'wikipedia' };
    }

    // 获取每个结果的摘要
    const results: SearchResult[] = [];
    
    for (const item of data.query.search) {
      const pageId = item.pageid;
      
      // 获取页面摘要
      const extractUrl = `https://${language}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json&origin=*&exsentences=3`;
      
      try {
        const extractResponse = await fetch(extractUrl, {
          headers: {
            'User-Agent': 'AI-Chat-Assistant/1.0',
          },
        });
        
        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          const extract = extractData.query?.pages?.[pageId]?.extract || '';
          
          results.push({
            title: item.title,
            snippet: extract.substring(0, 300) + (extract.length > 300 ? '...' : ''),
            url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            site_name: '维基百科',
          });
        }
      } catch {
        // 如果获取摘要失败，使用搜索结果中的摘要
        results.push({
          title: item.title,
          snippet: item.snippet || '',
          url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          site_name: '维基百科',
        });
      }
    }

    return {
      success: true,
      results,
      source: 'wikipedia',
    };
  } catch (error) {
    console.error('Wikipedia search failed:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Wikipedia 搜索失败',
      source: 'wikipedia',
    };
  }
}

/**
 * Bing Search API（需要 API Key，有免费额度）
 * 免费额度：每月 1000 次搜索
 * 申请地址：https://azure.microsoft.com/services/cognitive-services/bing-web-search-api/
 */
export async function bingSearch(
  query: string,
  options: { maxResults?: number } = {}
): Promise<SearchResponse> {
  const { maxResults = 5 } = options;
  const apiKey = process.env.BING_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      results: [],
      error: 'Bing API Key 未配置',
      source: 'bing',
    };
  }

  try {
    const searchUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${maxResults}&mkt=zh-CN`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Bing API 错误: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.webPages?.value || data.webPages.value.length === 0) {
      return { success: true, results: [], source: 'bing' };
    }

    const results: SearchResult[] = data.webPages.value.map((item: {
      name: string;
      snippet: string;
      url: string;
      displayUrl: string;
    }) => ({
      title: item.name,
      snippet: item.snippet,
      url: item.url,
      site_name: item.displayUrl,
    }));

    return {
      success: true,
      results,
      source: 'bing',
    };
  } catch (error) {
    console.error('Bing search failed:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Bing 搜索失败',
      source: 'bing',
    };
  }
}

/**
 * SerpAPI 搜索（有免费额度）
 * 免费额度：每月 100 次
 * 申请地址：https://serpapi.com/
 */
export async function serpApiSearch(
  query: string,
  options: { maxResults?: number } = {}
): Promise<SearchResponse> {
  const { maxResults = 5 } = options;
  const apiKey = process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      results: [],
      error: 'SerpAPI Key 未配置',
      source: 'serpapi',
    };
  }

  try {
    const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=${maxResults}&hl=zh-cn`;
    
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`SerpAPI 错误: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.organic_results || data.organic_results.length === 0) {
      return { success: true, results: [], source: 'serpapi' };
    }

    const results: SearchResult[] = data.organic_results.slice(0, maxResults).map((item: {
      title: string;
      snippet: string;
      link: string;
      displayed_link: string;
    }) => ({
      title: item.title,
      snippet: item.snippet || '',
      url: item.link,
      site_name: item.displayed_link,
    }));

    return {
      success: true,
      results,
      source: 'serpapi',
    };
  } catch (error) {
    console.error('SerpAPI search failed:', error);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'SerpAPI 搜索失败',
      source: 'serpapi',
    };
  }
}

/**
 * 统一搜索接口
 * 按优先级尝试多种搜索方式
 */
export async function webSearch(
  query: string,
  options: {
    maxResults?: number;
    skipWikipedia?: boolean;
  } = {}
): Promise<SearchResponse> {
  const { maxResults = 5, skipWikipedia = false } = options;

  // 1. 尝试 Bing（如果配置了）
  const bingResult = await bingSearch(query, { maxResults });
  if (bingResult.success && bingResult.results.length > 0) {
    return bingResult;
  }

  // 2. 尝试 SerpAPI（如果配置了）
  const serpResult = await serpApiSearch(query, { maxResults });
  if (serpResult.success && serpResult.results.length > 0) {
    return serpResult;
  }

  // 3. 尝试 Wikipedia（完全免费）
  if (!skipWikipedia) {
    const wikiResult = await wikipediaSearch(query, { maxResults });
    if (wikiResult.success && wikiResult.results.length > 0) {
      return wikiResult;
    }
  }

  // 4. 所有搜索方式都失败
  return {
    success: false,
    results: [],
    error: '所有搜索方式均不可用。建议配置 Bing API Key 以获得更好的搜索体验。',
    source: 'none',
  };
}

/**
 * 判断是否需要联网搜索
 * 根据问题类型决定是否需要搜索
 */
export function shouldSearch(query: string): boolean {
  // 关键词列表：这些问题适合联网搜索
  const searchKeywords = [
    '天气', '气温', '下雨', '晴天',
    '最新', '新闻', '最近', '今天', '昨天',
    '股票', '基金', '价格', '汇率',
    '时间', '几点',
    '在哪里', '怎么走', '地址',
    '正在', '实时',
    '比分', '比赛', '赛事',
  ];
  
  const lowerQuery = query.toLowerCase();
  return searchKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * 获取搜索服务状态
 */
export function getSearchStatus(): {
  bing: boolean;
  serpapi: boolean;
  wikipedia: boolean;
} {
  return {
    bing: !!process.env.BING_API_KEY,
    serpapi: !!process.env.SERPAPI_KEY,
    wikipedia: true, // Wikipedia 始终可用
  };
}

export const SearchService = {
  wikipediaSearch,
  bingSearch,
  serpApiSearch,
  webSearch,
  shouldSearch,
  getSearchStatus,
};
