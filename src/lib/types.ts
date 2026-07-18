export type VoiceCategory =
  | 'suggestion'
  | 'vent'
  | 'gratitude'
  | 'confusion'
  | 'idea'
  | 'other'
  | 'admin_logistics'
  | 'office_env'
  | 'training'
  | 'process_tools';

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

export const CATEGORY_MAP: Record<VoiceCategory, { label: string; emoji: string; color: string }> = {
  suggestion: { label: '建议', emoji: '💡', color: '#D4A574' },
  vent: { label: '吐槽', emoji: '😤', color: '#E8917A' },
  gratitude: { label: '感恩', emoji: '🙏', color: '#8BC49E' },
  confusion: { label: '困惑', emoji: '🤔', color: '#B8A9C9' },
  idea: { label: '灵感', emoji: '✨', color: '#7EB8D4' },
  other: { label: '其他', emoji: '💬', color: '#A8A29E' },
  admin_logistics: { label: '行政后勤', emoji: '🏢', color: '#E8917A' },
  office_env: { label: '办公环境', emoji: '🖥️', color: '#7EB8D4' },
  training: { label: '培训发展', emoji: '📚', color: '#8BC49E' },
  process_tools: { label: '流程工具', emoji: '⚙️', color: '#B8A9C9' },
};

// Batch-specific categories (based on classification principles)
export const BATCH_CATEGORIES: VoiceCategory[] = [
  'admin_logistics',
  'office_env',
  'training',
  'process_tools',
  'other',
];

export const BATCH_CATEGORY_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  admin_logistics: { label: '行政后勤', emoji: '🏢', color: '#E8917A' },
  office_env: { label: '办公环境', emoji: '🖥️', color: '#7EB8D4' },
  training: { label: '培训发展', emoji: '📚', color: '#8BC49E' },
  process_tools: { label: '流程工具', emoji: '⚙️', color: '#B8A9C9' },
  other: { label: '其他', emoji: '💬', color: '#A8A29E' },
};
