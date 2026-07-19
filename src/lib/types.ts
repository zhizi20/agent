// 反馈分类类型（基于反馈问题列表_20260712_164911.xlsx）
export type FeedbackCategory =
  | 'performance'    // 绩效问题
  | 'accommodation'  // 住宿问题
  | 'attendance'     // 考勤问题
  | 'management'     // 管理问题
  | 'salary'         // 工资问题
  | 'dining'         // 用餐问题
  | 'rough_manage'   // 粗暴管理
  | 'other';         // 其他

// 紧急程度（基于反馈分类与处理原则.txt）
export type UrgencyLevel = 'urgent' | 'high' | 'normal';

// 处理状态
export type HandleStatus = 'resolved' | 'unresolved';

// 责任部门
export type ResponsibleDept =
  | '人力资源部'
  | '行政部'
  | '生产管理部'
  | '质量管理部'
  | '供应链管理部'
  | '厂长办公室'
  | '工会/员工关系';

// 反馈数据项
export interface Feedback {
  id: string;
  name: string;
  department: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  handler: string;
  result: string;
  score: string;
  scoreContent: string;
  factory: string;
  urgency: UrgencyLevel;
  responsibleDept: ResponsibleDept;
  handleStatus: HandleStatus;
  createdAt: string;
}

// 分类选项
export const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; color: string }[] = [
  { value: 'performance', label: '绩效问题', color: '#E8917A' },
  { value: 'accommodation', label: '住宿问题', color: '#D4A574' },
  { value: 'attendance', label: '考勤问题', color: '#B8A9C9' },
  { value: 'management', label: '管理问题', color: '#7FB5B0' },
  { value: 'salary', label: '工资问题', color: '#E5A889' },
  { value: 'dining', label: '用餐问题', color: '#9DB5A5' },
  { value: 'rough_manage', label: '粗暴管理', color: '#C97B6B' },
  { value: 'other', label: '其他', color: '#A8A099' },
];

// 紧急程度选项
export const URGENCY_OPTIONS: { value: UrgencyLevel; label: string; color: string; desc: string }[] = [
  { value: 'urgent', label: '紧急', color: '#DC2626', desc: '涉及人身安全、群体性事件、违法违纪、媒体曝光风险' },
  { value: 'high', label: '高优', color: '#EA580C', desc: '涉及薪资、绩效、住宿安全等核心权益' },
  { value: 'normal', label: '常规', color: '#2563EB', desc: '管理沟通、流程建议、设施报修等' },
];

// 厂区列表
export const FACTORY_LIST = [
  '智能总装一厂',
  '智能总装二厂',
  '注塑厂',
  '质量及运营',
  '供应链',
  '其他部门',
];

// 责任部门列表
export const RESPONSIBLE_DEPT_LIST: ResponsibleDept[] = [
  '人力资源部',
  '行政部',
  '生产管理部',
  '质量管理部',
  '供应链管理部',
  '厂长办公室',
  '工会/员工关系',
];

// 分类映射（用于组件）
export const CATEGORY_MAP: Record<FeedbackCategory, { label: string; color: string; bgColor: string }> = {
  performance: { label: '绩效问题', color: '#E8917A', bgColor: '#FEF2F0' },
  accommodation: { label: '住宿问题', color: '#D4A574', bgColor: '#FDF6EE' },
  attendance: { label: '考勤问题', color: '#B8A9C9', bgColor: '#F5F0F8' },
  management: { label: '管理问题', color: '#7FB5B0', bgColor: '#EFF7F6' },
  salary: { label: '工资问题', color: '#E5A889', bgColor: '#FDF3EE' },
  dining: { label: '用餐问题', color: '#9DB5A5', bgColor: '#F0F5F2' },
  rough_manage: { label: '粗暴管理', color: '#C97B6B', bgColor: '#F8EFED' },
  other: { label: '其他', color: '#A8A099', bgColor: '#F5F3F1' },
};

// 分类对应的责任部门
export const DEPARTMENT_RESPONSIBILITY: Record<FeedbackCategory, string[]> = {
  performance: ['人力资源部', '生产管理部'],
  accommodation: ['行政部'],
  attendance: ['生产管理部', '人力资源部'],
  management: ['厂长办公室', '工会/员工关系'],
  salary: ['人力资源部'],
  dining: ['行政部'],
  rough_manage: ['工会/员工关系', '厂长办公室'],
  other: ['行政部'],
};
