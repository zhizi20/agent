import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getAllFeedbacks, getFeedbackStats, getTopIssues } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const feedbacks = getAllFeedbacks();
    const stats = getFeedbackStats();
    const topIssues = getTopIssues();

    if (feedbacks.length === 0) {
      return new Response(JSON.stringify({ error: '暂无反馈数据' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const categoryLabels: Record<string, string> = {
      performance: '绩效问题',
      accommodation: '住宿问题',
      attendance: '考勤问题',
      management: '管理问题',
      salary: '工资问题',
      dining: '用餐问题',
      rough_manage: '粗暴管理',
      other: '其他',
    };

    // Build a summary of feedback data for AI analysis
    const feedbackSummary = topIssues
      .map((issue) => {
        const label = categoryLabels[issue.category] || '其他';
        return `【${label}】${issue.count}条 (${issue.percentage}%)\n典型反馈：${issue.samples.join('；')}`;
      })
      .join('\n\n');

    const systemPrompt = `你是一个专业的企业管理分析师，服务于茂佳科技的HR和行政团队。请根据以下员工反馈统计数据，完成分析任务。

## 公司背景
- 茂佳科技，员工逾万人，研发人员800余人
- 制造基地：惠州、成都、墨西哥、波兰、印度、越南（6基地）
- 总部：广东惠州潼湖

## 反馈数据概览
总反馈数：${stats.total}条
- 已处理：${stats.handledCount}条 (${stats.handleRate}%)
- 平均评分：${stats.avgScore}分

## 分类统计
${feedbackSummary}

## 厂区分布
${Object.entries(stats.byFactory).map(([f, c]) => `- ${f}: ${c}条`).join('\n')}

## 分析任务

### 任务一：高频问题摘要
从数据中提炼出 5 个高频/共性问题，每个问题用一句话概括核心诉求。

### 任务二：紧急程度判断
对每个高频问题判断紧急程度（高/中/低），判断标准：
- 高：涉及安全、大面积影响工作、可能引发离职潮
- 中：影响效率或满意度、多人共同关注
- 低：改善型建议、长期规划类

### 任务三：处理建议与责任部门
针对每个问题给出 2-3 条具体可执行的处理建议，并指定责任部门。
责任部门参考：
- 绩效/考勤/工资 → 人力资源部
- 住宿/用餐/通勤 → 行政部
- 网络/系统 → IT部
- 管理问题 → 人力资源部 + 部门负责人
- 安全相关 → 安全部门

### 任务四：员工回复话术
为每个高频问题生成一段礼貌、专业的回复话术，不含虚假承诺。

## 输出格式（严格遵循 JSON）

\`\`\`json
{
  "summary": "整体分析摘要，3-4句话概括当前员工反馈反映的核心态势和趋势",
  "issues": [
    {
      "title": "问题标题（简洁概括）",
      "urgency": "高|中|低",
      "description": "问题描述（结合具体数据说明）",
      "relatedCount": 相关反馈数量（数字）,
      "department": "建议责任部门名称",
      "suggestions": ["建议1", "建议2", "建议3"],
      "replyTemplate": "给员工的回复话术模板"
    }
  ],
  "overallSuggestions": ["公司层面的改进建议1", "公司层面的改进建议2"]
}
\`\`\``;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请分析以上员工反馈数据，输出 JSON 格式的深度分析报告。' },
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
