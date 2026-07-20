/**
 * 员工心声去重检测模块
 * 
 * 规则：
 * 1. 仅对普通员工生效，管理层不执行去重
 * 2. 同一员工（按 author 标识）提交相似内容时拦截
 * 3. 保留最早的第一条，后续重复内容丢弃
 * 4. 豁免场景：修改后主旨明显变更，或间隔30天以上且有大量新描述
 */

import { getStore } from './store';

// 中文停用词和语气词（用于相似度计算时过滤）
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '怎么', '为什么',
  '啊', '呢', '吧', '吗', '呀', '哦', '嗯', '哈', '哎', '嘛', '啦',
  '，', '。', '！', '？', '、', '；', '：', '（', '）',
  ' ', '\n', '\r', '\t',
]);

/**
 * 文本预处理：去除停用词、标点、空白，提取关键词
 */
function tokenize(text: string): string[] {
  // 移除标点和空白
  const cleaned = text
    .replace(/[，。！？、；："'"''（）\s\n\r\t]/g, ' ')
    .toLowerCase();
  
  // 按空格分词（中文按字分，英文按词分）
  const tokens: string[] = [];
  for (const char of cleaned) {
    if (char.trim() && !STOP_WORDS.has(char)) {
      tokens.push(char);
    }
  }
  
  return tokens;
}

/**
 * 计算两个文本的相似度（Jaccard 相似度）
 * 返回 0-1 之间的值，1 表示完全相同
 */
function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));
  
  if (tokens1.size === 0 && tokens2.size === 0) return 1;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  // 计算交集
  let intersection = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersection++;
    }
  }
  
  // 计算并集
  const union = tokens1.size + tokens2.size - intersection;
  
  return intersection / union;
}

/**
 * 检查两条心声是否属于"主旨明显变更"
 * 通过比较分类是否改变 + 内容相似度是否低于阈值
 */
function isSubstantiallyDifferent(
  existingCategory: string,
  newCategory: string,
  similarity: number
): boolean {
  // 分类改变且相似度低于 0.5，认为主旨变更
  if (existingCategory !== newCategory && similarity < 0.5) {
    return true;
  }
  // 分类相同但相似度低于 0.4，认为有实质性新内容
  if (similarity < 0.4) {
    return true;
  }
  return false;
}

/**
 * 检查是否满足"间隔30天以上且有大量新描述"的豁免条件
 */
function isExemptByTimeAndContent(
  existingDate: string,
  existingContent: string,
  newContent: string,
  similarity: number
): boolean {
  const existingTime = new Date(existingDate).getTime();
  const now = Date.now();
  const daysDiff = (now - existingTime) / (1000 * 60 * 60 * 24);
  
  // 间隔超过30天
  if (daysDiff > 30) {
    // 且新内容长度显著增加（超过原内容 50% 以上）
    const lengthRatio = newContent.length / Math.max(existingContent.length, 1);
    // 且相似度不是特别高（说明有大量新内容）
    if (lengthRatio > 1.5 && similarity < 0.6) {
      return true;
    }
  }
  
  return false;
}

/**
 * 去重检测结果
 */
export interface DeduplicationResult {
  isDuplicate: boolean;
  message?: string;
  existingVoiceId?: string;
}

/**
 * 检测新心声是否与已有心声重复
 * 
 * @param author 作者（员工标识）
 * @param content 心声内容
 * @param category 分类
 * @param role 用户角色（'employee' | 'manager'）
 * @returns 去重检测结果
 */
export function checkDuplicate(
  author: string,
  content: string,
  category: string,
  role: string = 'employee'
): DeduplicationResult {
  // 管理层不执行去重
  if (role === 'manager') {
    return { isDuplicate: false };
  }
  
  const normalizedAuthor = author.trim().toLowerCase();
  const normalizedContent = content.trim();
  
  if (!normalizedAuthor || !normalizedContent) {
    return { isDuplicate: false };
  }
  
  const voices = getStore();
  
  // 查找同一作者的所有心声
  const authorVoices = voices.filter(
    (v) => v.author.trim().toLowerCase() === normalizedAuthor
  );
  
  if (authorVoices.length === 0) {
    return { isDuplicate: false };
  }
  
  // 逐条检查是否重复
  for (const existing of authorVoices) {
    const similarity = calculateSimilarity(existing.content, normalizedContent);
    
    // 完全相同（100% 一致）
    if (similarity >= 0.95) {
      return {
        isDuplicate: true,
        message: '检测到您已发布过主旨相同的心声，为避免诉求重复堆积，仅保留您首次提交的内容，本次提交不予新增。您可修改内容、更换诉求方向后重新发布。',
        existingVoiceId: existing.id,
      };
    }
    
    // 高度相似（核心诉求一致）
    if (similarity >= 0.7) {
      // 检查豁免场景
      if (isSubstantiallyDifferent(existing.category, category, similarity)) {
        continue; // 主旨明显变更，不判定重复
      }
      
      if (isExemptByTimeAndContent(existing.createdAt, existing.content, normalizedContent, similarity)) {
        continue; // 间隔30天以上且有大量新描述，不判定重复
      }
      
      return {
        isDuplicate: true,
        message: '检测到您已发布过主旨相同的心声，为避免诉求重复堆积，仅保留您首次提交的内容，本次提交不予新增。您可修改内容、更换诉求方向后重新发布。',
        existingVoiceId: existing.id,
      };
    }
  }
  
  return { isDuplicate: false };
}
