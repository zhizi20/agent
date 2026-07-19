import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { addVoice } from '@/lib/store';
import { CATEGORY_KEYS } from '@/lib/types';
import type { Voice, VoiceCategory } from '@/lib/types';

// Classification principles for AI
const CLASSIFICATION_PROMPT = `你是一个员工反馈分类专家。请根据以下分类原则，对每条员工心声进行分类。

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

## 输出格式
请严格按以下 JSON 格式输出，不要输出其他内容：
\`\`\`json
[
  { "index": 0, "category": "performance" },
  { "index": 1, "category": "housing" }
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

    if (texts.length > 50) {
      return NextResponse.json(
        { success: false, error: '单次最多处理 50 条心声' },
        { status: 400 }
      );
    }

    // Format texts for classification
    const textsFormatted = texts
      .map((t, i) => `${i}. ${t.trim()}`)
      .join('\n');

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

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

    // Parse classification results
    let classifications: { index: number; category: string }[];
    try {
      // Extract JSON from the response
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        classifications = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch {
      // If parsing fails, assign "other" to all
      classifications = texts.map((_, i) => ({ index: i, category: 'other' }));
    }

    // Create voice entries
    const newVoices: Voice[] = [];
    for (let i = 0; i < texts.length; i++) {
      const classification = classifications.find((c) => c.index === i);
      const category = (classification?.category || 'other') as VoiceCategory;

      const voice = addVoice({
        content: texts[i].trim(),
        category,
        author: '',
        isAnonymous: true,
        isBatch: true,
      });

      if (voice) {
        newVoices.push(voice);
      }
    }

    // Calculate distribution
    const distribution: Record<string, number> = {};
    for (const key of CATEGORY_KEYS) {
      distribution[key] = 0;
    }

    for (const voice of newVoices) {
      if (distribution[voice.category] !== undefined) {
        distribution[voice.category]++;
      } else {
        distribution.other++;
      }
    }

    const total = newVoices.length;
    const distributionWithPercent = Object.entries(distribution).map(([key, count]) => ({
      category: key,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        voices: newVoices,
        distribution: distributionWithPercent,
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
