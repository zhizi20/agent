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
      performance: '绩效问题',
      housing: '住宿问题',
      attendance: '考勤问题',
      management: '管理问题',
      salary: '工资问题',
      dining: '用餐问题',
      rough_management: '粗暴管理',
      training: '培训问题',
      office: '办公问题',
      commute: '通勤问题',
      other: '其他',
    };

    const voicesSummary = voices
      .map(
        (v) =>
          `[${categoryLabels[v.category] || '其他'}] (共鸣${v.likes}次) ${v.content}`
      )
      .join('\n');

    const systemPrompt = `你是一名企业组织运营数据分析专家，服务对象为 HR、行政管理人员和组织运营负责人。
请基于员工反馈数据，生成一份完整的组织运营数据分析报告。

## 分析维度

### 1. 整体态势摘要 (summary)
用 2-3 句话概括当前员工反馈反映的核心态势和主要矛盾。

### 2. 高频问题详情 (issues)
从反馈中提炼 3-5 个高频/共性问题，每个包含：
- title: 问题标题（简洁）
- urgency: 紧急程度（高/中/低）
  - 高：涉及员工身心健康、安全风险、大规模不满、可能引发离职潮
  - 中：影响工作效率和员工满意度，需尽快解决
  - 低：改善型需求，可纳入计划逐步优化
- description: 问题描述（50-100字）
- relatedCount: 相关反馈数量
- department: 建议责任部门（如：人力资源部、行政部、生产管理部、IT部等）
- suggestions: 处理建议数组（2-3条具体措施）

### 3. 风险等级分析 (riskAnalysis)
将识别出的问题按风险等级分类：
- high: 高风险问题列表（可能导致员工离职、安全事故、法律风险）
- medium: 中风险问题列表（影响团队稳定性和效率）
- low: 低风险问题列表（改善型需求）

### 4. AI 组织洞察 (orgInsight)
- currentState: 当前组织状态评估（100-150字，从员工满意度、管理健康度、组织氛围等维度）
- priorities: 优先改善方向（3-5条，按优先级排序）

### 5. 管理优化建议 (managementAdvice)
- shortTerm: 短期措施（3-5条，1-4周内可执行的具体行动）
- longTerm: 长期建设（3-5条，1-6个月的系统性改善方案）

## 输出格式
严格输出 JSON，不要输出任何其他内容：
\`\`\`json
{
  "summary": "整体态势摘要",
  "issues": [
    {
      "title": "问题标题",
      "urgency": "高",
      "description": "问题描述",
      "relatedCount": 10,
      "department": "责任部门",
      "suggestions": ["建议1", "建议2"]
    }
  ],
  "riskAnalysis": {
    "high": ["高风险问题1", "高风险问题2"],
    "medium": ["中风险问题1"],
    "low": ["低风险问题1"]
  },
  "orgInsight": {
    "currentState": "组织状态评估",
    "priorities": ["优先方向1", "优先方向2"]
  },
  "managementAdvice": {
    "shortTerm": ["短期措施1", "短期措施2"],
    "longTerm": ["长期建设1", "长期建设2"]
  }
}
\`\`\`

## 分析原则
1. 基于数据说话，不臆造不存在的问题
2. 关注问题背后的组织管理根因
3. 建议要具体可执行，不要空泛
4. 区分短期应急和长期建设
5. 从组织运营角度分析，不是简单回复员工`;

    const stream = client.stream(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下是 ${voices.length} 条员工反馈数据，请分析：\n\n${voicesSummary}` },
      ],
      { model: 'doubao-seed-2-0-mini-260215', temperature: 0.7 }
    );

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.content ? chunk.content.toString() : '';
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
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
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: '分析失败，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
