import { NextRequest, NextResponse } from 'next/server';
import { getAllVoices, createVoice, likeVoice, getVoiceById } from '@/lib/store';
import type { VoiceCategory } from '@/lib/types';

const VALID_CATEGORIES: VoiceCategory[] = ['suggestion', 'vent', 'gratitude', 'confusion', 'idea', 'other'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  if (category && VALID_CATEGORIES.includes(category as VoiceCategory)) {
    const voices = getAllVoices().filter((v) => v.category === category);
    return NextResponse.json({ success: true, data: voices });
  }

  const voices = getAllVoices();
  return NextResponse.json({ success: true, data: voices });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, category, author, isAnonymous, action } = body;

    // Like action
    if (action === 'like') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
      }
      const voice = likeVoice(id);
      if (!voice) {
        return NextResponse.json({ success: false, error: '心声不存在' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: voice });
    }

    // Create voice
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: '内容不能为空' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: '无效的分类' }, { status: 400 });
    }

    if (content.trim().length > 500) {
      return NextResponse.json({ success: false, error: '内容不能超过500字' }, { status: 400 });
    }

    const voice = createVoice({
      content: content.trim(),
      category,
      author: isAnonymous ? '' : (author || '匿名'),
      isAnonymous: !!isAnonymous,
    });

    return NextResponse.json({ success: true, data: voice }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: '请求解析失败' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, aiReply } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
    }

    const voice = getVoiceById(id);
    if (!voice) {
      return NextResponse.json({ success: false, error: '心声不存在' }, { status: 404 });
    }

    if (aiReply !== undefined) {
      const { updateAiReply } = await import('@/lib/store');
      const updated = updateAiReply(id, aiReply);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: '请求解析失败' }, { status: 400 });
  }
}
