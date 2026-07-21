/**
 * 违规内容审核模块
 *
 * 用于在员工发布心声时进行内容安全审核，拦截违规内容。
 * 审核范围：
 * 1. 人身攻击、辱骂、歧视
 * 2. 暴力威胁、恐吓、报复
 * 3. 自伤、自杀风险
 * 4. 泄露他人隐私
 * 5. 泄露公司商业秘密
 * 6. 恶意造谣或严重不实指控
 * 7. 违法违规内容
 */

// ============ 违规词库 ============

/** 人身攻击/辱骂/歧视 */
const PROFANITY_WORDS = [
  '妈的', '操你', '草泥马', '他妈的', '你妈', '傻逼', '煞笔', '沙比',
  '狗逼', '贱人', '婊子', '妓女', '废物', '去死', '死全家', '全家死',
  '脑残', '智障', '白痴', '蠢货', '猪狗', '畜生', '王八蛋', '混蛋',
  '滚蛋', '滚你妈', '狗东西', '贱货', '婊', '屌', '肏', '艹',
  '日你', '干你', '靠北', '干你娘', '你大爷', '你祖宗', 'cnm', 'tmd',
  'nm', 'sb', 'nmsl', 'wtf', 'fuck', 'shit', 'bitch', 'ass', 'damn',
  'bastard', 'dick', 'pussy',
];

/** 歧视性用语 */
const DISCRIMINATION_WORDS = [
  '残疾人.*滚', '乡巴佬', '外地人.*滚', '农村人.*素质',
  '女.*不行', '男.*不行', '年纪大.*没用', '年纪小.*不懂',
  '低智商', '基因差', '血统',
];

/** 暴力威胁/恐吓/报复 */
const VIOLENCE_PATTERNS = [
  /杀.*[他她它]|砍.*[他她它]|弄死|打死|弄残|打断.*腿/,
  /报复.*[他她]|整[死他她]|搞[死他她]/,
  /威胁|恐吓|要.*好看/,
  /等着瞧|给我小心|有.*好果子吃/,
  /找人.*教训|找人.*收拾/,
];

/** 自伤/自杀风险 */
const SELF_HARM_PATTERNS = [
  /不想活|活着没意思|活不下去/,
  /自杀|自残|割腕|跳楼|跳河/,
  /死了算了|不如死了|想死/,
  /了结.*自己|结束.*生命/,
  /遗书|遗言/,
  /安眠药.*吃|药.*吃.*多/,
];

/** 泄露他人隐私的模式（叙述性泄露他人信息，结构化PII由脱敏模块处理） */
const PRIVACY_LEAK_PATTERNS = [
  /他[她]的.*(手机号|身份证|银行卡|密码|住址|家庭)/, // 他/她的xxx
  /把.*的.*(手机号|身份证|住址|密码).*(发|告诉|公开)/, // 把xxx的手机号发出来
];

/** 商业秘密/机密信息 */
const TRADE_SECRET_PATTERNS = [
  /机密|绝密|秘密|内部资料|保密/,
  /密码.*[：:]\s*\S+/,
  /账号.*[：:]\s*\S+.*密码/,
  /财务数据|营收数据|利润表|资产负债表/,
  /未公开.*财报|内部.*报告/,
  /核心.*技术|专利.*细节|源代码/,
  /客户名单|供应商报价|成本价/,
  /并购|收购.*内幕|重组.*计划/,
  /底价|底价.*万|报价.*策略/,
];

/** 违法违规内容 */
const ILLEGAL_PATTERNS = [
  /赌博网站|博彩|六合彩|时时彩/,
  /色情|卖淫|嫖娼|约炮/,
  /毒品|冰毒|大麻.*卖|摇头丸/,
  /邪教|法轮功|传销|拉人头/,
  /行贿|受贿.*万|回扣.*万/,
  /洗钱|套现|信用卡.*套/,
];

/** 恶意造谣/不实指控 */
const RUMOR_PATTERNS = [
  /听说.*贪污.*万|据说.*受贿/,
  /内幕.*潜规则/,
  /领导.*包养|领导.*小三/,
  /公司.*要倒闭|马上.*破产/,
  /集体.*罢工|组织.*闹事/,
];

/** 违规敏感言论/政治敏感 */
const SENSITIVE_POLITICAL_WORDS = [
  '暴动', '造反', '推翻', '颠覆', '分裂国家', '独立运动',
  '恐怖袭击', '炸弹', '枪支', '杀人', '自杀方法',
];

// ============ 审核类型定义 ============

