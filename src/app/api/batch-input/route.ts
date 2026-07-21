import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { CATEGORY_KEYS } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';
import { getStore } from '@/lib/store';

// Classification + analysis prompt for AI
const CLASSIFICATION_PROMPT = `你是一个员工反馈分类专家。请根据以下分类原则，对每条员工心声进行分类，并判断紧急程度和建议责任部门。

## 分类类别
- performance（绩效问题）：绩效考核标准、考核流程、目标设定、评分不公等。关键词：绩效、考核、KPI、OKR、目标、评分、指标
- housing（住宿问题）：宿舍条件、设施维修、住宿环境、卫生安全等。关键词：宿舍、住房、热水器、空调、维修、报修
- attendance（考勤问题）：打卡系统、加班记录、请假流程、考勤异常等。关键词：考勤、打卡、加班、请假、迟到、出勤
- management（管理问题）：管理方式、沟通方式、决策透明度、团队协作等。关键词：管理、沟通、决策、安排、协调、分工
- salary（工资问题）：薪资水平、调薪机制、福利待遇、奖金发放等。关键词：工资、薪资、调薪、奖金、福利、补贴、待遇
- dining（用餐问题）：食堂菜品、餐饮质量、用餐环境、食品卫生等。关键词：食堂、菜品、用餐、餐饮、伙食、饭菜
- rough_management（粗暴管理）：辱骂、威胁、当众批评、不尊重员工等管理行为。关键词：骂人、威胁、侮辱、粗暴、当众批评、不尊重
- training（培训问题）：培训课程、入职培训、技能提升、培训资源等。关键词：培训、学习、课程、入职、技能、提升、课件
- office（办公问题）：办公设备、办公环境、软件工具、网络设施等。关键词：办公、电脑、网络、软件、设备、环境、工位
- commute（通勤问题）：班车、交通补贴、通勤时间、停车等。关键词：通勤、班车、交通、停车、公交、地铁、路线
- other（其他）：无法归入以上十类的反馈

## 判断原则
1. 先判断反馈的核心诉求指向哪个类别
2. 若涉及多个类别，以主要诉求为准
3. 粗暴管理优先于一般管理问题 — 如果涉及辱骂、威胁等行为，归为 rough_management
4. 若无法明确归类，标记为"other"

## 紧急程度判断规则
- 高：涉及员工身心健康、安全风险、大面积影响工作、可能引发离职潮
- 中：影响工作效率和员工满意度，需尽快解决
- 低：改善型需求，可纳入计划逐步优化

## 责任部门映射规则
- performance → 人力资源部
- housing → 行政部/后勤部
- attendance → 人力资源部/生产管理部
- management → 管理层/人力资源部
- salary → 人力资源部/财务部
- dining → 行政部/后勤部
- rough_management → 管理层/人力资源部
- training → 人力资源部/培训部
- office → IT部/行政部
- commute → 行政部
- other → 综合管理部

## 输出格式
请严格按以下 JSON 格式输出，不要输出其他内容：
\`\`\`json
[
  { "index": 0, "category": "performance", "urgency": "中", "department": "人力资源部" },
  { "index": 1, "category": "housing", "urgency": "高", "department": "行政部/后勤部" }
]
\`\`\`

## 待分类心声
`;

// 中文停用词（用于去重相似度计算）
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '怎么', '为什么',
  '啊', '呢', '吧', '吗', '呀', '哦', '嗯', '哈', '哎', '嘛', '啦',
  '，', '。', '！', '？', '、', '；', '：', '（', '）',
  ' ', '\n', '\r', '\t',
]);

/**
 * 文本预处理：去除停用词、标点、空白，提取关键词
 */
function tokenize(text: string): string[] {
  const cleaned = text
    .replace(/[，。！？、；："'"''（）\s\n\r\t]/g, ' ')
    .toLowerCase();

  const tokens: string[] = [];
  for (const char of cleaned) {
    if (char.trim() && !STOP_WORDS.has(char)) {
      tokens.push(char);
    }
  }

  return tokens;
}

/**
 * 计算两个文本的相似度（Jaccard 相似度）
 */
function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  if (tokens1.size === 0 && tokens2.size === 0) return 1;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersection++;
    }
  }

  const union = tokens1.size + tokens2.size - intersection;
  return intersection / union;
}

/**
 * 批量去重：基于内容相似度检测重复反馈
 * @param texts 待检查的文本数组
 * @param existingVoices 数据库中已有的心声
 * @returns 去重后的文本数组和重复统计
 */
