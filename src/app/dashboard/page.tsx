'use client';

import { useEffect, useState, useCallback } from 'react';
import { CATEGORY_OPTIONS, URGENCY_OPTIONS, FACTORY_LIST, RESPONSIBLE_DEPT_LIST } from '@/lib/types';
import type { UrgencyLevel } from '@/lib/types';

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

interface UrgencyItem {
  id: string;
  title: string;
  description: string;
  category: string;
  factory: string;
  urgency: UrgencyLevel;
  department: string;
}

// 分类视图类型
type ViewType = 'category' | 'factory' | 'responsible' | 'status';

// 饼图组件
function PieChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="flex items-center justify-center" style={{ width: size, height: size }}><span className="text-[#8A817A] text-sm">暂无数据</span></div>;
  
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;

  // Calculate all slices using reduce to accumulate angles
  const slicesData = data.filter(d => d.value > 0).reduce<{ acc: number; items: { startAngle: number; endAngle: number; color: string }[] }>(
    (result, d) => {
      const sliceAngle = (d.value / total) * Math.PI * 2;
      const startAngle = result.acc;
      const endAngle = result.acc + sliceAngle;
      return {
        acc: endAngle,
        items: [...result.items, { startAngle, endAngle, color: d.color }],
      };
    },
    { acc: -Math.PI / 2, items: [] }
  );

  const slices = slicesData.items.map((item, i) => {
    const x1 = centerX + radius * Math.cos(item.startAngle);
    const y1 = centerY + radius * Math.sin(item.startAngle);
    const x2 = centerX + radius * Math.cos(item.endAngle);
    const y2 = centerY + radius * Math.sin(item.endAngle);
    const sliceAngle = item.endAngle - item.startAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return (
      <path
        key={i}
        d={path}
        fill={item.color}
        stroke="#FAF8F5"
        strokeWidth="2"
        className="transition-all duration-300 hover:opacity-80"
      />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices}
      <circle cx={centerX} cy={centerY} r={radius * 0.4} fill="#FAF8F5" />
      <text x={centerX} y={centerY - 8} textAnchor="middle" className="fill-[#3D3632] text-lg font-semibold">{total}</text>
      <text x={centerX} y={centerY + 12} textAnchor="middle" className="fill-[#8A817A] text-xs">总计</text>
    </svg>
  );
}

// 图例组件
function Legend({ data }: { data: { label: string; value: number; color: string; percentage?: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="space-y-2">
      {data.filter(d => d.value > 0).map((d, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[#3D3632]">{d.label}</span>
          </div>
          <div className="flex items-center gap-2 text-[#8A817A]">
            <span className="font-medium text-[#3D3632]">{d.value}</span>
            <span className="text-xs">({d.percentage ?? Math.round((d.value / total) * 100)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [viewType, setViewType] = useState<ViewType>('category');
  const [urgencyFeedbacks, setUrgencyFeedbacks] = useState<{ urgent: UrgencyItem[]; high: UrgencyItem[]; normal: UrgencyItem[] }>({ urgent: [], high: [], normal: [] });

  const fetchStats = useCallback(async () => {
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
        const voices = voicesJson.data as UrgencyItem[];
        setUrgencyFeedbacks({
          urgent: voices.filter(v => v.urgency === 'urgent'),
          high: voices.filter(v => v.urgency === 'high'),
          normal: voices.filter(v => v.urgency === 'normal'),
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  // 根据视图类型生成饼图数据
  const getPieData = () => {
    switch (viewType) {
      case 'category':
        return CATEGORY_OPTIONS.map(opt => ({
          label: opt.label,
          value: stats.byCategory[opt.value] || 0,
          color: opt.color,
        }));
      case 'factory':
        const factoryColors = ['#D4A574', '#E8917A', '#B8A9C9', '#7FB5B0', '#E5A889', '#A8A099'];
        return FACTORY_LIST.map((f, i) => ({
          label: f,
          value: stats.byFactory[f] || 0,
          color: factoryColors[i % factoryColors.length],
        }));
      case 'responsible':
        const deptColors = ['#D4A574', '#E8917A', '#B8A9C9', '#7FB5B0', '#E5A889', '#9DB5A5', '#C97B6B'];
        return RESPONSIBLE_DEPT_LIST.map((d, i) => ({
          label: d,
          value: stats.byResponsibleDept[d] || 0,
          color: deptColors[i % deptColors.length],
        }));
      case 'status':
        return [
          { label: '已解决', value: stats.byHandleStatus.resolved || 0, color: '#7FB5B0' },
          { label: '未解决', value: stats.byHandleStatus.unresolved || 0, color: '#E8917A' },
        ];
      default:
        return [];
    }
  };

  // 紧急程度数据
  const urgencyData = [
    { label: '紧急', value: stats.byUrgency.urgent || 0, color: '#DC2626' },
    { label: '高优', value: stats.byUrgency.high || 0, color: '#EA580C' },
    { label: '常规', value: stats.byUrgency.normal || 0, color: '#2563EB' },
  ];

  const viewTitles: Record<ViewType, string> = {
    category: '按问题类别分类',
    factory: '按厂区/部门分类',
    responsible: '按责任部门分类',
    status: '按处理状态分类',
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#3D3632]">数据看板</h1>
          <p className="text-[#8A817A] mt-1">员工反馈数据可视化分析</p>
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
            <div className="flex items-center gap-6">
              <PieChart data={getPieData()} size={180} />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#3D3632] mb-3">{viewTitles[viewType]}</h3>
                <Legend data={getPieData()} />
              </div>
            </div>
          </div>

          {/* 紧急程度分布 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8]">
            <h2 className="text-lg font-semibold text-[#3D3632] mb-4">紧急程度分布</h2>
            <div className="flex items-center gap-6 mb-6">
              <PieChart data={urgencyData} size={180} />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-[#3D3632] mb-3">按紧急程度分类</h3>
                <Legend data={urgencyData} />
              </div>
            </div>
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
                <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{urgencyFeedbacks.urgent.length}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {urgencyFeedbacks.urgent.length === 0 ? (
                  <p className="text-sm text-red-400">暂无紧急反馈</p>
                ) : (
                  urgencyFeedbacks.urgent.slice(0, 5).map(item => (
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
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{urgencyFeedbacks.high.length}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {urgencyFeedbacks.high.length === 0 ? (
                  <p className="text-sm text-orange-400">暂无高优反馈</p>
                ) : (
                  urgencyFeedbacks.high.slice(0, 5).map(item => (
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
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{urgencyFeedbacks.normal.length}</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {urgencyFeedbacks.normal.length === 0 ? (
                  <p className="text-sm text-blue-400">暂无常规反馈</p>
                ) : (
                  urgencyFeedbacks.normal.slice(0, 5).map(item => (
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
    </div>
  );
}
