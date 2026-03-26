/**
 * 知识库服务
 * 用于管理图书和小学生学习相关的知识
 */

import { 
  KnowledgeClient, 
  Config, 
  KnowledgeDocument, 
  DataSourceType,
  ChunkConfig,
  HeaderUtils
} from 'coze-coding-dev-sdk';

// 知识库数据集名称
const KNOWLEDGE_DATASET = 'books_and_education';

// 知识库客户端
let knowledgeClient: KnowledgeClient | null = null;

/**
 * 获取知识库客户端
 */
export function getKnowledgeClient(customHeaders?: Record<string, string>): KnowledgeClient {
  if (!knowledgeClient) {
    const config = new Config();
    knowledgeClient = new KnowledgeClient(config, customHeaders);
  }
  return knowledgeClient;
}

/**
 * 知识文档接口
 */
export interface KnowledgeEntry {
  id?: string;
  title: string;
  content: string;
  category: 'book' | 'study' | 'other';  // 图书 / 学习 / 其他
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

/**
 * 导入知识到知识库
 */
export async function importKnowledge(
  entries: KnowledgeEntry[],
  customHeaders?: Record<string, string>
): Promise<{ success: boolean; docIds?: string[]; error?: string }> {
  try {
    const client = getKnowledgeClient(customHeaders);
    
    // 将知识条目转换为文档格式
    const documents: KnowledgeDocument[] = entries.map(entry => {
      const formattedContent = `【${entry.category === 'book' ? '图书' : entry.category === 'study' ? '学习' : '其他'}】${entry.title}\n\n${entry.content}${entry.tags ? `\n\n标签: ${entry.tags.join(', ')}` : ''}`;
      
      return {
        source: DataSourceType.TEXT,
        raw_data: formattedContent
      };
    });

    // 分块配置
    const chunkConfig: ChunkConfig = {
      separator: '\n\n',
      max_tokens: 1000,
      remove_extra_spaces: true
    };

    // 导入文档
    const response = await client.addDocuments(documents, KNOWLEDGE_DATASET, chunkConfig);

    if (response.code === 0) {
      return { 
        success: true, 
        docIds: response.doc_ids 
      };
    } else {
      return { 
        success: false, 
        error: response.msg || '导入失败' 
      };
    }
  } catch (error) {
    console.error('Import knowledge error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '导入失败' 
    };
  }
}

/**
 * 从 URL 导入知识
 */
export async function importFromUrl(
  url: string,
  customHeaders?: Record<string, string>
): Promise<{ success: boolean; docId?: string; error?: string }> {
  try {
    const client = getKnowledgeClient(customHeaders);
    
    const documents: KnowledgeDocument[] = [
      {
        source: DataSourceType.URL,
        url: url
      }
    ];

    const chunkConfig: ChunkConfig = {
      separator: '\n\n',
      max_tokens: 1000,
      remove_extra_spaces: true
    };

    const response = await client.addDocuments(documents, KNOWLEDGE_DATASET, chunkConfig);

    if (response.code === 0) {
      return { 
        success: true, 
        docId: response.doc_ids?.[0]
      };
    } else {
      return { 
        success: false, 
        error: response.msg || '导入失败' 
      };
    }
  } catch (error) {
    console.error('Import from URL error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '导入失败' 
    };
  }
}

/**
 * 搜索知识库
 */
export async function searchKnowledge(
  query: string,
  options: {
    topK?: number;
    minScore?: number;
    customHeaders?: Record<string, string>;
  } = {}
): Promise<KnowledgeSearchResult[]> {
  const { topK = 5, minScore = 0.5, customHeaders } = options;
  
  try {
    const client = getKnowledgeClient(customHeaders);
    
    const response = await client.search(
      query,
      [KNOWLEDGE_DATASET],  // 只搜索我们的知识库
      topK,
      minScore
    );

    if (response.code === 0 && response.chunks) {
      return response.chunks.map(chunk => ({
        content: chunk.content,
        score: chunk.score,
        docId: chunk.doc_id
      }));
    }

    return [];
  } catch (error) {
    console.error('Search knowledge error:', error);
    return [];
  }
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
1. **准确性优先**：只回答你确定的知识，如果不确定，请明确说明"我需要更多资料来准确回答这个问题"
2. **知识库优先**：优先使用提供的知识库内容回答问题
3. **诚实态度**：不要编造或猜测信息，宁可不回答也不要给出错误答案
4. **友好表达**：用简单易懂的语言，适合小学生理解

`;

  if (knowledgeResults.length > 0) {
    prompt += `## 相关知识库内容

以下是从知识库中检索到的相关信息，请参考这些内容回答用户的问题：

`;
    knowledgeResults.forEach((result, index) => {
      prompt += `### 参考资料 ${index + 1}（相关度: ${(result.score * 100).toFixed(1)}%）\n`;
      prompt += `${result.content}\n\n`;
    });

    prompt += `---
请基于以上参考资料回答用户的问题。如果参考资料中没有相关信息，请诚实说明。

`;
  } else {
    prompt += `## 注意
知识库中没有找到与用户问题直接相关的内容。请根据你的基础知识回答，但要明确说明"知识库中暂无此信息，以下是我的建议供参考"。

`;
  }

  prompt += `## 用户问题
${userQuestion}

请给出准确、有帮助的回答。`;

  return prompt;
}

/**
 * 初始化默认知识库内容
 */
