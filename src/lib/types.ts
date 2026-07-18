// 真实的员工反馈类别（基于238条脱敏数据）
export type FeedbackCategory =
  | 'performance'    // 绩效问题 (73条, 30.7%)
  | 'accommodation'  // 住宿问题 (61条, 25.6%)
  | 'attendance'     // 考勤问题 (35条, 14.7%)
  | 'management'     // 管理问题 (13条, 5.5%)
  | 'salary'         // 工资问题 (10条, 4.2%)
  | 'dining'         // 用餐问题 (10条, 4.2%)
  | 'rough_manage'   // 粗暴管理 (1条, 0.4%)
  | 'other';         // 其他 (35条, 14.7%)

export interface Feedback {
  id: string;
  name: string;           // 已脱敏姓名
  department: string;     // 部门
  category: FeedbackCategory;
  title: string;
  description: string;
  handler: string;        // 处理人（已脱敏）
  result: string;         // 处理结果
  score: string;          // 评价分数
  scoreContent: string;   // 评价内容
  factory: string;        // 所属厂区
  createdAt: string;
}

export const CATEGORY_MAP: Record<FeedbackCategory, { label: string; emoji: string; color: string }> = {
  performance:   { label: '绩效问题', emoji: '📊', color: '#E8917A' },
  accommodation: { label: '住宿问题', emoji: '🏠', color: '#7EB8D4' },
  attendance:    { label: '考勤问题', emoji: '⏰', color: '#B8A9C9' },
  management:    { label: '管理问题', emoji: '👔', color: '#D4A574' },
  salary:        { label: '工资问题', emoji: '💰', color: '#8BC49E' },
  dining:        { label: '用餐问题', emoji: '🍽️', color: '#F4A261' },
  rough_manage:  { label: '粗暴管理', emoji: '⚠️', color: '#DC2626' },
  other:         { label: '其他', emoji: '💬', color: '#A8A29E' },
};

// 厂区映射
export const FACTORY_MAP: Record<string, { label: string; color: string }> = {
  '智能总装一厂': { label: '智能总装一厂', color: '#D4A574' },
  '智能总装二厂': { label: '智能总装二厂', color: '#7EB8D4' },
  '注塑厂':       { label: '注塑厂', color: '#B8A9C9' },
  '质量及运营':   { label: '质量及运营', color: '#8BC49E' },
  '供应链':       { label: '供应链', color: '#E8917A' },
  '其他部门':     { label: '其他部门', color: '#A8A29E' },
};

// 责任部门映射
export const DEPARTMENT_RESPONSIBILITY: Record<FeedbackCategory, string[]> = {
  performance:   ['人力资源部', '部门负责人'],
  accommodation: ['行政部', '后勤供应商'],
  attendance:    ['人力资源部', 'IT部'],
  management:    ['人力资源部', '部门负责人'],
  salary:        ['人力资源部', '财务部'],
  dining:        ['行政部', '后勤供应商'],
  rough_manage:  ['人力资源部', '安全部门'],
  other:         ['行政部'],
};

// 紧急程度判断标准
export const URGENCY_CRITERIA: Record<'high' | 'medium' | 'low', { label: string; color: string; desc: string }> = {
  high:   { label: '高', color: '#DC2626', desc: '涉及安全、大面积影响、可能引发离职' },
  medium: { label: '中', color: '#D97706', desc: '影响效率但有临时方案' },
  low:    { label: '低', color: '#059669', desc: '体验优化、长期改进类' },
};
