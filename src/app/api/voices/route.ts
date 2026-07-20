import { NextRequest, NextResponse } from 'next/server';
import { getAllVoices, createVoice, likeVoice, getVoiceById, updateAiReply, updateVoice, deleteVoice } from '@/lib/store';
import { CATEGORY_KEYS } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';

const VALID_CATEGORIES = CATEGORY_KEYS;

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

    // Create voice - require author name (real-name policy)
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: '内容不能为空' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: '无效的分类' }, { status: 400 });
    }

    if (!author || !author.trim()) {
      return NextResponse.json({ success: false, error: '请输入您的姓名' }, { status: 400 });
    }

    if (content.trim().length > 500) {
      return NextResponse.json({ success: false, error: '内容不能超过500字' }, { status: 400 });
    }

    const voice = createVoice({
      content: content.trim(),
      category,
      author: author.trim(),
      isAnonymous: false,
    });

    return NextResponse.json({ success: true, data: voice }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: '请求解析失败' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, aiReply, content, category, department, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
    }

    const voice = getVoiceById(id);
    if (!voice) {
      return NextResponse.json({ success: false, error: '心声不存在' }, { status: 404 });
    }

    // Update AI reply
    if (aiReply !== undefined) {
      const updated = updateAiReply(id, aiReply);
      return NextResponse.json({ success: true, data: updated });
    }

    // Update voice content/category/department/status
    const updateData: { content?: string; category?: VoiceCategory; department?: string; status?: 'resolved' | 'unresolved' } = {};
    if (content !== undefined) updateData.content = content.trim();
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json({ success: false, error: '无效的分类' }, { status: 400 });
      }
      updateData.category = category;
    }
    if (department !== undefined) updateData.department = department;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length > 0) {
      const updated = updateVoice(id, updateData);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: '请求解析失败' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
    }

    const voice = getVoiceById(id);
    if (!voice) {
      return NextResponse.json({ success: false, error: '心声不存在' }, { status: 404 });
    }

    const deleted = deleteVoice(id);
    if (deleted) {
      return NextResponse.json({ success: true, message: '删除成功' });
    }

    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  } catch {
    return NextResponse.json({ success: false, error: '请求解析失败' }, { status: 400 });
  }
}
