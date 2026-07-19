import { NextResponse } from 'next/server';
import { getFeedbackStats, getTopIssues } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  const stats = getFeedbackStats();
  const topIssues = getTopIssues();

  return NextResponse.json({
    success: true,
    data: {
      ...stats,
      topIssues,
    },
  });
}