function deduplicateTexts(
  texts: string[],
  existingVoices: Array<{ content: string }>
): { uniqueTexts: string[]; duplicateCount: number; duplicateIndices: Set<number> } {
  const uniqueTexts: string[] = [];
  const duplicateIndices = new Set<number>();
  const SIMILARITY_THRESHOLD = 0.7; // 相似度阈值

  for (let i = 0; i < texts.length; i++) {
    const currentText = texts[i].trim();
    let isDuplicate = false;

    // 检查与已有数据库内容的相似度
    for (const existing of existingVoices) {
      const similarity = calculateSimilarity(currentText, existing.content);
      if (similarity >= SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        break;
      }
    }

    // 检查与本次批量中已添加内容的相似度
    if (!isDuplicate) {
      for (const uniqueText of uniqueTexts) {
        const similarity = calculateSimilarity(currentText, uniqueText);
        if (similarity >= SIMILARITY_THRESHOLD) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) {
      duplicateIndices.add(i);
    } else {
      uniqueTexts.push(currentText);
    }
  }

  return {
    uniqueTexts,
    duplicateCount: duplicateIndices.size,
    duplicateIndices,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts } = body as { texts: string[] };

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要分类的心声文本' },
        { status: 400 }
      );
    }

    if (texts.length > 300) {
      return NextResponse.json(
        { success: false, error: '单次最多处理 300 条心声' },
        { status: 400 }
      );
    }

    // 步骤 1：去重检测
    const existingVoices = getStore();
    const { uniqueTexts, duplicateCount } = deduplicateTexts(texts, existingVoices);

    if (uniqueTexts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          pendingVoices: [],
          distribution: [],
          urgencyDistribution: { high: 0, medium: 0, low: 0 },
          departmentDistribution: {},
          totalCount: 0,
          duplicateCount: texts.length,
          message: `所有 ${texts.length} 条反馈均与已有内容重复，已自动过滤`,
        },
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 步骤 2：并发分批处理（每批 40 条，最多并发 3 批）
    const BATCH_SIZE = 40;
    const MAX_CONCURRENT = 3;
    const allClassifications: { index: number; category: string; urgency: string; department: string }[] = [];

    // 创建批次
    const batches: Array<{ start: number; texts: string[] }> = [];
    for (let i = 0; i < uniqueTexts.length; i += BATCH_SIZE) {
      batches.push({
        start: i,
        texts: uniqueTexts.slice(i, i + BATCH_SIZE),
      });
    }

    // 并发处理批次
    const processBatch = async (batch: { start: number; texts: string[] }) => {
      const textsFormatted = batch.texts
        .map((t, i) => `${i}. ${t.trim()}`)
        .join('\n');

      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: CLASSIFICATION_PROMPT + textsFormatted },
      ];

      const stream = client.stream(messages, {
        model: 'doubao-seed-2-0-mini-260215',
        temperature: 0.3,
      });

      let fullText = '';
      for await (const part of stream) {
        if (part.content) {
          fullText += part.content;
        }
      }

      try {
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const batchClassifications = JSON.parse(jsonMatch[0]);
          return batchClassifications.map((c: { index: number; category: string; urgency: string; department: string }) => ({
            ...c,
            index: c.index + batch.start,
          }));
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch {
        // 解析失败时使用默认值
        return batch.texts.map((_, i) => ({
          index: i + batch.start,
          category: 'other',
          urgency: '低',
          department: '综合管理部',
        }));
      }
    };

    // 并发执行批次（控制并发数）
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
      const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(concurrentBatches.map(processBatch));

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allClassifications.push(...result.value);
        }
      }
    }

    const classifications = allClassifications;

    // Build voice entries from unique texts (NOT saved to store yet - pending user confirmation)
    const pendingVoices: Array<{
      tempId: string;
      content: string;
      category: VoiceCategory;
      urgency: string;
      department: string;
    }> = [];

    for (let i = 0; i < uniqueTexts.length; i++) {
      const classification = classifications.find((c) => c.index === i);
      const category = (classification?.category || 'other') as VoiceCategory;
      const urgency = classification?.urgency || '低';
      const department = classification?.department || '综合管理部';

      pendingVoices.push({
        tempId: `pending-${Date.now()}-${i}`,
        content: uniqueTexts[i].trim(),
        category,
        urgency,
        department,
      });
    }

    // Calculate distribution
    const distribution: Record<string, number> = {};
    for (const key of CATEGORY_KEYS) {
      distribution[key] = 0;
    }

    for (const voice of pendingVoices) {
      if (distribution[voice.category] !== undefined) {
        distribution[voice.category]++;
      } else {
        distribution.other++;
      }
    }

    const total = pendingVoices.length;
    const distributionWithPercent = Object.entries(distribution).map(([key, count]) => ({
      category: key,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    // Calculate urgency distribution
    const urgencyDistribution = { high: 0, medium: 0, low: 0 };
    for (const voice of pendingVoices) {
      if (voice.urgency === '高') urgencyDistribution.high++;
      else if (voice.urgency === '中') urgencyDistribution.medium++;
      else urgencyDistribution.low++;
    }

    // Calculate department distribution
    const deptDistribution: Record<string, number> = {};
    for (const voice of pendingVoices) {
      deptDistribution[voice.department] = (deptDistribution[voice.department] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        voices: pendingVoices,
        distribution: distributionWithPercent,
        urgencyDistribution,
        deptDistribution,
        total,
        duplicateCount,
        originalCount: texts.length,
      },
    });
  } catch (error) {
    console.error('Batch input error:', error);
    return NextResponse.json(
      { success: false, error: '批量输入失败，请稍后重试' },
      { status: 500 }
    );
  }
}
