import { NextResponse } from 'next/server';
import { getFeedbackStats, getTopIssues, getAllFeedbacks } from '@/lib/store';

export async function GET() {
  const stats = getFeedbackStats();
  const topIssues = getTopIssues();
  
  // Get top feedbacks by description length (most detailed)
  const allFeedbacks = getAllFeedbacks();
  const detailedFeedbacks = allFeedbacks
    .filter(f => f.description && f.description.length > 20)
    .sort((a, b) => b.description.length - a.description.length)
    .slice(0, 10)
    .map(f => ({
      id: f.id,
      description: f.description.length > 100 ? f.description.slice(0, 100) + '...' : f.description,
      category: f.category,
      factory: f.factory,
      hasResult: !!f.result,
    }));

  return NextResponse.json({ 
    success: true, 
    data: {
      ...stats,
      topIssues,
      detailedFeedbacks,
    }
  });
}
