import { NextRequest, NextResponse } from 'next/server';
import { getVoiceStats } from '@/lib/store';

export async function GET() {
  const stats = getVoiceStats();
  return NextResponse.json({ success: true, data: stats });
}
