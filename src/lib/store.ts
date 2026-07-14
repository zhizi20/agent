import type { Voice, VoiceCategory } from './types';

// In-memory store (server-side only)
let voices: Voice[] = [
  {
    id: '1',
    content: '希望公司能多一些团建活动，增进部门之间的了解和协作。平时大家都很忙，很少有机会和其他部门的同事交流。',
    category: 'suggestion',
    author: '小明',
    isAnonymous: false,
    likes: 12,
    aiReply: '感谢你的建议！团队建设确实是增进协作的重要方式。我们已经计划在下季度组织一次跨部门的户外活动，期待你的参与！',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '2',
    content: '最近项目压力好大，连续加班两周了。虽然知道项目重要，但感觉身体有点吃不消...',
    category: 'vent',
    author: '',
    isAnonymous: true,
    likes: 28,
    aiReply: '你的辛苦大家都看在眼里。健康永远是第一位的，建议你和直属主管沟通一下工作节奏，适当调整排期。记住，你比任何项目都重要。',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    content: '特别感谢我们组的 leader，每次遇到困难都会耐心指导，还经常自掏腰包请大家喝奶茶。遇到这样的领导真的很幸运！',
    category: 'gratitude',
    author: '小红',
    isAnonymous: false,
    likes: 35,
    aiReply: '温暖的团队关系是最珍贵的财富！有这样的好 leader 值得珍惜，也相信你的感恩之心会让团队更加凝聚。',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '4',
    content: '对于新上线的 OKR 系统有些不太理解，目标和关键结果之间的关系总是理不清楚，有没有培训可以参加？',
    category: 'confusion',
    author: '',
    isAnonymous: true,
    likes: 8,
    aiReply: 'OKR 确实需要一些时间来适应。HR 团队下周会组织一场线上培训，届时会详细讲解 OKR 的制定方法和最佳实践，记得关注邮件通知哦！',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: '5',
    content: '我有一个想法：能不能在办公区设置一个安静的冥想角？配上柔和的灯光和绿植，让大家在高压时有个放松的空间。',
    category: 'idea',
    author: '匿名同事',
    isAnonymous: true,
    likes: 42,
    aiReply: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: '6',
    content: '食堂的菜品能不能多一些健康轻食的选择？最近在健身，发现可选的蛋白质餐食比较有限。',
    category: 'suggestion',
    author: '健身达人',
    isAnonymous: false,
    likes: 15,
    aiReply: '收到你的建议！行政部已经在和食堂供应商沟通，下个月会新增健康轻食窗口，包括鸡胸肉沙拉、蛋白质碗等选项，敬请期待！',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export function getAllVoices(): Voice[] {
  return [...voices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getVoiceById(id: string): Voice | undefined {
  return voices.find((v) => v.id === id);
}

export function getVoicesByCategory(category: VoiceCategory): Voice[] {
  return getAllVoices().filter((v) => v.category === category);
}

export function createVoice(data: {
  content: string;
  category: VoiceCategory;
  author: string;
  isAnonymous: boolean;
}): Voice {
  const newVoice: Voice = {
    id: String(Date.now()),
    content: data.content,
    category: data.category,
    author: data.isAnonymous ? '' : data.author,
    isAnonymous: data.isAnonymous,
    likes: 0,
    aiReply: null,
    createdAt: new Date().toISOString(),
  };
  voices = [newVoice, ...voices];
  return newVoice;
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

export function getVoiceStats(): {
  total: number;
  byCategory: Record<string, number>;
  totalLikes: number;
  anonymousCount: number;
  recentWeek: number;
} {
  const now = Date.now();
  const weekAgo = now - 86400000 * 7;

  const byCategory: Record<string, number> = {};
  let totalLikes = 0;
  let anonymousCount = 0;
  let recentWeek = 0;

  for (const v of voices) {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    totalLikes += v.likes;
    if (v.isAnonymous) anonymousCount++;
    if (new Date(v.createdAt).getTime() > weekAgo) recentWeek++;
  }

  return {
    total: voices.length,
    byCategory,
    totalLikes,
    anonymousCount,
    recentWeek,
  };
}
