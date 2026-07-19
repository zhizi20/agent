'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { CATEGORY_OPTIONS, URGENCY_OPTIONS, FACTORY_LIST, RESPONSIBLE_DEPT_LIST } from '@/lib/types';
import type { UrgencyLevel, Feedback, HandleStatus, FeedbackCategory } from '@/lib/types';

interface StatsData {
  total: number;
  byCategory: Record<string, number>;
  byFactory: Record<string, number>;
  byUrgency: Record<string, number>;
  byResponsibleDept: Record<string, number>;
  byHandleStatus: Record<string, number>;
  handledCount: number;
  handleRate: number;
  avgScore: number;
  scoreCount: number;
  topIssues: { category: string; count: number; percentage: number; samples: string[] }[];
}

// 分类视图类型
type ViewType = 'category' | 'factory' | 'responsible' | 'status';

// 饼图数据项
interface PieDataItem {
  label: string;
  value: number;
  color: string;
  filterKey: string; // 用于筛选的 key
}

// 弹窗中显示的反馈项
interface ModalFeedbackItem {
  id: string;
  title: string;
  description: string;
  category: string;
  factory: string;
  urgency: string;
  responsibleDept: string;
  handleStatus: string;
  handler: string;
  result: string;
}

// 饼图组件 - 支持悬停放大和点击交互
function InteractivePieChart({
  data,
  size = 200,
  onSliceClick,
}: {
  data: PieDataItem[];
  size?: number;
  onSliceClick?: (item: PieDataItem) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-[#8A817A] text-sm">暂无数据</span>
      </div>
    );
  }

  const radius = size / 2 - 20; // 留出空间给悬停放大
  const centerX = size / 2;
  const centerY = size / 2;
  const hoverOffset = 8; // 悬停时向外偏移的距离

  // Calculate all slices
  const slicesData = data
    .filter(d => d.value > 0)
    .reduce<{ acc: number; items: { startAngle: number; endAngle: number; color: string; index: number }[] }>(
      (result, d, i) => {
        const sliceAngle = (d.value / total) * Math.PI * 2;
        const startAngle = result.acc;
        const endAngle = result.acc + sliceAngle;
        return {
          acc: endAngle,
          items: [...result.items, { startAngle, endAngle, color: d.color, index: i }],
        };
      },
      { acc: -Math.PI / 2, items: [] }
    );

  const slices = slicesData.items.map((item, i) => {
    const isHovered = hoveredIndex === i;
    const midAngle = (item.startAngle + item.endAngle) / 2;

    // 悬停时向外偏移
    const offsetX = isHovered ? Math.cos(midAngle) * hoverOffset : 0;
    const offsetY = isHovered ? Math.sin(midAngle) * hoverOffset : 0;

    const x1 = centerX + radius * Math.cos(item.startAngle);
    const y1 = centerY + radius * Math.sin(item.startAngle);
    const x2 = centerX + radius * Math.cos(item.endAngle);
    const y2 = centerY + radius * Math.sin(item.endAngle);
    const sliceAngle = item.endAngle - item.startAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const path = `M ${centerX + offsetX} ${centerY + offsetY} L ${x1 + offsetX} ${y1 + offsetY} A ${radius} ${radius} 0 ${largeArc} 1 ${x2 + offsetX} ${y2 + offsetY} Z`;

    // 计算标签位置
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(midAngle) + offsetX;
    const labelY = centerY + labelRadius * Math.sin(midAngle) + offsetY;
    const percentage = Math.round((data[i].value / total) * 100);

    return (
      <g
        key={i}
        onMouseEnter={() => setHoveredIndex(i)}
        onMouseLeave={() => setHoveredIndex(null)}
        onClick={() => onSliceClick?.(data[i])}
        className="cursor-pointer"
        style={{
          transform: isHovered ? `scale(1.05)` : 'scale(1)',
          transformOrigin: `${centerX}px ${centerY}px`,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path
          d={path}
          fill={item.color}
          stroke="#FAF8F5"
          strokeWidth="2"
          style={{
            filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none',
            transition: 'filter 0.3s ease',
          }}
        />
        {/* 在饼图上显示百分比（仅当扇区足够大时） */}
        {percentage >= 8 && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white text-xs font-semibold pointer-events-none"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {percentage}%
          </text>
        )}
      </g>
    );
  });

  // 悬停提示
  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;
  const tooltipX = centerX;
  const tooltipY = size - 10;

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
        {/* 中心圆 */}
        <circle cx={centerX} cy={centerY} r={radius * 0.35} fill="#FAF8F5" className="pointer-events-none" />
        <text x={centerX} y={centerY - 6} textAnchor="middle" className="fill-[#3D3632] text-lg font-semibold pointer-events-none">{total}</text>
        <text x={centerX} y={centerY + 10} textAnchor="middle" className="fill-[#8A817A] text-xs pointer-events-none">总计</text>
      </svg>
      {/* 悬停提示 */}
      {hoveredItem && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 bg-[#3D3632] text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-lg pointer-events-none z-10"
          style={{ animation: 'fadeIn 0.2s ease' }}
        >
          <span className="font-medium">{hoveredItem.label}</span>
          <span className="mx-1.5 text-[#A8A099]">|</span>
          <span>{hoveredItem.value} 条</span>
          <span className="ml-1 text-[#A8A099]">({Math.round((hoveredItem.value / total) * 100)}%)</span>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#3D3632] rotate-45" />
        </div>
      )}
    </div>
  );
}

