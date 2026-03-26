/**
 * 知识库服务
 * 用于管理图书和小学生学习相关的知识
 * 
 * 注意：使用此服务需要配置 coze-coding-dev-sdk 的相关凭证
 */

// 是否启用 SDK（检查是否配置）
const isSDKConfigured = (): boolean => {
  // 检查是否有必要的环境变量配置
  // 如果没有配置，返回 false，禁用 SDK 功能
  return false; // 默认关闭，需要配置 SDK 后开启
};

/**
 * 知识文档接口
 */
export interface KnowledgeEntry {
  id?: string;
  title: string;
  content: string;
  category: 'book' | 'study' | 'other';
  tags?: string[];
}

/**
 * 搜索结果接口
 */
export interface KnowledgeSearchResult {
  content: string;
  score: number;
  docId?: string;
}

// 内置知识库（离线模式使用）
const offlineKnowledge: KnowledgeEntry[] = [
  {
    title: '适合小学低年级（1-2年级）阅读的图书推荐',
    category: 'book',
    tags: ['低年级', '绘本', '拼音'],
    content: `小学低年级（1-2年级）推荐阅读书目：

1. **绘本类**
   - 《猜猜我有多爱你》- 表达亲情，温馨感人
   - 《逃家小兔》- 经典绘本，讲述母爱
   - 《好饿的毛毛虫》- 认知启蒙，色彩鲜艳
   - 《爷爷一定有办法》- 温情故事，培养想象力

2. **桥梁书（带拼音）**
   - 《神奇校车》系列 - 科学启蒙，故事有趣
   - 《小猪唏哩呼噜》 - 语言幽默，适合朗读
   - 《青蛙和蟾蜍》系列 - 友谊主题，文字简单

3. **传统文化**
   - 《中国神话故事》注音版
   - 《成语故事》注音版
   - 《三字经》注音版

阅读建议：每天15-20分钟，家长可以陪伴阅读。`
  },
  {
    title: '适合小学中年级（3-4年级）阅读的图书推荐',
    category: 'book',
    tags: ['中年级', '童话', '科普'],
    content: `小学中年级（3-4年级）推荐阅读书目：

1. **童话与小说**
   - 《夏洛的网》- 关于友谊与生命的经典
   - 《小王子》- 哲学启蒙，适合亲子共读
   - 《长袜子皮皮》- 充满想象力的故事
   - 《窗边的小豆豆》- 教育主题，真实感人

2. **科普读物**
   - 《十万个为什么》- 科普经典
   - 《可怕的科学》系列 - 趣味科普
   - 《森林报》- 自然观察

3. **历史与传统文化**
   - 《吴姐姐讲历史故事》
   - 《中国民间故事》
   - 《林汉达中国历史故事集》

阅读建议：可以开始尝试独立阅读，每周至少2-3本书。`
  },
  {
    title: '适合小学高年级（5-6年级）阅读的图书推荐',
    category: 'book',
    tags: ['高年级', '名著', '成长'],
    content: `小学高年级（5-6年级）推荐阅读书目：

1. **中外名著入门**
   - 《城南旧事》- 林海音代表作
   - 《汤姆·索亚历险记》- 马克·吐温
   - 《鲁滨逊漂流记》- 冒险与生存
   - 《昆虫记》- 法布尔，自然观察经典
   - 《海底两万里》- 凡尔纳科幻经典

2. **成长小说**
   - 《青铜葵花》- 曹文轩
   - 《狼王梦》- 沈石溪动物小说

3. **历史与传记**
   - 《写给儿童的中国历史》
   - 《名人传》- 罗曼·罗兰

阅读建议：培养深度阅读习惯，可以尝试写读书笔记。`
  },
  {
    title: '小学生语文学习方法',
    category: 'study',
    tags: ['语文', '阅读', '写作'],
    content: `小学语文学习方法指导：

1. **识字与写字**
   - 每天坚持练字15分钟
   - 注意笔画顺序和字形结构

2. **阅读理解**
   - 每天阅读30分钟以上
   - 遇到不认识的字要查字典
   - 学会做简单的读书笔记

3. **写作技巧**
   - 低年级：看图写话，从简单句子开始
   - 中年级：写日记，记录生活点滴
   - 高年级：写读后感，尝试多种文体

4. **古诗词学习**
   - 每周背诵2-3首古诗
   - 理解诗意，不只是死记硬背

家长建议：多鼓励，少批评，培养孩子对语文的兴趣。`
  },
  {
    title: '小学生数学学习方法',
    category: 'study',
    tags: ['数学', '计算', '思维'],
    content: `小学数学学习方法指导：

1. **基础计算**
   - 低年级：口算练习，每天10-20题
   - 中年级：熟练掌握四则运算
   - 高年级：分数、小数混合运算

2. **应用题技巧**
   - 认真读题，理解题意
   - 找出已知条件和问题
   - 画图帮助理解

3. **几何图形**
   - 认识基本图形的特征
   - 动手剪、拼、折，建立空间概念

4. **错题整理**
   - 准备错题本
   - 分析错误原因
   - 定期复习错题

家长建议：不要只关注分数，要关注孩子的思考过程。`
  },
  {
    title: '小学生英语学习方法',
    category: 'study',
    tags: ['英语', '单词', '口语'],
    content: `小学英语学习方法指导：

1. **词汇积累**
   - 低年级：每课单词要会读、会说
   - 中年级：开始拼写单词
   - 高年级：学习词组和固定搭配

2. **听力训练**
   - 每天听英语音频10-15分钟
   - 看英文动画片

3. **口语练习**
   - 跟读课文录音
   - 和同学用英语对话
   - 唱英文歌曲

4. **阅读入门**
   - 从绘本开始
   - 《牛津树》系列分级读物

家长建议：创造英语环境，让学习变得有趣。`
  }
];

