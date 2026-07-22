import { NextRequest, NextResponse } from 'next/server';
import { getAllVoices, createVoice, likeVoice, getVoiceById, updateAiReply, updateVoice, deleteVoice } from '@/lib/store';
import { CATEGORY_KEYS } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';
import { checkDuplicate } from '@/lib/deduplication';
import { checkSensitiveContent } from '@/lib/sensitive-filter';
import { desensitizeVoice } from '@/lib/desensitize';

const VALID_CATEGORIES = CATEGORY_KEYS;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const department = searchParams.get('department');

  let voices = getAllVoices();

  if (category && VALID_CATEGORIES.includes(category as VoiceCategory)) {
    voices = voices.filter((v) => v.category === category);
  }

  if (department) {
    voices = voices.filter((v) => (v.department || '未分配') === department);
  }

  // 管理层看板可请求包含敏感内容的数据
  const includeSensitive = searchParams.get('includeSensitive') === 'true';

  // 过滤掉违规内容（不展示给前台），兼容旧的 isSensitive 标记
  const visibleVoices = includeSensitive
    ? voices.filter((v) => !v.isViolation)
    : voices.filter((v) => !v.isViolation && !v.isSensitive);

  // 对展示内容进行敏感信息脱敏
  const desensitizedVoices = visibleVoices.map(desensitizeVoice);

  return NextResponse.json({ success: true, data: desensitizedVoices });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, category, author, isAnonymous, action } = body;

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

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
      }

      const voice = getVoiceById(id);
      if (!voice) {
        return NextResponse.json({ success: false, error: '心声不存在' }, { status: 404 });
      }

      const deleted = deleteVoice(id);
      if (!deleted) {
        return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '删除成功' });
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

    // 去重检查（仅对普通员工生效）
    const role = body.role || 'employee';
    const dedupResult = checkDuplicate(author.trim(), content.trim(), category, role);
    
    if (dedupResult.isDuplicate) {
      return NextResponse.json(
        { 
          success: false, 
          error: dedupResult.message,
          isDuplicate: true,
          existingVoiceId: dedupResult.existingVoiceId
        }, 
        { status: 409 }
      );
    }

    // 违规内容审核（所有用户都检查）
    const violationResult = checkSensitiveContent(content.trim());

    // 如果检测到违规内容，直接拦截不入库
    if (violationResult.isViolation) {
      return NextResponse.json(
        {
          success: false,
          error: violationResult.message || '内容包含违规信息，请修改后重新提交',
          isViolation: true,
          violationCategory: violationResult.category,
        },
        { status: 403 }
      );
    }

    // 内容合规，入库保存
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
    let id: string | null = null;

    // Try body first, then query params
    try {
      const body = await request.json();
      id = body.id;
    } catch {
      // ignore JSON parse error, try query params
    }

    if (!id) {
      const { searchParams } = new URL(request.url);
      id = searchParams.get('id');
    }

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
