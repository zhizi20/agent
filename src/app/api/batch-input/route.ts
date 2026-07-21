import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { CATEGORY_KEYS } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';

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

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // Process in batches of 50 to avoid timeout and token limits
    const BATCH_SIZE = 50;
    const allClassifications: { index: number; category: string; urgency: string; department: string }[] = [];

    for (let batchStart = 0; batchStart < texts.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, texts.length);
      const batchTexts = texts.slice(batchStart, batchEnd);

      const textsFormatted = batchTexts
        .map((t, i) => `${i}. ${t.trim()}`)
        .join('\n');

      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: CLASSIFICATION_PROMPT + textsFormatted },
      ];

      const stream = client.stream(messages, {
        model: 'doubao-seed-2-0-mini-260215',
        temperature: 0.3,
      });

      // Collect streaming response
      let fullText = '';
      for await (const part of stream) {
        if (part.content) {
          fullText += part.content;
        }
      }

      // Parse classification results for this batch
      let batchClassifications: { index: number; category: string; urgency: string; department: string }[];
      try {
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          batchClassifications = JSON.parse(jsonMatch[0]);
          // Adjust indices to global indices
          batchClassifications = batchClassifications.map((c) => ({
            ...c,
            index: c.index + batchStart,
          }));
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch {
        // If parsing fails for this batch, assign defaults
        batchClassifications = batchTexts.map((_, i) => ({
          index: i + batchStart,
          category: 'other',
          urgency: '低',
          department: '综合管理部',
        }));
      }

      allClassifications.push(...batchClassifications);
    }

    const classifications = allClassifications;

    // Build voice entries (NOT saved to store yet - pending user confirmation)
    const pendingVoices: Array<{
      tempId: string;
      content: string;
      category: VoiceCategory;
      urgency: string;
      department: string;
    }> = [];

    for (let i = 0; i < texts.length; i++) {
      const classification = classifications.find((c) => c.index === i);
      const category = (classification?.category || 'other') as VoiceCategory;
      const urgency = classification?.urgency || '低';
      const department = classification?.department || '综合管理部';

      pendingVoices.push({
        tempId: `pending-${Date.now()}-${i}`,
        content: texts[i].trim(),
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
