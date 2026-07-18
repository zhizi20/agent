'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/header';
import { CATEGORY_MAP } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────

interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byDepartment?: Record<string, number>;
  byStatus?: Record<string, number>;
  weeklyTrend?: { week: string; count: number }[];
  totalLikes: number;
  anonymousCount: number;
  recentWeek: number;
}

interface AnalysisResult {
  summary: string;
  issues: {
    title: string;
    urgency: string;
    description: string;
    relatedCount: number;
    department: string;
    suggestions: string[];
  }[];
  riskAnalysis?: {
    high: string[];
    medium: string[];
    low: string[];
  };
  orgInsight?: {
    currentState: string;
    priorities: string[];
  };
  managementAdvice?: {
    shortTerm: string[];
    longTerm: string[];
  };
}

// ─── Constants ───────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  '智能总装一厂': '#2563EB',
  '智能总装二厂': '#7C3AED',
  '注塑厂': '#059669',
  '质量及运营中心': '#D97706',
  '供应链': '#EA580C',
  '其他部门': '#78716C',
};

const RISK_COLORS = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', label: '高风险' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: '中风险' },
  low: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: '低风险' },
};

// ─── Helper Components ───────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string; icon: string; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-stone-800">{value}</p>
          {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg", accent)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function WeeklyTrendChart({ data }: { data: { week: string; count: number }[] }) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    const maxCount = Math.max(...data.map(d => d.count));
    const w = 560;
    const h = 200;
    const padL = 40;
    const padR = 20;
    const padT = 20;
    const padB = 40;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    return data.map((d, i) => {
      const x = padL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
      const y = padT + plotH - (maxCount > 0 ? (d.count / maxCount) * plotH : 0);
      const isMax = d.count === maxCount && maxCount > 0;
      return { ...d, x, y, isMax, index: i };
    });
  }, [data]);

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-stone-400 text-sm">暂无趋势数据</div>;
  }

  const maxCount = Math.max(...data.map(d => d.count));
  const w = 560;
  const h = 200;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const plotH = h - padT - padB;

  // Build line path
  const linePath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x},${d.y}`).join(' ');
  // Build area path
  const areaPath = `${linePath} L${chartData[chartData.length - 1].x},${padT + plotH} L${chartData[0].x},${padT + plotH} Z`;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxCount / 2), maxCount];

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[400px]" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {yTicks.map((tick) => {
          const y = padT + plotH - (maxCount > 0 ? (tick / maxCount) * plotH : 0);
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="4 2" />
              <text x={padL - 6} y={y + 4} textAnchor="end" className="text-[10px] fill-stone-400">{tick}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill="url(#trendGradient)" opacity="0.3" />
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Line */}
        <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {chartData.map((d) => (
          <g key={d.week}>
            <circle
              cx={d.x} cy={d.y}
              r={d.isMax ? 6 : 3.5}
              fill={d.isMax ? '#DC2626' : '#f59e0b'}
              stroke="white"
              strokeWidth={d.isMax ? 2.5 : 1.5}
            />
            {d.isMax && (
              <text x={d.x} y={d.y - 12} textAnchor="middle" className="text-[10px] font-bold fill-red-600">
                {d.count}条
              </text>
            )}
          </g>
        ))}
        {/* X-axis labels */}
        {chartData.map((d) => (
          <text
            key={`label-${d.week}`}
            x={d.x}
            y={h - 8}
            textAnchor="middle"
            className="text-[9px] fill-stone-400"
          >
            {d.week.replace(/^\d+-/, '')}
          </text>
        ))}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-stone-500">周反馈量</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-xs text-stone-500">峰值（最高周）</span>
        </div>
      </div>
    </div>
  );
}

function StatusChart({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const resolved = byStatus.resolved || 0;
  const unresolved = byStatus.unresolved || 0;
  const resolvedPct = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0';
  const unresolvedPct = total > 0 ? ((unresolved / total) * 100).toFixed(1) : '0';

  // Donut chart
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const strokeW = 18;

  const resolvedAngle = total > 0 ? (resolved / total) * 360 : 0;
  const resolvedRad = (resolvedAngle * Math.PI) / 180;
  const largeArc = resolvedAngle > 180 ? 1 : 0;

  const resolvedX = cx + r * Math.sin(resolvedRad);
  const resolvedY = cy - r * Math.cos(resolvedRad);

  const resolvedPath = resolvedAngle >= 360
    ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`
    : `M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${resolvedX} ${resolvedY}`;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-32 h-32">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e7e5e4" strokeWidth={strokeW} />
        {/* Resolved arc */}
        {resolved > 0 && (
          <path d={resolvedPath} fill="none" stroke="#059669" strokeWidth={strokeW} strokeLinecap="round" />
        )}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold fill-stone-800">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="text-[9px] fill-stone-400">总计</text>
      </svg>
      <div className="flex gap-6 mt-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600" />
          <div>
            <p className="text-sm font-bold text-stone-800">{resolved} <span className="text-xs font-normal text-stone-400">({resolvedPct}%)</span></p>
            <p className="text-xs text-stone-500">已解决</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-stone-300" />
          <div>
            <p className="text-sm font-bold text-stone-800">{unresolved} <span className="text-xs font-normal text-stone-400">({unresolvedPct}%)</span></p>
            <p className="text-xs text-stone-500">未解决</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm font-bold flex items-center justify-center shadow-sm">
          {num}
        </span>
        <h2 className="text-xl font-bold text-stone-800">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-stone-500 mt-1 ml-11">{subtitle}</p>}
    </div>
  );
}

