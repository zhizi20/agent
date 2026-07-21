import { NextRequest, NextResponse } from 'next/server';
import { getVoiceStats, reloadStore } from '@/lib/store';

export async function GET() {
  // 强制从磁盘重新加载，确保统计数据与心声墙同步
  reloadStore();
  const stats = getVoiceStats();
  return NextResponse.json({ success: true, data: stats });
}
