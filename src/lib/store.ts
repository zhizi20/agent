import type { Voice, VoiceCategory } from './types';

// In-memory store (server-side only)
let voices: Voice[] = [
  {
    id: '1',
    content: '这个月的绩效考核标准又变了，之前定的目标根本不合理，感觉怎么努力都完不成。',
    category: 'performance',
    author: '',
    isAnonymous: true,
    likes: 24,
    aiReply: '绩效考核标准的合理性确实很重要。建议你和直属主管沟通，了解指标调整的背景，也可以提出自己的看法。',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '2',
    content: '宿舍的热水器坏了快两周了，报修了也没人来修，每天只能用冷水洗澡，太难受了。',
    category: 'housing',
    author: '',
    isAnonymous: true,
    likes: 31,
    aiReply: '住宿条件直接影响生活质量，这个问题需要尽快解决。建议再次联系后勤部门并保留报修记录。',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    content: '加班打卡系统经常出问题，明明加了班却打不上卡，考勤记录总是对不上。',
    category: 'attendance',
    author: '',
    isAnonymous: true,
    likes: 18,
    aiReply: '考勤记录关系到大家的切身利益，系统问题应该尽快修复。建议同时保留加班证据（如邮件、聊天记录）作为备份。',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '4',
    content: '部门主管开会经常当众骂人，说话很难听，让人很没面子，工作压力更大了。',
    category: 'rough_management',
    author: '',
    isAnonymous: true,
    likes: 45,
    aiReply: '没有人应该在工作中被粗暴对待。如果情况严重，可以向HR部门反映，公司应该维护每位员工的基本尊严。',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: '5',
    content: '食堂的菜品太单一了，而且有时候不太新鲜，希望能改善一下用餐质量。',
    category: 'dining',
    author: '',
    isAnonymous: true,
    likes: 22,
    aiReply: '用餐质量直接影响大家的身体健康和工作状态。建议向行政部门反馈具体问题，也可以收集同事意见一起提出。',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: '6',
    content: '入职半年了，工资还是按最低标准发的，同岗位的老员工说早就该调了，但一直没动静。',
    category: 'salary',
    author: '',
    isAnonymous: true,
    likes: 38,
    aiReply: '薪酬问题确实让人焦虑。建议在合适的时机与HR或主管沟通薪资调整机制，了解公司的调薪周期和标准。',
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
  let totalLikes = 0;
  let anonymousCount = 0;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let recentWeek = 0;

  for (const v of voices) {
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    totalLikes += v.likes;
    if (v.isAnonymous) anonymousCount++;
    if (new Date(v.createdAt).getTime() > oneWeekAgo) recentWeek++;
  }

  return { total, byCategory, totalLikes, anonymousCount, recentWeek };
}