export async function initDefaultKnowledge(): Promise<void> {
  const defaultKnowledge: KnowledgeEntry[] = [
    // 图书推荐类
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

阅读建议：每天15-20分钟，家长可以陪伴阅读，培养阅读兴趣。`
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

4. **成长励志**
   - 《爱的教育》- 经典成长小说
   - 《草房子》- 曹文轩代表作

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
   - 《今天我是升旗手》- 黄蓓佳

3. **历史与传记**
   - 《写给儿童的中国历史》
   - 《名人传》- 罗曼·罗兰
   - 《苏东坡传》- 林语堂（青少年版）

4. **科幻与冒险**
   - 《三体》青少年版
   - 《哈利·波特》系列

阅读建议：培养深度阅读习惯，可以尝试写读书笔记。`
    },
    // 学习方法类
    {
      title: '小学生语文学习方法',
      category: 'study',
      tags: ['语文', '阅读', '写作'],
      content: `小学语文学习方法指导：

1. **识字与写字**
   - 每天坚持练字15分钟
   - 注意笔画顺序和字形结构
   - 使用田字格练习

2. **阅读理解**
   - 每天阅读30分钟以上
   - 遇到不认识的字要查字典
   - 读完后能说出主要内容
   - 学会做简单的读书笔记

3. **写作技巧**
   - 低年级：看图写话，从简单句子开始
   - 中年级：写日记，记录生活点滴
   - 高年级：写读后感，尝试多种文体

4. **古诗词学习**
   - 每周背诵2-3首古诗
   - 理解诗意，不只是死记硬背
   - 了解诗人和创作背景

5. **口语表达**
   - 课堂上积极发言
   - 家庭中分享学校见闻
   - 尝试讲故事给家人听

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
   - 建议：使用口算本，养成计算习惯

2. **应用题技巧**
   - 认真读题，理解题意
   - 找出已知条件和问题
   - 画图帮助理解
   - 检验答案是否合理

3. **几何图形**
   - 认识基本图形的特征
   - 动手剪、拼、折，建立空间概念
   - 学会计算周长和面积

4. **数学思维**
   - 多角度思考问题
   - 学会找规律
   - 尝试一题多解

5. **错题整理**
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
   - 方法：制作单词卡片，每天复习

2. **听力训练**
   - 每天听英语音频10-15分钟
   - 看英文动画片（如《小猪佩奇》英文版）
   - 听英文儿歌和故事

3. **口语练习**
   - 跟读课文录音
   - 和同学用英语对话
   - 唱英文歌曲
   - 家长可以用简单英语和孩子交流

4. **阅读入门**
   - 从绘本开始
   - 《牛津树》系列分级读物
   - 《RAZ》分级阅读

5. **书写规范**
   - 注意字母大小写
   - 规范书写格式
   - 练习抄写单词和句子

家长建议：创造英语环境，让学习变得有趣。`
    },
    {
      title: '小学生时间管理和学习习惯',
      category: 'study',
      tags: ['习惯', '时间管理', '效率'],
      content: `小学生时间管理和学习习惯培养：

1. **作息时间建议**
   - 早上：6:30-7:00 起床
   - 放学后：先休息30分钟，再开始学习
   - 学习时间：1-2小时（根据年级调整）
   - 晚上：21:00前睡觉，保证充足睡眠

2. **作业习惯**
   - 作业前：整理书桌，准备文具
   - 作业中：专注完成，不分心
   - 作业后：自我检查，收拾书包
   - 难题处理：先思考，再求助

3. **预习和复习**
   - 预习：提前了解明天要学的内容
   - 复习：当天学习的知识当天巩固
   - 周末：整理本周所学内容

4. **目标设定**
   - 设定短期目标（如本周目标）
   - 设定长期目标（如期中考试目标）
   - 目标要具体、可衡量

5. **劳逸结合**
   - 学习45分钟休息10分钟
   - 课余时间进行体育运动
   - 培养一项兴趣爱好

家长建议：以身作则，和孩子一起制定计划并执行。`
    },
    {
      title: '小学生常见学习问题及解决方案',
      category: 'study',
      tags: ['问题', '注意力', '拖延'],
      content: `小学生常见学习问题及解决方案：

1. **注意力不集中**
   - 原因：环境干扰、睡眠不足、学习内容太难
   - 解决：
     - 创造安静的学习环境
     - 保证充足睡眠
     - 将学习任务分解成小块
     - 使用番茄工作法（25分钟专注+5分钟休息）

2. **作业拖延**
   - 原因：畏难情绪、缺乏动力、没有时间观念
   - 解决：
     - 制定作业时间表
     - 先完成简单任务建立信心
     - 设置奖励机制
     - 和孩子一起分析拖延原因

3. **成绩起伏大**
   - 原因：知识点掌握不牢固、考试焦虑
   - 解决：
     - 查漏补缺，巩固基础
     - 分析错题，找到薄弱环节
     - 教孩子考试技巧
     - 减轻考试压力

4. **不愿阅读**
   - 原因：没有阅读兴趣、书太难
   - 解决：
     - 从孩子感兴趣的主题开始
     - 选择适合年龄的书籍
     - 亲子共读
     - 营造阅读氛围

5. **粗心大意**
   - 原因：做题过快、没有检查习惯
   - 解决：
     - 强调解题步骤
     - 培养检查习惯
     - 整理"粗心本"

家长建议：耐心引导，不要过度批评，多鼓励孩子进步。`
    }
  ];

  try {
    const result = await importKnowledge(defaultKnowledge);
    if (result.success) {
      console.log(`Successfully initialized ${defaultKnowledge.length} knowledge entries`);
    } else {
      console.error('Failed to initialize knowledge:', result.error);
    }
  } catch (error) {
    console.error('Init default knowledge error:', error);
  }
}

export const KnowledgeService = {
  getKnowledgeClient,
  importKnowledge,
  importFromUrl,
  searchKnowledge,
  buildKnowledgePrompt,
  initDefaultKnowledge,
  KNOWLEDGE_DATASET
};
