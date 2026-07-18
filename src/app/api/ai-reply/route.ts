import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getFeedbackById } from '@/lib/store';
import { CATEGORY_MAP, DEPARTMENT_RESPONSIBILITY } from '@/lib/types';
import type { FeedbackCategory } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedback, category, description } = body;

    // Support both: existing feedback by id, or new feedback text
    let feedbackText = '';
    let feedbackCategory: FeedbackCategory = 'other';
    let feedbackDept = '';

    if (feedback?.id) {
      const fb = getFeedbackById(feedback.id);
      if (!fb) {
        return new Response(JSON.stringify({ error: '反馈不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      feedbackText = fb.description;
      feedbackCategory = fb.category;
      feedbackDept = fb.department;
    } else if (description) {
      feedbackText = description;
      feedbackCategory = category || 'other';
      feedbackDept = feedback?.department || '';
    } else {
      return new Response(JSON.stringify({ error: '缺少反馈内容' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const catInfo = CATEGORY_MAP[feedbackCategory];
    const responsibleDepts = DEPARTMENT_RESPONSIBILITY[feedbackCategory];

    const systemPrompt = `你是一个专业的员工反馈处理助手，服务于茂佳科技HR和行政团队。

## 你的任务
根据员工反馈内容，输出以下结构化分析：

1. **反馈分类**：确认反馈属于哪个类别
2. **紧急程度**：判断紧急程度（高/中/低），说明判断依据
3. **责任部门**：建议由哪个部门负责处理
4. **处理建议**：给出2-3条具体可执行的处理步骤
5. **员工回复话术**：生成一段礼貌、专业的回复，不含虚假承诺

## 紧急程度判断标准
- 高：涉及安全、食品安全、人身安全、大面积影响工作
- 中：影响工作效率或满意度、多人共同关注
- 低：体验优化类、长期改进类

## 责任部门参考
- 绩效/考勤/工资/管理 → 人力资源部
- 住宿/用餐/通勤 → 行政部
- 网络/系统 → IT部
- 粗暴管理 → 人力资源部 + 安全部门

## 严格禁止
- 不得输出真实员工姓名、工号、电话
- 不得对员工个人做评价或标签化
- 不得承诺具体整改日期
- 涉及个人隐私、人事纠纷 → 提示升级HR人工处理

当前反馈类别：${catInfo?.label || '其他'}
反馈人部门：${feedbackDept || '未知'}`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: feedbackText },
    ];

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.5,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
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
          const errorMsg = err instanceof Error ? err.message : 'AI 分析生成失败';
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