// 图例组件 - 支持悬停高亮和点击
function InteractiveLegend({
  data,
  hoveredIndex,
  onHover,
  onClick,
}: {
  data: PieDataItem[];
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onClick: (item: PieDataItem) => void;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="space-y-1.5">
      {data.filter(d => d.value > 0).map((d, i) => {
        const isHovered = hoveredIndex === i;
        return (
          <div
            key={i}
            className={`flex items-center justify-between text-sm px-2 py-1 rounded-lg cursor-pointer transition-all ${
              isHovered ? 'bg-[#F5F2EE] scale-[1.02]' : 'hover:bg-[#F5F2EE]/50'
            }`}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(d)}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full transition-transform"
                style={{
                  backgroundColor: d.color,
                  transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                }}
              />
              <span className={`text-[#3D3632] ${isHovered ? 'font-medium' : ''}`}>{d.label}</span>
            </div>
            <div className="flex items-center gap-2 text-[#8A817A]">
              <span className={`font-medium ${isHovered ? 'text-[#3D3632]' : 'text-[#3D3632]'}`}>{d.value}</span>
              <span className="text-xs">({Math.round((d.value / total) * 100)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 详情弹窗组件
function DetailModal({
  isOpen,
  onClose,
  title,
  color,
  feedbacks,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  color: string;
  feedbacks: ModalFeedbackItem[];
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'resolved' | 'unresolved'>('all');

  // 重置 tab 当弹窗打开时
  useEffect(() => {
    if (isOpen) setActiveTab('all');
  }, [isOpen]);

  if (!isOpen) return null;

  const resolved = feedbacks.filter(f => f.handleStatus === 'resolved');
  const unresolved = feedbacks.filter(f => f.handleStatus === 'unresolved');

  const displayFeedbacks = activeTab === 'all' ? feedbacks : activeTab === 'resolved' ? resolved : unresolved;

  const urgencyLabel = (u: string) => {
    const opt = URGENCY_OPTIONS.find(o => o.value === u);
    return opt?.label || u;
  };

  const urgencyColor = (u: string) => {
    const opt = URGENCY_OPTIONS.find(o => o.value === u);
    return opt?.color || '#8A817A';
  };

  const categoryLabel = (c: string) => {
    const opt = CATEGORY_OPTIONS.find(o => o.value === c);
    return opt?.label || c;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease' }} />

      {/* 弹窗内容 */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-[#F0EDE8] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-lg font-semibold text-[#3D3632]">{title}</h2>
            <span className="text-sm text-[#8A817A]">共 {feedbacks.length} 条</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A817A] hover:bg-[#F5F2EE] hover:text-[#3D3632] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="px-6 pt-4 flex gap-2 flex-shrink-0">
          {([
            { key: 'all', label: '全部', count: feedbacks.length },
            { key: 'resolved', label: '已处理', count: resolved.length, color: '#7FB5B0' },
            { key: 'unresolved', label: '未处理', count: unresolved.length, color: '#E8917A' },
          ] as { key: 'all' | 'resolved' | 'unresolved'; label: string; count: number; color?: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-[#3D3632] text-white'
                  : 'bg-[#F5F2EE] text-[#8A817A] hover:bg-[#EBE7E1]'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-[#E8E4DE]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {displayFeedbacks.length === 0 ? (
            <div className="text-center py-12 text-[#8A817A]">
              <p className="text-lg mb-1">暂无数据</p>
              <p className="text-sm">该分类下没有相关反馈</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayFeedbacks.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#F0EDE8] p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: urgencyColor(item.urgency) + '15',
                            color: urgencyColor(item.urgency),
                          }}
                        >
                          {urgencyLabel(item.urgency)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5F2EE] text-[#8A817A]">
                          {categoryLabel(item.category)}
                        </span>
                        <span className="text-xs text-[#8A817A]">{item.factory}</span>
                      </div>
                      <h4 className="font-medium text-[#3D3632] text-sm">{item.title}</h4>
                      <p className="text-xs text-[#8A817A] mt-1 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {item.handleStatus === 'resolved' ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#7FB5B0]/10 text-[#7FB5B0] font-medium">
                          已处理
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#E8917A]/10 text-[#E8917A] font-medium">
                          未处理
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 处理信息 */}
                  {item.handleStatus === 'resolved' && item.result && (
                    <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-[#7FB5B0] font-medium flex-shrink-0">处理结果：</span>
                        <span className="text-xs text-[#8A817A] line-clamp-2">{item.result}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 带悬停联动的饼图+图例组合组件
function PieChartWithLegend({
  data,
  title,
  subtitle,
  onSliceClick,
}: {
  data: PieDataItem[];
  title: string;
  subtitle?: string;
  onSliceClick?: (item: PieDataItem) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 找到 hoveredIndex 对应的 data 项（考虑过滤后索引变化）
  const validData = data.filter(d => d.value > 0);

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#3D3632] mb-4">{title}</h2>
      <div className="flex items-center gap-6 mb-4">
        <InteractivePieChart data={data} size={180} onSliceClick={onSliceClick} />
        <div className="flex-1">
          {subtitle && <h3 className="text-sm font-medium text-[#3D3632] mb-3">{subtitle}</h3>}
          <InteractiveLegend data={data} hoveredIndex={hoveredIndex} onHover={setHoveredIndex} onClick={(item) => onSliceClick?.(item)} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [viewType, setViewType] = useState<ViewType>('category');
  const [allFeedbacks, setAllFeedbacks] = useState<ModalFeedbackItem[]>([]);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalColor, setModalColor] = useState('#D4A574');
  const [modalFeedbacks, setModalFeedbacks] = useState<ModalFeedbackItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, voicesRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/voices'),
      ]);
      const statsJson = await statsRes.json();
      const voicesJson = await voicesRes.json();

      if (statsJson.success) {
        setStats(statsJson.data);
      }

      if (voicesJson.success) {
        setAllFeedbacks(voicesJson.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis('');
    try {
      const res = await fetch('/api/analysis', { method: 'POST' });
      if (!res.ok) throw new Error('分析请求失败');
      if (!res.body) throw new Error('无法获取响应流');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) setAnalysis(prev => prev + parsed.content);
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      setAnalysis('分析请求失败，请稍后重试。');
    } finally {
      setAnalyzing(false);
    }
  };

  // 处理饼图点击
  const handlePieClick = useCallback(
    (item: PieDataItem, source: ViewType | 'urgency') => {
      let filtered: ModalFeedbackItem[] = [];

      switch (source) {
        case 'category':
          filtered = allFeedbacks.filter(f => f.category === item.filterKey);
          break;
        case 'factory':
          filtered = allFeedbacks.filter(f => f.factory === item.filterKey);
          break;
        case 'responsible':
          filtered = allFeedbacks.filter(f => f.responsibleDept === item.filterKey);
          break;
        case 'status':
          filtered = allFeedbacks.filter(f => f.handleStatus === item.filterKey);
          break;
        case 'urgency':
          filtered = allFeedbacks.filter(f => f.urgency === item.filterKey);
          break;
      }

      setModalTitle(item.label);
      setModalColor(item.color);
      setModalFeedbacks(filtered);
      setModalOpen(true);
    },
    [allFeedbacks]
  );

  // 根据视图类型生成饼图数据
  const getPieData = useCallback((): PieDataItem[] => {
    if (!stats) return [];
    switch (viewType) {
      case 'category':
        return CATEGORY_OPTIONS.map(opt => ({
          label: opt.label,
          value: stats.byCategory[opt.value] || 0,
          color: opt.color,
          filterKey: opt.value,
        }));
      case 'factory': {
        const factoryColors = ['#D4A574', '#E8917A', '#B8A9C9', '#7FB5B0', '#E5A889', '#A8A099'];
        return FACTORY_LIST.map((f, i) => ({
          label: f,
          value: stats.byFactory[f] || 0,
          color: factoryColors[i % factoryColors.length],
          filterKey: f,
        }));
      }
      case 'responsible': {
        const deptColors = ['#D4A574', '#E8917A', '#B8A9C9', '#7FB5B0', '#E5A889', '#9DB5A5', '#C97B6B'];
        return RESPONSIBLE_DEPT_LIST.map((d, i) => ({
          label: d,
          value: stats.byResponsibleDept[d] || 0,
          color: deptColors[i % deptColors.length],
          filterKey: d,
        }));
      }
      case 'status':
        return [
          { label: '已解决', value: stats.byHandleStatus.resolved || 0, color: '#7FB5B0', filterKey: 'resolved' },
          { label: '未解决', value: stats.byHandleStatus.unresolved || 0, color: '#E8917A', filterKey: 'unresolved' },
        ];
      default:
        return [];
    }
  }, [stats, viewType]);

  // 紧急程度数据
  const urgencyData = useMemo((): PieDataItem[] => {
    if (!stats) return [];
    return [
      { label: '紧急', value: stats.byUrgency.urgent || 0, color: '#DC2626', filterKey: 'urgent' },
      { label: '高优', value: stats.byUrgency.high || 0, color: '#EA580C', filterKey: 'high' },
      { label: '常规', value: stats.byUrgency.normal || 0, color: '#2563EB', filterKey: 'normal' },
    ];
  }, [stats]);

  const viewTitles: Record<ViewType, string> = {
    category: '按问题类别分类',
    factory: '按厂区/部门分类',
    responsible: '按责任部门分类',
    status: '按处理状态分类',
  };

  // 紧急程度分组数据
  const urgencyGroups = useMemo(() => {
    return {
      urgent: allFeedbacks.filter(f => f.urgency === 'urgent'),
      high: allFeedbacks.filter(f => f.urgency === 'high'),
      normal: allFeedbacks.filter(f => f.urgency === 'normal'),
    };
  }, [allFeedbacks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#8A817A]">加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#8A817A]">加载失败，请刷新页面</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#3D3632]">数据看板</h1>
          <p className="text-[#8A817A] mt-1">员工反馈数据可视化分析 - 点击饼图查看详情</p>
        </div>

        {/* 总览统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0EDE8]">
            <div className="text-[#8A817A] text-sm">总反馈数</div>
            <div className="text-3xl font-bold text-[#3D3632] mt-1">{stats.total}</div>
            <div className="text-xs text-[#8A817A] mt-1">条员工心声</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0EDE8]">
            <div className="text-[#8A817A] text-sm">已处理</div>
            <div className="text-3xl font-bold text-[#7FB5B0] mt-1">{stats.handledCount}</div>
            <div className="text-xs text-[#8A817A] mt-1">处理率 {stats.handleRate}%</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0EDE8]">
            <div className="text-[#8A817A] text-sm">待处理</div>
            <div className="text-3xl font-bold text-[#E8917A] mt-1">{stats.byHandleStatus.unresolved || 0}</div>
            <div className="text-xs text-[#8A817A] mt-1">需要跟进</div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0EDE8]">
            <div className="text-[#8A817A] text-sm">平均评分</div>
            <div className="text-3xl font-bold text-[#D4A574] mt-1">{stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '-'}</div>
            <div className="text-xs text-[#8A817A] mt-1">{stats.scoreCount > 0 ? `${stats.scoreCount} 条评价` : '暂无评价'}</div>
          </div>
        </div>

        {/* 分类分布 + 紧急程度 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 分类分布 - 支持切换 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#3D3632]">反馈分类分布</h2>
            </div>
            {/* 分类切换标签 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {([
                { key: 'category', label: '问题类别' },
                { key: 'factory', label: '厂区/部门' },
                { key: 'responsible', label: '责任部门' },
                { key: 'status', label: '处理状态' },
              ] as { key: ViewType; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewType(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                    viewType === tab.key
                      ? 'bg-[#D4A574] text-white shadow-sm'
                      : 'bg-[#F5F2EE] text-[#8A817A] hover:bg-[#EBE7E1]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <PieChartWithLegend
              data={getPieData()}
              title=""
              subtitle={viewTitles[viewType]}
              onSliceClick={(item) => handlePieClick(item, viewType)}
            />
          </div>

          {/* 紧急程度分布 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8]">
            <PieChartWithLegend
              data={urgencyData}
              title="紧急程度分布"
              subtitle="按紧急程度分类"
              onSliceClick={(item) => handlePieClick(item, 'urgency')}
            />
            {/* 紧急程度说明 */}
            <div className="border-t border-[#F0EDE8] pt-4 mt-4">
              <div className="space-y-2">
                {URGENCY_OPTIONS.map(opt => (
                  <div key={opt.value} className="flex items-start gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: opt.color }} />
                    <div>
                      <span className="font-medium text-[#3D3632]">{opt.label}</span>
                      <span className="text-[#8A817A] ml-1">- {opt.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 紧急程度排序列表 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8] mb-8">
          <h2 className="text-lg font-semibold text-[#3D3632] mb-4">紧急程度排序</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 紧急 */}
            <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-600" />
                <span className="font-semibold text-red-700">紧急</span>
                <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{urgencyGroups.urgent.length}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {urgencyGroups.urgent.length === 0 ? (
                  <p className="text-sm text-red-400">暂无紧急反馈</p>
                ) : (
                  urgencyGroups.urgent.slice(0, 5).map(item => (
                    <div key={item.id} className="bg-white rounded-lg p-2 text-xs border border-red-100">
                      <p className="font-medium text-[#3D3632] truncate">{item.title}</p>
                      <p className="text-[#8A817A] truncate mt-0.5">{item.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 高优 */}
            <div className="rounded-xl border-2 border-orange-200 bg-orange-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-orange-600" />
                <span className="font-semibold text-orange-700">高优</span>
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{urgencyGroups.high.length}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {urgencyGroups.high.length === 0 ? (
                  <p className="text-sm text-orange-400">暂无高优反馈</p>
                ) : (
                  urgencyGroups.high.slice(0, 5).map(item => (
                    <div key={item.id} className="bg-white rounded-lg p-2 text-xs border border-orange-100">
                      <p className="font-medium text-[#3D3632] truncate">{item.title}</p>
                      <p className="text-[#8A817A] truncate mt-0.5">{item.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 常规 */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="font-semibold text-blue-700">常规</span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{urgencyGroups.normal.length}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {urgencyGroups.normal.length === 0 ? (
                  <p className="text-sm text-blue-400">暂无常规反馈</p>
                ) : (
                  urgencyGroups.normal.slice(0, 5).map(item => (
                    <div key={item.id} className="bg-white rounded-lg p-2 text-xs border border-blue-100">
                      <p className="font-medium text-[#3D3632] truncate">{item.title}</p>
                      <p className="text-[#8A817A] truncate mt-0.5">{item.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 高频问题摘要 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8] mb-8">
          <h2 className="text-lg font-semibold text-[#3D3632] mb-4">高频问题摘要</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.topIssues.slice(0, 4).map((issue, i) => {
              const catInfo = CATEGORY_OPTIONS.find(c => c.value === issue.category);
              return (
                <div key={i} className="rounded-xl p-4 border border-[#F0EDE8] hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catInfo?.color || '#A8A099' }} />
                    <span className="text-sm font-medium text-[#3D3632]">{catInfo?.label || issue.category}</span>
                  </div>
                  <div className="text-2xl font-bold text-[#3D3632]">{issue.count}<span className="text-sm font-normal text-[#8A817A] ml-1">条</span></div>
                  <div className="text-xs text-[#8A817A] mt-1">占比 {issue.percentage}%</div>
                  {issue.samples.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
                      <p className="text-xs text-[#8A817A] line-clamp-2">&ldquo;{issue.samples[0]}&rdquo;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 责任部门工作量分布 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8] mb-8">
          <h2 className="text-lg font-semibold text-[#3D3632] mb-4">责任部门工作量</h2>
          <div className="space-y-3">
            {RESPONSIBLE_DEPT_LIST.map((dept, i) => {
              const count = stats.byResponsibleDept[dept] || 0;
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const colors = ['#D4A574', '#E8917A', '#B8A9C9', '#7FB5B0', '#E5A889', '#9DB5A5', '#C97B6B'];
              return (
                <div key={dept} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-[#3D3632] truncate">{dept}</div>
                  <div className="flex-1 h-6 bg-[#F5F2EE] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: colors[i % colors.length] }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm">
                    <span className="font-medium text-[#3D3632]">{count}</span>
                    <span className="text-[#8A817A] ml-1">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI 深度分析 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#3D3632]">AI 深度分析</h2>
            <button
              onClick={handleAnalysis}
              disabled={analyzing}
              className="px-4 py-2 bg-[#D4A574] text-white rounded-full text-sm font-medium hover:bg-[#C49564] disabled:opacity-50 transition-colors"
            >
              {analyzing ? '分析中...' : analysis ? '重新分析' : '生成分析'}
            </button>
          </div>

          {analysis ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-[#3D3632] leading-relaxed">{analysis}</div>
            </div>
          ) : (
            <div className="text-center py-8 text-[#8A817A]">
              <p>点击「生成分析」按钮，AI 将基于所有反馈数据生成深度分析报告</p>
              <p className="text-sm mt-2">包括：紧急程度判断、责任部门建议、处理建议、员工回复话术</p>
            </div>
          )}
        </div>

        {/* 数据洞察 */}
        <div className="mt-8 bg-gradient-to-r from-[#D4A574]/10 to-[#B8A9C9]/10 rounded-2xl p-6 border border-[#F0EDE8]">
          <h3 className="text-sm font-semibold text-[#3D3632] mb-2">数据洞察</h3>
          <p className="text-sm text-[#8A817A] leading-relaxed">
            当前共收到 <span className="font-medium text-[#3D3632]">{stats.total}</span> 条员工反馈，
            其中 <span className="font-medium text-[#E8917A]">{stats.byCategory.performance || 0}</span> 条涉及绩效问题（占比最高），
            <span className="font-medium text-[#D4A574]">{stats.byCategory.accommodation || 0}</span> 条涉及住宿问题。
            已处理 <span className="font-medium text-[#7FB5B0]">{stats.handledCount}</span> 条，处理率 {stats.handleRate}%。
            {stats.byUrgency.urgent > 0 && (
              <> 需要特别关注的是，有 <span className="font-medium text-red-600">{stats.byUrgency.urgent}</span> 条紧急反馈需要优先处理。</>
            )}
          </p>
        </div>
      </div>

      {/* 详情弹窗 */}
      <DetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        color={modalColor}
        feedbacks={modalFeedbacks}
      />
    </div>
  );
}
