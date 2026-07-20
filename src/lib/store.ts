import type { Voice, VoiceCategory } from './types';
import { SEED_VOICES } from './seed-data';

// Use globalThis to persist the in-memory store across HMR re-evaluations in dev mode.
// Without this, Next.js dev server HMR resets `voices` back to SEED_VOICES on every
// module re-evaluation, causing newly created voices to disappear.
declare global {
  // eslint-disable-next-line no-var
  var __voicesStore: Voice[] | undefined;
}

function getStore(): Voice[] {
  if (!globalThis.__voicesStore) {
    globalThis.__voicesStore = [...SEED_VOICES];
  }
  return globalThis.__voicesStore;
}

export function getAllVoices(): Voice[] {
  return [...getStore()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getVoiceById(id: string): Voice | undefined {
  return getStore().find((v) => v.id === id);
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
    status: 'unresolved',
    createdAt: new Date().toISOString(),
    isBatch: data.isBatch ?? false,
  };
  // Mutate the global store in-place instead of reassigning
  getStore().unshift(voice);
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
  const voice = getStore().find((v) => v.id === id);
  if (voice) {
    voice.likes += 1;
  }
  return voice;
}

export function updateAiReply(id: string, reply: string): Voice | undefined {
  const voice = getStore().find((v) => v.id === id);
  if (voice) {
    voice.aiReply = reply;
  }
  return voice;
}

export function updateVoice(id: string, data: { content?: string; category?: VoiceCategory; department?: string; status?: Voice['status'] }): Voice | undefined {
  const voice = getStore().find((v) => v.id === id);
  if (voice) {
    if (data.content !== undefined) voice.content = data.content;
    if (data.category !== undefined) voice.category = data.category;
    if (data.department !== undefined) voice.department = data.department;
    if (data.status !== undefined) voice.status = data.status;
  }
  return voice;
}

export function deleteVoice(id: string): boolean {
  const store = getStore();
  const index = store.findIndex((v) => v.id === id);
  if (index !== -1) {
    store.splice(index, 1);
    return true;
  }
  return false;
}

export function getVoiceStats() {
  const store = getStore();
  const total = store.length;
  const byCategory: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byStatus: Record<string, number> = { resolved: 0, unresolved: 0 };
  let totalLikes = 0;
  let anonymousCount = 0;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let recentWeek = 0;

  // Weekly trend: group by ISO week
  const weeklyMap: Record<string, number> = {};

  for (const v of store) {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    if (v.department) {
      byDepartment[v.department] = (byDepartment[v.department] || 0) + 1;
    }
    totalLikes += v.likes;
    if (v.isAnonymous) anonymousCount++;
    if (new Date(v.createdAt).getTime() > oneWeekAgo) recentWeek++;

    // Status
    const status = v.status || 'unresolved';
    byStatus[status] = (byStatus[status] || 0) + 1;

    // Weekly trend - compute ISO week string
    const d = new Date(v.createdAt);
    const year = d.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const dayOfYear = Math.floor((d.getTime() - oneJan.getTime()) / 86400000) + 1;
    const weekNum = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
    const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;
    weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
  }

  // Sort weekly trend by week key
  const weeklyTrend = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  return { total, byCategory, byDepartment, byStatus, weeklyTrend, totalLikes, anonymousCount, recentWeek };
}
