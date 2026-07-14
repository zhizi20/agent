import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getAllVoices } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const voices = getAllVoices();

    if (voices.length === 0) {
      return new Response(JSON.stringify({ error: '暂无心声数据' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const categoryLabels: Record<string, string> = {
      suggestion: '建议',
      vent: '吐槽',
      gratitude: '感恩',
      confusion: '困惑',
      idea: '灵感',
      other: '其他',
    };

    const voicesSummary = voices
      .map(
        (v) =>
          `[${categoryLabels[v.category] || '其他'}] (共鸣${v.likes}次) ${v.content}`
      )
      .join('\n');

    const systemPrompt = `你是一个专业的企业管理分析师。请根据以下员工心声数据，完成三项分析任务。

## 分析任务

### 任务一：高频问题摘要
从所有心声中提炼出 3-5 个高频/共性问题，每个问题用一句话概括核心诉求。

### 任务二：紧急程度判断
对每个高频问题判断紧急程度（高/中/低），判断标准：
- 高：涉及员工身心健康、安全风险、大规模不满、可能引发离职
- 中：影响工作效率或满意度、多人共同关注
- 低：改善型建议、长期规划类

### 任务三：处理建议与责任部门
针对每个问题给出 1-2 条具体可执行的处理建议，并指定建议的责任部门（如：人力资源部、行政部、IT 部、财务部、业务管理部、企业文化部等）。

## 输出格式（严格遵循）

请严格按以下 JSON 格式输出，不要输出任何其他内容：

\`\`\`json
{
  "summary": "整体分析摘要，2-3句话概括当前员工心声反映的核心态势",
  "issues": [
    {
      "title": "问题标题（简洁概括）",
      "urgency": "高|中|低",
      "description": "问题描述（结合具体心声内容说明）",
      "relatedCount": 相关心声数量（数字）,
      "department": "建议责任部门名称",
      "suggestions": ["建议1", "建议2"]
    }
  ]
}
\`\`\`

## 员工心声数据

${voicesSummary}`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请分析以上员工心声数据，输出 JSON 格式的分析结果。' },
    ];

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.3,
    });

    const encoder = new TextEncoder();
    let fullText = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullText += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '分析生成失败';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: '请求处理失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
