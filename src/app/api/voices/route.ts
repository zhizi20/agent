import { NextRequest, NextResponse } from 'next/server';
import { getAllFeedbacks, createFeedback, getFeedbackStats, getTopIssues, getFeedbacksByCategory } from '@/lib/store';
import type { FeedbackCategory } from '@/lib/types';

const VALID_CATEGORIES: FeedbackCategory[] = ['performance', 'accommodation', 'attendance', 'management', 'salary', 'dining', 'rough_manage', 'other'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const factory = searchParams.get('factory');

  let feedbacks = getAllFeedbacks();

  if (category && VALID_CATEGORIES.includes(category as FeedbackCategory)) {
    feedbacks = feedbacks.filter((f) => f.category === category);
  }

  if (factory) {
    feedbacks = feedbacks.filter((f) => f.factory === factory);
  }

  return NextResponse.json({ success: true, data: feedbacks });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, description, department } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, error: '内容不能为空' }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, error: '无效的分类' }, { status: 400 });
    }

    const feedback = createFeedback({
      category,
      title: title || '',
      description: description.trim(),
      department: department || '',
    });

    return NextResponse.json({ success: true, data: feedback }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: '请求解析失败' }, { status: 400 });
  }
}
