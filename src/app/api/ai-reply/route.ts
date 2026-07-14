import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getVoiceById, updateAiReply } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: '缺少心声 ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const voice = getVoiceById(id);
    if (!voice) {
      return new Response(JSON.stringify({ error: '心声不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (voice.aiReply) {
      return new Response(JSON.stringify({ error: '该心声已有回复' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const categoryLabels: Record<string, string> = {
      suggestion: '建议',
      vent: '吐槽/倾诉',
      gratitude: '感恩/表扬',
      confusion: '困惑/求助',
      idea: '灵感/创意',
      other: '其他',
    };

    const systemPrompt = `你是一个温暖、善解人意的"员工心声助手"。你的工作是认真倾听员工的心声，给予温暖、真诚、有建设性的回应。

你的回复风格：
1. 先共情：表达对员工感受的理解和接纳
2. 再回应：针对具体内容给出真诚的想法或建议
3. 语气温暖但不做作，像一个关心你的前辈或朋友
4. 控制在100字以内，简洁有力
5. 不要使用表情符号

这条心声的分类是「${categoryLabels[voice.category] || '其他'}」。`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: voice.content },
    ];

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.8,
    });

    const encoder = new TextEncoder();
    let fullReply = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullReply += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
              );
            }
          }
          // Save the reply
          updateAiReply(id, fullReply);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'AI 回复生成失败';
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
