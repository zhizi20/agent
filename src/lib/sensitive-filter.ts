/**
 * 敏感内容检测模块
 * 
 * 检测范围：
 * 1. 脏话、辱骂、不文明、粗鲁攻击性语言
 * 2. 企业内部隐私、机密信息、涉密内容
 * 3. 违规敏感言论、不当政治、过激言论、不合规表述
 */

// 敏感词库 - 脏话/辱骂/攻击性语言
const PROFANITY_WORDS = [
  '妈的', '操你', '草泥马', '他妈的', '你妈', '傻逼', '煞笔', '沙比',
  '狗逼', '贱人', '婊子', '妓女', '废物', '去死', '死全家', '全家死',
  '脑残', '智障', '白痴', '蠢货', '猪狗', '畜生', '王八蛋', '混蛋',
  '滚蛋', '滚你妈', '狗东西', '贱货', '婊', '屌', '肏', '艹',
  '日你', '干你', '靠北', '干你娘', '你大爷', '你祖宗', 'cnm', 'tmd',
  'nm', 'sb', 'nmsl', 'wtf', 'fuck', 'shit', 'bitch', 'ass', 'damn',
  'bastard', 'dick', 'pussy',
];

// 敏感词库 - 企业内部隐私/机密信息关键词模式
const PRIVACY_PATTERNS = [
  /\d{17}[\dXx]/, // 身份证号
  /\d{16,19}/, // 银行卡号
  /1[3-9]\d{9}/, // 手机号
  /机密|绝密|秘密|内部资料|保密/, // 涉密标记
  /密码.*[：:]\s*\S+/, // 密码信息
  /账号.*[：:]\s*\S+.*密码/, // 账号密码组合
  /财务数据|营收数据|利润表|资产负债表/, // 财务敏感
  /未公开.*财报|内部.*报告/, // 未公开信息
];

// 敏感词库 - 违规敏感言论/不当政治/过激言论
const SENSITIVE_POLITICAL_WORDS = [
  '暴动', '造反', '推翻', '颠覆', '分裂国家', '独立运动',
  '恐怖袭击', '炸弹', '枪支', '杀人', '自杀方法',
  '赌博网站', '色情', '卖淫', '嫖娼', '毒品', '冰毒',
  '邪教', '法轮功', '传销',
];

// 过激威胁性言论模式
const THREAT_PATTERNS = [
  /杀.*[他她它]|砍.*[他她它]|弄死|打死/, // 暴力威胁
  /举报.*领导.*贪污/, // 可能涉及不实举报
  /要.*死.*给.*看/, // 极端威胁
];

export interface SensitiveCheckResult {
  isSensitive: boolean;
  reason?: string;
  category?: 'profanity' | 'privacy' | 'political' | 'threat';
}

/**
 * 检测文本是否包含敏感内容
 */
export function checkSensitiveContent(text: string): SensitiveCheckResult {
  const normalizedText = text.toLowerCase().trim();
  
  if (!normalizedText) {
    return { isSensitive: false };
  }

  // 1. 检测脏话/辱骂
  for (const word of PROFANITY_WORDS) {
    if (normalizedText.includes(word.toLowerCase())) {
      return {
        isSensitive: true,
        reason: '包含不文明/辱骂性语言',
        category: 'profanity',
      };
    }
  }

  // 2. 检测企业隐私/机密信息
  for (const pattern of PRIVACY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSensitive: true,
        reason: '包含个人隐私或企业机密信息',
        category: 'privacy',
      };
    }
  }

  // 3. 检测违规敏感言论
  for (const word of SENSITIVE_POLITICAL_WORDS) {
    if (normalizedText.includes(word)) {
      return {
        isSensitive: true,
        reason: '包含违规敏感内容',
        category: 'political',
      };
    }
  }

  // 4. 检测过激威胁性言论
  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSensitive: true,
        reason: '包含过激威胁性言论',
        category: 'threat',
      };
    }
  }

  return { isSensitive: false };
}

/**
 * 敏感内容被拦截时的标准回复话术
 */
export const SENSITIVE_BLOCK_MESSAGE = '您提交的内容包含违规/敏感/不文明信息，已被系统拦截，请修改合规内容后重新提交。';