/**
 * 搜索知识库（离线模式 - 使用内置知识）
 */
export async function searchKnowledge(
  query: string,
  options: {
    topK?: number;
    minScore?: number;
  } = {}
): Promise<KnowledgeSearchResult[]> {
  const { topK = 5, minScore = 0.3 } = options;
  
  // 如果 SDK 已配置，使用在线知识库
  if (isSDKConfigured()) {
    try {
      // 动态导入 SDK
      const { KnowledgeClient, Config } = await import('coze-coding-dev-sdk');
      const config = new Config();
      const client = new KnowledgeClient(config);
      
      const response = await client.search(query, ['books_and_education'], topK, minScore);
      
      if (response.code === 0 && response.chunks) {
        return response.chunks.map(chunk => ({
          content: chunk.content,
          score: chunk.score,
          docId: chunk.doc_id
        }));
      }
    } catch (error) {
      console.error('Online knowledge search failed:', error);
      // 降级到离线模式
    }
  }
  
  // 离线模式：简单的关键词匹配
  const results: KnowledgeSearchResult[] = [];
  const queryLower = query.toLowerCase();
  
  for (const entry of offlineKnowledge) {
    let score = 0;
    const contentLower = entry.content.toLowerCase();
    const titleLower = entry.title.toLowerCase();
    const tagsLower = (entry.tags || []).join(' ').toLowerCase();
    
    // 标题匹配（权重高）
    if (titleLower.includes(queryLower)) {
      score += 0.5;
    }
    
    // 标签匹配
    if (tagsLower.includes(queryLower)) {
      score += 0.3;
    }
    
    // 内容匹配
    if (contentLower.includes(queryLower)) {
      score += 0.2;
    }
    
    // 关键词分词匹配
    const keywords = queryLower.split(/\s+/);
    for (const keyword of keywords) {
      if (keyword.length > 1) {
        if (titleLower.includes(keyword)) score += 0.1;
        if (contentLower.includes(keyword)) score += 0.05;
        if (tagsLower.includes(keyword)) score += 0.1;
      }
    }
    
    if (score >= minScore) {
      results.push({
        content: `【${entry.title}】\n\n${entry.content}`,
        score: Math.min(score, 1)
      });
    }
  }
  
  // 按相关度排序，返回前 topK 个
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * 构建带知识上下文的系统提示词
 */
export function buildKnowledgePrompt(
  knowledgeResults: KnowledgeSearchResult[],
  userQuestion: string
): string {
  let prompt = `你是一个专业的图书推荐和学习辅导助手，专门帮助小学生和家长解决阅读和学习相关的问题。

## 核心原则
1. **准确性优先**：只回答你确定的知识
2. **知识库优先**：优先使用提供的知识库内容回答问题
3. **诚实态度**：不要编造或猜测信息
4. **友好表达**：用简单易懂的语言

`;

  if (knowledgeResults.length > 0) {
    prompt += `## 相关知识库内容\n\n`;
    knowledgeResults.forEach((result, index) => {
      prompt += `### 参考资料 ${index + 1}（相关度: ${(result.score * 100).toFixed(1)}%）\n`;
      prompt += `${result.content}\n\n`;
    });
  }

  return prompt;
}

export const KnowledgeService = {
  searchKnowledge,
  buildKnowledgePrompt,
};
