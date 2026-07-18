import type { Voice, VoiceCategory } from './types';
import { SEED_VOICES } from './seed-data';

// In-memory store (server-side only) - initialized with 238 real feedback entries
let voices: Voice[] = [...SEED_VOICES];

export function getAllVoices(): Voice[] {
  return [...voices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getVoiceById(id: string): Voice | undefined {
  return voices.find((v) => v.id === id);
}

export function createVoice(data: {
  content: string;
  category: VoiceCategory;
  author: string;
  isAnonymous: boolean;
  isBatch?: boolean;
}): Voice {
  const voice: Voice = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    content: data.content,
    category: data.category,
    author: data.isAnonymous ? '' : data.author,
    isAnonymous: data.isAnonymous,
    likes: 0,
    aiReply: null,
    createdAt: new Date().toISOString(),
    isBatch: data.isBatch ?? false,
  };
  voices = [voice, ...voices];
  return voice;
}

export function addVoice(data: {
  content: string;
  category: VoiceCategory;
  author: string;
  isAnonymous: boolean;
  isBatch?: boolean;
}): Voice {
  return createVoice(data);
}

export function likeVoice(id: string): Voice | undefined {
  const voice = voices.find((v) => v.id === id);
  if (voice) {
    voice.likes += 1;
  }
  return voice;
}

export function updateAiReply(id: string, reply: string): Voice | undefined {
  const voice = voices.find((v) => v.id === id);
  if (voice) {
    voice.aiReply = reply;
  }
  return voice;
}

export function getVoiceStats() {
  const total = voices.length;
  const byCategory: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  let totalLikes = 0;
  let anonymousCount = 0;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let recentWeek = 0;

  for (const v of voices) {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    if (v.department) {
      byDepartment[v.department] = (byDepartment[v.department] || 0) + 1;
    }
    totalLikes += v.likes;
    if (v.isAnonymous) anonymousCount++;
    if (new Date(v.createdAt).getTime() > oneWeekAgo) recentWeek++;
  }

  return { total, byCategory, byDepartment, totalLikes, anonymousCount, recentWeek };
}
