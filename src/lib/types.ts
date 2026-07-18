export type VoiceCategory =
  | 'performance'
  | 'housing'
  | 'attendance'
  | 'management'
  | 'salary'
  | 'dining'
  | 'rough_management'
  | 'other';

export const CATEGORY_MAP: Record<VoiceCategory, { label: string; color: string; bgColor: string; icon: string }> = {
  performance: { label: '绩效问题', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: '📊' },
  housing: { label: '住宿问题', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: '🏠' },
  attendance: { label: '考勤问题', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: '⏰' },
  management: { label: '管理问题', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200', icon: '📋' },
  salary: { label: '工资问题', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: '💰' },
  dining: { label: '用餐问题', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', icon: '🍽️' },
  rough_management: { label: '粗暴管理', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: '⚠️' },
  other: { label: '其他', color: 'text-stone-600', bgColor: 'bg-stone-50 border-stone-200', icon: '💬' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_MAP) as VoiceCategory[];

export interface Voice {
  id: string;
  content: string;
  category: VoiceCategory;
  author: string;
  isAnonymous: boolean;
  likes: number;
  aiReply: string | null;
  createdAt: string;
  isBatch?: boolean;
}

export interface Stats {
  total: number;
  byCategory: Record<string, number>;
  totalLikes: number;
  anonymousCount: number;
  recentWeek: number;
}
