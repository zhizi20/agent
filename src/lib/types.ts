export type VoiceCategory = 'suggestion' | 'vent' | 'gratitude' | 'confusion' | 'idea' | 'other';

export interface Voice {
  id: string;
  content: string;
  category: VoiceCategory;
  author: string;
  isAnonymous: boolean;
  likes: number;
  aiReply: string | null;
  createdAt: string;
}

export const CATEGORY_MAP: Record<VoiceCategory, { label: string; emoji: string; color: string }> = {
  suggestion: { label: '建议', emoji: '💡', color: '#D4A574' },
  vent: { label: '吐槽', emoji: '😤', color: '#E8917A' },
  gratitude: { label: '感恩', emoji: '🙏', color: '#8BC49E' },
  confusion: { label: '困惑', emoji: '🤔', color: '#B8A9C9' },
  idea: { label: '灵感', emoji: '✨', color: '#7EB8D4' },
  other: { label: '其他', emoji: '💬', color: '#A8A29E' },
};
