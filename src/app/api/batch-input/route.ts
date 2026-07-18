import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { addVoice } from '@/lib/store';
import type { Voice, VoiceCategory } from '@/lib/types';

// Classification principles for AI
const CLASSIFICATION_PROMPT = `你是一个员工反馈分类专家。请根据以下分类原则，对每条员工心声进行分类。

## 分类类别
- admin_logistics（行政后勤）：食堂、宿舍、通勤、保洁、安保等后勤保障相关反馈
- office_env（办公环境）：会议室、网络、工位、空调、照明等办公设施相关反馈
- training（培训发展）：课件质量、产品知识培训、技能训练、职业发展相关反馈
- process_tools（流程工具）：系统不好用、指引不清、审批流程繁琐、工具效率低等反馈
- other（其他）：无法归入以上四类的反馈

## 判断原则
1. 先判断反馈的核心诉求指向哪个服务场景
2. 若涉及多个类别，以主要诉求为准
3. 若无法明确归类，标记为"other"
4. 关注关键词：食堂/宿舍/班车→admin_logistics，网络/会议室/工位→office_env，培训/学习/课程→training，系统/流程/审批→process_tools

## 输出格式
请严格按以下 JSON 格式输出，不要输出其他内容：
\`\`\`json
[
  { "index": 0, "category": "admin_logistics" },
  { "index": 1, "category": "office_env" }
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
    const distribution: Record<string, number> = {
      admin_logistics: 0,
      office_env: 0,
      training: 0,
      process_tools: 0,
      other: 0,
    };

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