export type ViolationCategory =
  | 'profanity'      // 人身攻击/辱骂
  | 'discrimination' // 歧视
  | 'violence'       // 暴力威胁
  | 'self_harm'      // 自伤/自杀风险
  | 'privacy_leak'   // 泄露他人隐私
  | 'trade_secret'   // 商业秘密
  | 'illegal'        // 违法违规
  | 'rumor'          // 恶意造谣
  | 'political';     // 政治敏感

export interface ViolationCheckResult {
  isViolation: boolean;
  category?: ViolationCategory;
  reason?: string;
  /** 给用户看的拦截提示 */
  message?: string;
}

// ============ 分类提示语 ============

const CATEGORY_MESSAGES: Record<ViolationCategory, string> = {
  profanity: '您的发言包含人身攻击或辱骂性语言，请文明表达。',
  discrimination: '您的发言包含歧视性内容，请尊重每一个人。',
  violence: '您的发言包含暴力威胁或恐吓内容，请立即停止此类表达。',
  self_harm: '我们注意到您可能正在经历困难时期。请拨打24小时心理援助热线：400-161-9995，我们关心您的安全。',
  privacy_leak: '您的发言包含他人个人隐私信息（如手机号、身份证号等），请删除后重新提交。',
  trade_secret: '您的发言可能涉及公司商业秘密或机密信息，请确认后重新提交。',
  illegal: '您的发言包含违法违规内容，已被系统拦截。',
  rumor: '您的发言可能包含未经证实的不实信息，请核实后重新提交。',
  political: '您的发言包含敏感内容，请调整后重新提交。',
};

// ============ 审核函数 ============

/**
 * 检测文本是否包含违规内容
 */
export function checkSensitiveContent(text: string): ViolationCheckResult {
  const normalizedText = text.toLowerCase().trim();

  if (!normalizedText) {
    return { isViolation: false };
  }

  // 1. 人身攻击/辱骂
  for (const word of PROFANITY_WORDS) {
    if (normalizedText.includes(word.toLowerCase())) {
      return {
        isViolation: true,
        category: 'profanity',
        reason: '包含不文明/辱骂性语言',
        message: CATEGORY_MESSAGES.profanity,
      };
    }
  }

  // 2. 歧视性内容
  for (const pattern of DISCRIMINATION_WORDS) {
    if (new RegExp(pattern, 'i').test(normalizedText)) {
      return {
        isViolation: true,
        category: 'discrimination',
        reason: '包含歧视性内容',
        message: CATEGORY_MESSAGES.discrimination,
      };
    }
  }

  // 3. 暴力威胁/恐吓/报复
  for (const pattern of VIOLENCE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isViolation: true,
        category: 'violence',
        reason: '包含暴力威胁或恐吓内容',
        message: CATEGORY_MESSAGES.violence,
      };
    }
  }

  // 4. 自伤/自杀风险
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isViolation: true,
        category: 'self_harm',
        reason: '包含自伤/自杀风险内容',
        message: CATEGORY_MESSAGES.self_harm,
      };
    }
  }

  // 5. 泄露他人隐私
  for (const pattern of PRIVACY_LEAK_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isViolation: true,
        category: 'privacy_leak',
        reason: '包含他人个人隐私信息',
        message: CATEGORY_MESSAGES.privacy_leak,
      };
    }
  }

  // 6. 商业秘密/机密信息
  for (const pattern of TRADE_SECRET_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isViolation: true,
        category: 'trade_secret',
        reason: '涉及公司商业秘密或机密信息',
        message: CATEGORY_MESSAGES.trade_secret,
      };
    }
  }

  // 7. 违法违规内容
  for (const pattern of ILLEGAL_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isViolation: true,
        category: 'illegal',
        reason: '包含违法违规内容',
        message: CATEGORY_MESSAGES.illegal,
      };
    }
  }

  // 8. 恶意造谣/不实指控
  for (const pattern of RUMOR_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isViolation: true,
        category: 'rumor',
        reason: '可能包含未经证实的不实信息',
        message: CATEGORY_MESSAGES.rumor,
      };
    }
  }

  // 9. 违规敏感言论
  for (const word of SENSITIVE_POLITICAL_WORDS) {
    if (normalizedText.includes(word)) {
      return {
        isViolation: true,
        category: 'political',
        reason: '包含违规敏感内容',
        message: CATEGORY_MESSAGES.political,
      };
    }
  }

  return { isViolation: false };
}

/**
 * 违规内容被拦截时的标准回复话术（兼容旧接口）
 */
export const SENSITIVE_BLOCK_MESSAGE = '您提交的内容包含违规/敏感/不文明信息，已被系统拦截，请修改合规内容后重新提交。';