function CategoryBar({ label, count, total, color, icon }: {
  label: string; count: number; total: number; color: string; icon: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium text-stone-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-stone-800">{count}</span>
          <span className="text-xs text-stone-400">({pct.toFixed(1)}%)</span>
        </div>
      </div>
      <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out group-hover:opacity-80"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function CategoryPieChart({ byCategory }: { byCategory: Record<string, number> }) {
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  const slices = useMemo(() => {
    if (total === 0) return [];
    const entries = Object.entries(byCategory)
      .filter(([, c]) => c > 0)
      .sort(([, a], [, b]) => b - a);
    const cumulative = entries.map(([, count], i) => entries.slice(0, i).reduce((s, [, c]) => s + c, 0));
    return entries.map(([key, count], i) => {
      const catInfo = CATEGORY_MAP[key as VoiceCategory];
      return { key, count, start: cumulative[i], end: cumulative[i] + count, color: catInfo?.pieColor || '#999', label: catInfo?.label || key, icon: catInfo?.icon || '📌' };
    });
  }, [byCategory, total]);

  if (total === 0) return null;

  const radius = 80;
  const center = 100;

  function describeArc(startAngle: number, endAngle: number) {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">
        {slices.map((slice) => {
          const angle = (slice.count / total) * 360;
          if (angle >= 360) {
            return <circle key={slice.key} cx={center} cy={center} r={radius} fill={slice.color} />;
          }
          const startAngle = (slice.start / total) * 360;
          const endAngle = startAngle + angle;
          return <path key={slice.key} d={describeArc(startAngle, endAngle)} fill={slice.color} stroke="white" strokeWidth="1.5" />;
        })}
        <circle cx={center} cy={center} r="40" fill="white" />
        <text x={center} y={center - 6} textAnchor="middle" className="text-2xl font-bold" fill="#3D3632">{total}</text>
        <text x={center} y={center + 12} textAnchor="middle" className="text-[10px]" fill="#8A817A">总反馈</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
        {slices.map((slice) => (
          <div key={slice.key} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: slice.color }} />
            <span className="text-sm text-stone-600 truncate">{slice.icon} {slice.label}</span>
            <span className="text-sm font-semibold text-stone-800 ml-auto">{slice.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeptPieChart({ byDepartment }: { byDepartment: Record<string, number> }) {
  const total = Object.values(byDepartment).reduce((a, b) => a + b, 0);

  const slices = useMemo(() => {
    if (total === 0) return [];
    const entries = Object.entries(byDepartment).sort(([, a], [, b]) => b - a);
    const cumulative = entries.map(([, count], i) => entries.slice(0, i).reduce((s, [, c]) => s + c, 0));
    return entries.map(([dept, count], i) => {
      const start = (cumulative[i] / total) * 360;
      const end = ((cumulative[i] + count) / total) * 360;
      return { dept, count, start, end, color: DEPT_COLORS[dept] || '#999' };
    });
  }, [byDepartment, total]);

  if (total === 0) return null;

  const radius = 80;
  const center = 100;

  function describeArc(startAngle: number, endAngle: number) {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">
        {slices.map((slice) => {
          const angle = slice.end - slice.start;
          if (angle >= 360) {
            return <circle key={slice.dept} cx={center} cy={center} r={radius} fill={slice.color} />;
          }
          return <path key={slice.dept} d={describeArc(slice.start, slice.end)} fill={slice.color} stroke="white" strokeWidth="1.5" />;
        })}
        <circle cx={center} cy={center} r="40" fill="white" />
        <text x={center} y={center - 6} textAnchor="middle" className="text-2xl font-bold" fill="#3D3632">{total}</text>
        <text x={center} y={center + 12} textAnchor="middle" className="text-[10px]" fill="#8A817A">总反馈</text>
      </svg>
      <div className="flex-1 space-y-2">
        {slices.map((slice) => {
          const pct = ((slice.count / total) * 100).toFixed(1);
          return (
            <div key={slice.dept} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-sm text-stone-700 flex-1">{slice.dept}</span>
              <span className="text-sm font-bold text-stone-800">{slice.count}</span>
              <span className="text-xs text-stone-400 w-14 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [isLive, setIsLive] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(fetchStats, 3000);
    return () => clearInterval(id);
  }, [isLive, fetchStats]);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysis(null);
    try {
      const res = await fetch('/api/analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!res.ok || !res.body) throw new Error('分析请求失败');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) accumulated += parsed.content;
          } catch { /* skip */ }
        }
      }
      const jsonMatch = accumulated.match(/```json\s*([\s\S]*?)```/);
      const target = jsonMatch ? jsonMatch[1].trim() : accumulated.trim();
      const result = JSON.parse(target) as AnalysisResult;
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const topCategories = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byCategory).sort(([, a], [, b]) => b - a).slice(0, 3);
  }, [stats]);

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <Header />
        <div className="pt-20 flex items-center justify-center h-64">
          <div className="animate-pulse text-stone-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <Header />
      <main className="pt-20 pb-16">
        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-b border-amber-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-stone-800">组织运营数据分析中心</h1>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-stone-400")} />
                    <span className={cn("text-xs font-medium", isLive ? "text-emerald-700" : "text-stone-500")}>
                      {isLive ? '实时' : '已暂停'}
                    </span>
                  </div>
                </div>
                <p className="text-stone-500 text-sm">基于 {stats.total} 条员工反馈数据，为 HR 与管理层提供数据洞察与决策支持</p>
              </div>
              <button
                onClick={() => setIsLive(!isLive)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  isLive ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                )}
              >
                {isLive ? '暂停刷新' : '恢复刷新'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 mt-8">
          {/* ═══ Section 1: 整体概览 ═══ */}
          <section>
            <SectionTitle num="1" title="整体概览" subtitle="反馈总量、新增趋势与参与情况" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="总反馈量" value={stats.total} sub="累计收集" icon="📊" accent="bg-blue-50 text-blue-600" />
              <StatCard label="本周新增" value={stats.recentWeek} sub="近7天" icon="📈" accent="bg-emerald-50 text-emerald-600" />
              <StatCard label="匿名反馈" value={stats.anonymousCount} sub={`${((stats.anonymousCount / stats.total) * 100).toFixed(0)}% 匿名率`} icon="🔒" accent="bg-violet-50 text-violet-600" />
              <StatCard label="共鸣次数" value={stats.totalLikes} sub="点赞总计" icon="💬" accent="bg-amber-50 text-amber-600" />
            </div>
            {/* 反馈活跃趋势 + 问题处理状态 */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* 折线图：反馈活跃趋势 */}
              <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-stone-200/60 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-700 mb-1">反馈活跃趋势</h3>
                <p className="text-xs text-stone-400 mb-4">按周统计反馈数量，判断员工反馈意愿与集中爆发点</p>
                <WeeklyTrendChart data={stats.weeklyTrend || []} />
              </div>
              {/* 问题处理状态分布 */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-stone-200/60 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-700 mb-1">问题处理状态</h3>
                <p className="text-xs text-stone-400 mb-4">已解决与未解决问题占比</p>
                <StatusChart byStatus={stats.byStatus || {}} total={stats.total} />
              </div>
            </div>
          </section>

          {/* ═══ Section 2: 反馈分类分析 ═══ */}
          <section>
            <SectionTitle num="2" title="反馈分类分析" subtitle="各类别反馈数量统计与占比分布" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">分类占比</h3>
                <CategoryPieChart byCategory={stats.byCategory} />
              </div>
              <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-700 mb-4">分类统计</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const info = CATEGORY_MAP[cat as VoiceCategory];
                      return (
                        <CategoryBar
                          key={cat}
                          label={info?.label || cat}
                          count={count}
                          total={stats.total}
                          color={info?.pieColor || '#999'}
                          icon={info?.icon || '📌'}
                        />
                      );
                    })}
                </div>
              </div>
            </div>
            {/* TOP 3 反馈类别 */}
            <div className="mt-4 bg-white rounded-2xl p-5 border border-stone-200/60 shadow-sm">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">TOP 3 反馈类别</h3>
              <div className="flex flex-wrap gap-3">
                {topCategories.map(([cat, count], i) => {
                  const info = CATEGORY_MAP[cat as VoiceCategory];
                  return (
                    <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-base">{info?.icon}</span>
                      <span className="text-sm font-medium text-stone-700">{info?.label || cat}</span>
                      <span className="text-sm font-bold text-stone-800">{count}</span>
                      <span className="text-xs text-stone-400">({((count / stats.total) * 100).toFixed(1)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ═══ Section 3: 高频问题洞察 ═══ */}
          <section>
            <SectionTitle num="3" title="高频问题洞察" subtitle="热点问题、趋势变化与潜在风险" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 卡片1: 关注热点 */}
              {(() => {
                const topCat = topCategories[0];
                if (!topCat) return null;
                const [cat, count] = topCat;
                const info = CATEGORY_MAP[cat as VoiceCategory];
                const pct = ((count / stats.total) * 100).toFixed(1);
                return (
                  <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50 to-transparent rounded-bl-full" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🔥</span>
                        <h3 className="text-sm font-bold text-stone-800">当前热点问题</h3>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{info?.icon}</span>
                          <span className="text-lg font-bold text-stone-800">{info?.label || cat}</span>
                        </div>
                        <p className="text-sm text-stone-500">反馈持续较高，为员工最关注议题</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-stone-50 rounded-xl p-3">
                          <p className="text-xs text-stone-400 mb-1">占比</p>
                          <p className="text-xl font-bold" style={{ color: info?.pieColor }}>{pct}%</p>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-3">
                          <p className="text-xs text-stone-400 mb-1">涉及</p>
                          <p className="text-xl font-bold text-stone-800">{count}<span className="text-sm font-normal text-stone-400 ml-1">条反馈</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 卡片2: 问题趋势 */}
              {(() => {
                // Calculate trend: compare recent week vs previous week
                const trend = stats.weeklyTrend || [];
                const currentWeek = trend[trend.length - 1]?.count || 0;
                const prevWeek = trend[trend.length - 2]?.count || 0;
                const change = prevWeek > 0 ? ((currentWeek - prevWeek) / prevWeek * 100) : 0;
                const isUp = change > 0;
                // Find second highest category as trending issue
                const secondCat = topCategories[1];
                const secondInfo = secondCat ? CATEGORY_MAP[secondCat[0] as VoiceCategory] : null;
                const focusAreas: Record<string, string> = {
                  performance: '评分标准、目标设定',
                  housing: '宿舍环境、设施维护',
                  attendance: '打卡异常、工时核算',
                  management: '沟通方式、流程透明',
                  salary: '调薪机制、奖金分配',
                  dining: '菜品质量、就餐环境',
                  rough_management: '管理态度、尊重员工',
                  other: '综合建议',
                };
                return (
                  <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">{isUp ? '📈' : '📉'}</span>
                        <h3 className="text-sm font-bold text-stone-800">{isUp ? '上升问题' : '下降问题'}</h3>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{secondInfo?.icon}</span>
                          <span className="text-lg font-bold text-stone-800">{secondInfo?.label || '—'}</span>
                        </div>
                        <p className="text-sm text-stone-500">较上周期反馈量{isUp ? '增加' : '减少'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={cn("rounded-xl p-3", isUp ? "bg-red-50" : "bg-green-50")}>
                          <p className="text-xs text-stone-400 mb-1">较上周期</p>
                          <p className={cn("text-xl font-bold", isUp ? "text-red-500" : "text-green-500")}>
                            {isUp ? '+' : ''}{change.toFixed(0)}%
                          </p>
                        </div>
                        <div className="bg-stone-50 rounded-xl p-3">
                          <p className="text-xs text-stone-400 mb-1">建议关注</p>
                          <p className="text-sm font-medium text-stone-700 leading-tight mt-1">
                            {secondCat ? (focusAreas[secondCat[0]] || '综合反馈') : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 卡片3: 潜在风险 */}
              {(() => {
                // Risk: rough_management is highest risk, also check unresolved rate
                const unresolvedRate = stats.byStatus?.unresolved ? ((stats.byStatus.unresolved / stats.total) * 100).toFixed(1) : '0';
                const roughCount = stats.byCategory.rough_management || 0;
                const mgmtCount = stats.byCategory.management || 0;
                const riskItems = [
                  { label: '粗暴管理', count: roughCount, level: 'high' as const },
                  { label: '管理问题', count: mgmtCount, level: 'medium' as const },
                  { label: '未解决问题', count: stats.byStatus?.unresolved || 0, level: 'medium' as const },
                ].filter(item => item.count > 0);
                return (
                  <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">⚠️</span>
                        <h3 className="text-sm font-bold text-stone-800">潜在风险</h3>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm text-stone-500">
                          未解决问题占比 <span className="font-bold text-red-500">{unresolvedRate}%</span>，需重点关注
                        </p>
                      </div>
                      <div className="space-y-2.5">
                        {riskItems.map((item) => {
                          const colors = item.level === 'high'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100';
                          return (
                            <div key={item.label} className={cn("flex items-center justify-between px-3 py-2 rounded-lg border", colors)}>
                              <span className="text-sm font-medium">{item.label}</span>
                              <span className="text-sm font-bold">{item.count} 条</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* ═══ Section 4: 风险等级分析 ═══ */}
          <section>
            <SectionTitle num="4" title="风险等级分析" subtitle="基于反馈内容、频次和影响范围的风险评估" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {analysis?.riskAnalysis ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['high', 'medium', 'low'] as const).map((level) => {
                    const items = analysis.riskAnalysis?.[level] || [];
                    const style = RISK_COLORS[level];
                    return (
                      <div key={level} className={cn("rounded-xl p-4 border", style.bg, style.border)}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn("w-2.5 h-2.5 rounded-full", style.dot)} />
                          <span className={cn("text-sm font-bold", style.text)}>{style.label}</span>
                          <span className={cn("text-xs px-1.5 py-0.5 rounded-full", style.bg, style.text)}>
                            {items.length} 项
                          </span>
                        </div>
                        <div className="space-y-2">
                          {items.map((item, i) => (
                            <div key={i} className="text-sm text-stone-700 flex items-start gap-2">
                              <span className={cn("text-xs mt-0.5", style.text)}>●</span>
                              {item}
                            </div>
                          ))}
                          {items.length === 0 && <p className="text-sm text-stone-400">暂无</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-stone-400 text-sm mb-4">通过 AI 分析反馈数据，识别潜在风险</p>
                  <button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? '分析中...' : analysisError ? '重试分析' : '启动 AI 风险分析'}
                  </button>
                  {analysisError && <p className="text-red-500 text-xs mt-2">{analysisError}</p>}
                </div>
              )}
            </div>
          </section>

          {/* ═══ Section 5: 责任部门分析 ═══ */}
          <section>
            <SectionTitle num="5" title="责任部门分析" subtitle="各部门反馈分布与占比" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {stats.byDepartment && Object.keys(stats.byDepartment).length > 0 ? (
                <DeptPieChart byDepartment={stats.byDepartment} />
              ) : (
                <p className="text-center text-stone-400 py-8">暂无部门数据</p>
              )}
            </div>
          </section>

          {/* ═══ Section 6: AI 组织洞察 ═══ */}
          <section>
            <SectionTitle num="6" title="AI 组织洞察" subtitle="基于全部反馈数据的组织状态评估与改善方向" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {analysis ? (
                <div className="space-y-6">
                  {/* Overall Summary */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                    <h3 className="text-sm font-bold text-amber-800 mb-2">📋 整体态势</h3>
                    <p className="text-sm text-stone-700 leading-relaxed">{analysis.summary}</p>
                  </div>
                  {/* Org Insight */}
                  {analysis.orgInsight && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <h3 className="text-sm font-bold text-blue-800 mb-2">🏢 当前组织状态</h3>
                        <p className="text-sm text-stone-700 leading-relaxed">{analysis.orgInsight.currentState}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
                        <h3 className="text-sm font-bold text-violet-800 mb-2">🎯 优先改善方向</h3>
                        <div className="space-y-2">
                          {analysis.orgInsight.priorities.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-stone-700">
                              <span className="text-violet-500 mt-0.5">▸</span>
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* High-frequency issues */}
                  {analysis.issues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-stone-700 mb-3">🔥 高频问题详情</h3>
                      <div className="space-y-3">
                        {analysis.issues.map((issue, i) => {
                          const urgencyColor = issue.urgency === '高' ? 'bg-red-100 text-red-700' : issue.urgency === '中' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                          return (
                            <div key={i} className="p-4 rounded-xl border border-stone-100 bg-stone-50/50">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-stone-800">{issue.title}</span>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", urgencyColor)}>
                                  {issue.urgency}紧急
                                </span>
                                <span className="text-xs text-stone-400 ml-auto">{issue.relatedCount} 条相关</span>
                              </div>
                              <p className="text-sm text-stone-600 mb-2">{issue.description}</p>
                              <div className="flex items-center gap-2 text-xs text-stone-500">
                                <span>📍 责任部门：{issue.department}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-stone-400 text-sm mb-4">AI 将综合分析所有反馈数据，生成组织洞察报告</p>
                  <button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? '正在分析...' : analysisError ? '重试分析' : '生成 AI 组织洞察'}
                  </button>
                  {analysisError && <p className="text-red-500 text-xs mt-2">{analysisError}</p>}
                </div>
              )}
            </div>
          </section>

          {/* ═══ Section 7: 管理优化建议 ═══ */}
          <section>
            <SectionTitle num="7" title="管理优化建议" subtitle="短期措施与长期建设方向" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {analysis?.managementAdvice ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center text-xs">⚡</span>
                      短期措施（1-4 周）
                    </h3>
                    <div className="space-y-2">
                      {analysis.managementAdvice.shortTerm.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-stone-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">🏗️</span>
                      长期建设（1-6 个月）
                    </h3>
                    <div className="space-y-2">
                      {analysis.managementAdvice.longTerm.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-stone-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-stone-400 text-sm">
                    {analysis ? '管理建议已包含在 AI 组织洞察中' : '请先在上方生成 AI 组织洞察'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
