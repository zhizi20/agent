/**
 * 敏感信息脱敏模块
 *
 * 对文本中的个人隐私信息进行识别和替换，用于展示层脱敏。
 * 原始内容存储在 JSON 中不做修改，仅在 API 返回展示数据时进行脱敏处理。
 */

// ============ 脱敏规则 ============

/** 身份证号：18位，保留前6后4 */
const ID_CARD_RE = /\b(\d{6})(\d{8})(\d{3}[\dXx])\b/g;

/** 手机号：11位，保留前3后4 */
const PHONE_RE = /\b(1[3-9]\d)(\d{4})(\d{4})\b/g;

/** 邮箱：保留首字母 */
const EMAIL_RE = /\b([a-zA-Z0-9])([a-zA-Z0-9._+-]*)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;

/** 银行卡号：16-19位，保留前4后4 */
const BANK_CARD_RE = /\b(\d{4})(\d{8,11})(\d{4})\b/g;

/** 微信号：关键词 + 后续内容 */
const WECHAT_RE = /(微信号[：:\s]*)([a-zA-Z0-9_-]{5,20})/gi;

/** QQ号：关键词 + 数字 */
const QQ_RE = /(QQ号[码]?[：:\s]*)(\d{5,12})/gi;

/** 中国地址：必须包含省/市/区/路/街等地址关键词 */
const ADDRESS_RE = /((?:[\u4e00-\u9fa5]{2,6}(?:省|自治区))?(?:[\u4e00-\u9fa5]{2,6}(?:市|区|县|镇|乡))[\u4e00-\u9fa5\d]*(?:路|大道|大街|巷|胡同|弄|号|栋|幢|单元|楼|室|座|小区|花园|广场|大厦|公寓|村|组|屯|寨|湾|坡|岭|堡|庄|营|院|府|城|庭|居)[\u4e00-\u9fa5\d]{0,20})/g;

/** 薪资金额：数字+元/块/万/千，或"月薪/工资/奖金/绩效+数字" */
const SALARY_AMOUNT_RE = /((?:月薪|工资|奖金|绩效|补贴|年薪|底薪|基本工资|加班费|提成)[^\d]{0,5})(\d{2,6}(?:\.\d{1,2})?)\s*(元|块|万|千|美元|USD|RMB)?/g;

/** 独立金额（上下文含薪资关键词） */
const CONTEXT_SALARY_RE = /(发|欠|扣|涨|降|给|拿|赚|赔|补)\s*(了|到|着)?\s*(\d{3,6}(?:\.\d{1,2})?)\s*(元|块|万|千)/g;

/** 合同编号：关键词 + 字母数字组合 */
const CONTRACT_RE = /((?:合同编号|订单号|项目号|编号|单号)[：:\s]*)([A-Za-z0-9-]{6,30})/gi;

/** 客户/供应商名称：关键词 + 中文公司名 */
const COMPANY_RE = /((?:客户|供应商|合作方|甲方|乙方)[名称]?[：:\s]*)([\u4e00-\u9fa5]{2,20}(?:公司|集团|企业|工厂|商行|工作室))/g;

/** 工号：关键词 + 数字/字母 */
const EMPLOYEE_ID_RE = /((?:工号|员工号|职工号|编号)[：:\s]*)([A-Za-z0-9]{4,15})/gi;

// ============ 脱敏函数 ============

function maskIdCard(text: string): string {
  return text.replace(ID_CARD_RE, (_match, p1: string, _p2: string, p3: string) => {
    return `${p1}********${p3}`;
  });
}

function maskPhone(text: string): string {
  return text.replace(PHONE_RE, (_match, p1: string, _p2: string, p3: string) => {
    return `${p1}****${p3}`;
  });
}

function maskEmail(text: string): string {
  return text.replace(EMAIL_RE, (_match, p1: string, _p2: string, p3: string) => {
    return `${p1}***${p3}`;
  });
}

function maskBankCard(text: string): string {
  return text.replace(BANK_CARD_RE, (_match, p1: string, _p2: string, p3: string) => {
    return `${p1}****${p3}`;
  });
}

function maskWechat(text: string): string {
  return text.replace(WECHAT_RE, (_match, p1: string, _p2: string) => {
    return `${p1}***`;
  });
}

function maskQQ(text: string): string {
  return text.replace(QQ_RE, (_match, p1: string, _p2: string) => {
    return `${p1}***`;
  });
}

function maskAddress(text: string): string {
  return text.replace(ADDRESS_RE, (match) => {
    if (match.length <= 6) return match;
    // 保留前6个字符（通常是省市区），后面用***替代
    const keep = match.slice(0, 6);
    return `${keep}***`;
  });
}

function maskSalaryAmount(text: string): string {
  let result = text.replace(SALARY_AMOUNT_RE, (_match, p1: string, _p2: string, p3: string) => {
    return `${p1}****${p3 ? p3 : ''}`;
  });
  result = result.replace(CONTEXT_SALARY_RE, (_match, p1: string, p2: string, _p3: string, p4: string) => {
    return `${p1}${p2 || ''}****${p4}`;
  });
  return result;
}

function maskContract(text: string): string {
  return text.replace(CONTRACT_RE, (_match, p1: string, _p2: string) => {
    return `${p1}***`;
  });
}

function maskCompany(text: string): string {
  return text.replace(COMPANY_RE, (_match, p1: string, p2: string) => {
    // 保留公司名前2个字
    const keep = p2.slice(0, 2);
    return `${p1}${keep}***`;
  });
}

function maskEmployeeId(text: string): string {
  return text.replace(EMPLOYEE_ID_RE, (_match, p1: string, _p2: string) => {
    return `${p1}***`;
  });
}

/**
 * 对文本内容进行敏感信息脱敏
 * 按优先级顺序执行：先匹配长格式（身份证、银行卡），再匹配短格式（手机号）
 * 避免误匹配
 */
export function desensitizeText(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. 先处理长数字格式（身份证18位、银行卡16-19位）
  result = maskIdCard(result);
  result = maskBankCard(result);

  // 2. 手机号（11位）
  result = maskPhone(result);

  // 3. 邮箱
  result = maskEmail(result);

  // 4. 社交账号
  result = maskWechat(result);
  result = maskQQ(result);

  // 5. 工号
  result = maskEmployeeId(result);

  // 6. 合同/项目编号
  result = maskContract(result);

  // 7. 客户/供应商名称
  result = maskCompany(result);

  // 8. 薪资相关金额
  result = maskSalaryAmount(result);

  // 9. 地址信息
  result = maskAddress(result);

  return result;
}

/**
 * 对 Voice 对象进行脱敏处理（返回新对象，不修改原始数据）
 */
export function desensitizeVoice<V extends { content: string; author: string; aiReply: string | null }>(
  voice: V
): V {
  return {
    ...voice,
    content: desensitizeText(voice.content),
    author: maskAuthorName(voice.author),
    aiReply: voice.aiReply ? desensitizeText(voice.aiReply) : null,
  };
}

/**
 * 对作者姓名进行脱敏
 * 中文名：保留姓，名用*替代
 * 英文名：保留首字母
 */
function maskAuthorName(name: string): string {
  if (!name) return name;

  // 中文名：2-4个字
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(name)) {
    return name.charAt(0) + '*'.repeat(name.length - 1);
  }

  // 英文名：保留首字母
  if (/^[a-zA-Z\s]+$/.test(name)) {
    return name.charAt(0).toUpperCase() + '***';
  }

  // 其他：保留第一个字符
  if (name.length > 1) {
    return name.charAt(0) + '***';
  }

  return name;
}
