import fs from 'node:fs';
import path from 'node:path';
import type { Voice, VoiceCategory } from './types';

// JSON file path for persistent storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'voices.json');

// In-memory cache for fast reads, synced with JSON file
let cache: Voice[] | null = null;

/** Ensure data directory and file exist */
function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

/** Load voices from JSON file into cache */
function loadFromDisk(): Voice[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    cache = JSON.parse(raw) as Voice[];
  } catch {
    cache = [];
  }
  return cache;
}

/** Persist current cache to JSON file */
function saveToDisk(): void {
  if (!cache) return;
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

/** Get the store (lazy-load from disk on first access) */
export function getStore(): Voice[] {
  if (!cache) {
    loadFromDisk();
  }
  return cache!;
}

/** Force reload from disk (useful after external changes) */
export function reloadStore(): Voice[] {
  cache = null;
  return loadFromDisk();
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
  isSensitive?: boolean;
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
    isSensitive: data.isSensitive ?? false,
  };
  getStore().unshift(voice);
  saveToDisk();
  return voice;
}

export function addVoice(data: {
  content: string;
  category: VoiceCategory;
  author: string;
  isAnonymous: boolean;
  isBatch?: boolean;
  isSensitive?: boolean;
}): Voice {
  return createVoice(data);
}

export function likeVoice(id: string): Voice | undefined {
  const voice = getStore().find((v) => v.id === id);
  if (voice) {
    voice.likes += 1;
    saveToDisk();
  }
  return voice;
}

export function updateAiReply(id: string, reply: string): Voice | undefined {
  const voice = getStore().find((v) => v.id === id);
  if (voice) {
    voice.aiReply = reply;
    saveToDisk();
  }
  return voice;
}

export function updateVoice(
  id: string,
  data: {
    content?: string;
    category?: VoiceCategory;
    department?: string;
    status?: Voice['status'];
  }
): Voice | undefined {
  const voice = getStore().find((v) => v.id === id);
  if (voice) {
    if (data.content !== undefined) voice.content = data.content;
    if (data.category !== undefined) voice.category = data.category;
    if (data.department !== undefined) voice.department = data.department;
    if (data.status !== undefined) voice.status = data.status;
    saveToDisk();
  }
  return voice;
}

export function deleteVoice(id: string): boolean {
  const store = getStore();
  const index = store.findIndex((v) => v.id === id);
  if (index !== -1) {
    store.splice(index, 1);
    saveToDisk();
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

  const weeklyMap: Record<string, number> = {};

  for (const v of store) {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    // 所有心声都计入部门统计，未分配部门的心声归入"未分配"
    const dept = v.department || '未分配';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    totalLikes += v.likes;
    if (v.isAnonymous) anonymousCount++;
    if (new Date(v.createdAt).getTime() > oneWeekAgo) recentWeek++;

    const status = v.status || 'unresolved';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const d = new Date(v.createdAt);
    const year = d.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const dayOfYear = Math.floor((d.getTime() - oneJan.getTime()) / 86400000) + 1;
    const weekNum = Math.ceil((dayOfYear + oneJan.getDay()) / 7);
    const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;
    weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
  }

  const weeklyTrend = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  return { total, byCategory, byDepartment, byStatus, weeklyTrend, totalLikes, anonymousCount, recentWeek };
}
