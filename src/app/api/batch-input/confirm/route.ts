import { NextRequest, NextResponse } from 'next/server';
import { addVoice } from '@/lib/store';
import type { VoiceCategory } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voices } = body as {
      voices: Array<{
        content: string;
        category: VoiceCategory;
        department: string;
      }>;
    };

    if (!voices || !Array.isArray(voices) || voices.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可确认的心声数据' },
        { status: 400 }
      );
    }

    // Save each voice to the store
    const savedIds: string[] = [];
    for (const v of voices) {
      const voice = addVoice({
        content: v.content,
        category: v.category,
        author: '',
        isAnonymous: true,
        isBatch: true,
      });
      if (voice) {
        // Update department if provided
        if (v.department) {
          voice.department = v.department;
        }
        savedIds.push(voice.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        count: savedIds.length,
        ids: savedIds,
      },
    });
  } catch (error) {
    console.error('Batch confirm error:', error);
    return NextResponse.json(
      { success: false, error: '确认失败，请稍后重试' },
      { status: 500 }
    );
  }
}
