'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { CATEGORY_MAP, CATEGORY_KEYS } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';
import InteractivePieChart from '@/components/interactive-pie-chart';
import { cn } from '@/lib/utils';
import { useRole } from '@/contexts/role-context';
import { RoleVerificationDialog } from '@/components/role-verification-dialog';
import { BatchInput } from '@/components/batch-input';

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
  '未分配': '#A8A29E',
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

  const [activeStatus, setActiveStatus] = useState<'resolved' | 'unresolved' | null>(null);
  const [statusVoices, setStatusVoices] = useState<Array<{ id: string; content: string; category: string; department?: string; author: string; status: string; createdAt: string }>>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusPage, setStatusPage] = useState(0);
  const statusPerPage = 10;

  const handleStatusClick = useCallback((status: 'resolved' | 'unresolved') => {
    setActiveStatus((prev) => (prev === status ? null : status));
    setStatusPage(0);
    setStatusLoading(true);
    fetch('/api/voices')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setStatusVoices(res.data.filter((v: { status: string; isSensitive?: boolean; isViolation?: boolean }) => v.status === status && !v.isSensitive && !v.isViolation));
        }
      })
      .finally(() => setStatusLoading(false));
  }, []);

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

  const statusTotalPages = Math.ceil(statusVoices.length / statusPerPage);
  const paginatedStatusVoices = statusVoices.slice(statusPage * statusPerPage, (statusPage + 1) * statusPerPage);

  return (
    <div>
      <div className="flex flex-col items-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-32 h-32">
          {/* Background ring - clickable for unresolved */}
          <circle
            cx={cx} cy={cy} r={r} fill="none" stroke={activeStatus === 'unresolved' ? '#f59e0b' : '#e7e5e4'}
            strokeWidth={strokeW} className="cursor-pointer" onClick={() => handleStatusClick('unresolved')}
          />
          {/* Resolved arc - clickable */}
          {resolved > 0 && (
            <path
              d={resolvedPath} fill="none" stroke={activeStatus === 'resolved' ? '#10b981' : '#059669'}
              strokeWidth={strokeW} strokeLinecap="round" className="cursor-pointer"
              onClick={() => handleStatusClick('resolved')}
            />
          )}
          {/* Center text */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="text-lg font-bold fill-stone-800">{total}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="text-[9px] fill-stone-400">总计</text>
        </svg>
        <div className="flex gap-6 mt-3">
          <button
            onClick={() => handleStatusClick('resolved')}
            className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${activeStatus === 'resolved' ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-stone-50'}`}
          >
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <div className="text-left">
              <p className="text-sm font-bold text-stone-800">{resolved} <span className="text-xs font-normal text-stone-400">({resolvedPct}%)</span></p>
              <p className="text-xs text-stone-500">已解决</p>
            </div>
          </button>
          <button
            onClick={() => handleStatusClick('unresolved')}
            className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${activeStatus === 'unresolved' ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-stone-50'}`}
          >
            <span className="w-3 h-3 rounded-full bg-stone-300" />
            <div className="text-left">
              <p className="text-sm font-bold text-stone-800">{unresolved} <span className="text-xs font-normal text-stone-400">({unresolvedPct}%)</span></p>
              <p className="text-xs text-stone-500">未解决</p>
            </div>
          </button>
        </div>
        {!activeStatus && (
          <p className="text-xs text-stone-400 text-center mt-2">点击查看详细反馈内容</p>
        )}
      </div>

      {/* Status detail panel */}
      {activeStatus && (
        <div className="mt-4 bg-white rounded-xl border border-stone-200 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-stone-800">
              {activeStatus === 'resolved' ? '✅ 已解决' : '⏳ 未解决'} 反馈列表
              <span className="text-sm text-stone-500 ml-2">({statusVoices.length} 条)</span>
            </h4>
            <button onClick={() => setActiveStatus(null)} className="text-stone-400 hover:text-stone-600 p-1 rounded-md hover:bg-stone-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {statusLoading ? (
            <div className="text-center py-8 text-stone-400 text-sm">加载中...</div>
          ) : statusVoices.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">暂无反馈内容</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {paginatedStatusVoices.map((v) => (
                <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${v.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 line-clamp-2">{v.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {v.author && <span className="text-xs text-stone-400">{v.author}</span>}
                      <span className="text-xs text-stone-300">{new Date(v.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {statusTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-stone-100">
              <button onClick={() => setStatusPage((p) => Math.max(0, p - 1))} disabled={statusPage === 0} className="text-xs px-3 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 transition-colors">上一页</button>
              <span className="text-xs text-stone-500">{statusPage + 1} / {statusTotalPages}</span>
              <button onClick={() => setStatusPage((p) => Math.min(statusTotalPages - 1, p + 1))} disabled={statusPage >= statusTotalPages - 1} className="text-xs px-3 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 transition-colors">下一页</button>
            </div>
          )}
        </div>
      )}
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

// ─── Main Page ───────────────────────────────────────────────────

export default function DashboardPage() {
  const { role, isVerified, setRole } = useRole();
  const [showVerification, setShowVerification] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [urgencyAnalysis, setUrgencyAnalysis] = useState<AnalysisResult | null>(null);
  const [insightAnalysis, setInsightAnalysis] = useState<AnalysisResult | null>(null);
  const [isUrgencyAnalyzing, setIsUrgencyAnalyzing] = useState(false);
  const [isInsightAnalyzing, setIsInsightAnalyzing] = useState(false);
  const [urgencyError, setUrgencyError] = useState('');
  const [insightError, setInsightError] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [showBatchInput, setShowBatchInput] = useState(false);

  // Show verification dialog if not verified
  useEffect(() => {
    if (!isVerified) {
      setShowVerification(true);
    }
  }, [isVerified]);

  // All hooks must be before any early returns
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

  const runUrgencyAnalysis = useCallback(async () => {
    setIsUrgencyAnalyzing(true);
    setUrgencyError('');
    setUrgencyAnalysis(null);
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
      setUrgencyAnalysis(result);
    } catch (err) {
      setUrgencyError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsUrgencyAnalyzing(false);
    }
  }, []);

  const runInsightAnalysis = useCallback(async () => {
    setIsInsightAnalyzing(true);
    setInsightError('');
    setInsightAnalysis(null);
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
      setInsightAnalysis(result);
    } catch (err) {
      setInsightError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsInsightAnalyzing(false);
    }
  }, []);

  const topCategories = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byCategory).sort(([, a], [, b]) => b - a).slice(0, 3);
  }, [stats]);

  // Role-based access control - after all hooks
  if (isVerified && role === 'employee') {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#EDE8E3] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFF5F2] flex items-center justify-center">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-xl font-semibold text-[#3D3632] mb-3">权限受限</h2>
            <p className="text-[#8A817A] leading-relaxed mb-6">
              您好，数据看板为管理层专属权限，仅管理人员可查看全量心声统计与分析内容。您可以使用员工心声墙提交、浏览公开心声。
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#D4A574] text-white font-medium hover:bg-[#C99560] transition-colors"
            >
              返回心声墙
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="pt-20 flex items-center justify-center h-64">
          <div className="animate-pulse text-stone-400">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
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
              <button
                onClick={() => setShowBatchInput(true)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:shadow-md transition-all"
              >
                批量导入
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 mt-8">
          {/* ═══ Section 1: 整体概览 ═══ */}
          <section>
            <SectionTitle num="1" title="整体概览" subtitle="反馈总量、新增趋势与参与情况" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="总反馈量" value={stats.total} sub="累计收集" icon="📊" accent="bg-blue-50 text-blue-600" />
              <StatCard label="本周新增" value={stats.recentWeek} sub="近7天" icon="📈" accent="bg-emerald-50 text-emerald-600" />
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
                <InteractivePieChart
                  slices={CATEGORY_KEYS.filter((k) => (stats.byCategory[k] || 0) > 0).sort((a, b) => (stats.byCategory[b] || 0) - (stats.byCategory[a] || 0)).map((key) => {
                    const catInfo = CATEGORY_MAP[key as VoiceCategory];
                    return { key, label: catInfo?.label || key, count: stats.byCategory[key] || 0, color: catInfo?.pieColor || '#999', icon: catInfo?.icon };
                  })}
                  total={Object.values(stats.byCategory).reduce((a, b) => a + b, 0)}
                  title="分类占比"
                  filterType="category"
                />
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

          {/* ═══ Section 4: 紧急程度排序 ═══ */}
          <section>
            <SectionTitle num="4" title="紧急程度排序" subtitle="基于反馈分类和影响范围的紧急程度判断与责任部门映射" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {urgencyAnalysis ? (
                <div className="space-y-4">
                  {/* Urgency Legend */}
                  <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-xs text-stone-500">紧急程度判断规则：</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">高：涉及安全、大面积影响工作</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">中：影响效率但有临时替代方案</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">低：体验优化类、长期改进类</span>
                  </div>
                  {/* Issues sorted by urgency */}
                  {(() => {
                    // Sort issues by urgency (高 > 中 > 低)
                    const urgencyOrder = { '高': 0, '中': 1, '低': 2 };
                    const sortedIssues = [...urgencyAnalysis.issues].sort((a, b) => 
                      (urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 3) - (urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 3)
                    );
                    return sortedIssues.map((issue, i) => {
                      const urgencyColor = issue.urgency === '高' ? 'bg-red-100 text-red-700 border-red-200' : issue.urgency === '中' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                      const urgencyIcon = issue.urgency === '高' ? '🔴' : issue.urgency === '中' ? '🟡' : '🟢';
                      return (
                        <div key={i} className="p-4 rounded-xl border border-stone-100 bg-gradient-to-r from-stone-50/80 to-white hover:shadow-sm transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{urgencyIcon}</span>
                            <span className="font-semibold text-stone-800">{issue.title}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", urgencyColor)}>
                              {issue.urgency}紧急
                            </span>
                            <span className="text-xs text-stone-400 ml-auto">{issue.relatedCount} 条相关</span>
                          </div>
                          <p className="text-sm text-stone-600 mb-3 pl-7">{issue.description}</p>
                          <div className="flex flex-wrap items-center gap-3 pl-7 text-xs">
                            <span className="flex items-center gap-1 text-stone-500">
                              <span className="w-4 h-4 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">📍</span>
                              责任部门：<span className="font-medium text-stone-700">{issue.department}</span>
                            </span>
                            {issue.suggestions && issue.suggestions.length > 0 && (
                              <span className="flex items-center gap-1 text-stone-500">
                                <span className="w-4 h-4 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]">💡</span>
                                处理建议：<span className="text-stone-600">{issue.suggestions[0]}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {urgencyAnalysis.issues.length === 0 && (
                    <p className="text-center text-stone-400 py-4">暂无问题数据</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-stone-400 text-sm mb-4">通过 AI 分析反馈数据，按紧急程度排序并匹配责任部门</p>
                  <button
                    onClick={runUrgencyAnalysis}
                    disabled={isUrgencyAnalyzing}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {isUrgencyAnalyzing ? '分析中...' : urgencyError ? '重试分析' : '启动 AI 紧急程度分析'}
                  </button>
                  {urgencyError && <p className="text-red-500 text-xs mt-2">{urgencyError}</p>}
                </div>
              )}
            </div>
          </section>

          {/* ═══ Section 5: 责任部门分析 ═══ */}
          <section>
            <SectionTitle num="5" title="责任部门分析" subtitle="各部门反馈分布与占比" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {stats.byDepartment && Object.keys(stats.byDepartment).length > 0 ? (
                <InteractivePieChart
                  slices={Object.entries(stats.byDepartment).sort(([, a], [, b]) => b - a).map(([dept, count]) => ({
                    key: dept,
                    label: dept,
                    count,
                    color: DEPT_COLORS[dept] || '#999',
                  }))}
                  total={Object.values(stats.byDepartment).reduce((a, b) => a + b, 0)}
                  title="部门分布"
                  filterType="department"
                />
              ) : (
                <p className="text-center text-stone-400 py-8">暂无部门数据</p>
              )}
            </div>
          </section>

          {/* ═══ Section 6: AI 组织洞察 ═══ */}
          <section>
            <SectionTitle num="6" title="AI 组织洞察" subtitle="基于全部反馈数据的组织状态评估与改善方向" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {insightAnalysis ? (
                <div className="space-y-6">
                  {/* Overall Summary */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                    <h3 className="text-sm font-bold text-amber-800 mb-2">📋 整体态势</h3>
                    <p className="text-sm text-stone-700 leading-relaxed">{insightAnalysis.summary}</p>
                  </div>
                  {/* Org Insight */}
                  {insightAnalysis.orgInsight && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <h3 className="text-sm font-bold text-blue-800 mb-2">🏢 当前组织状态</h3>
                        <p className="text-sm text-stone-700 leading-relaxed">{insightAnalysis.orgInsight.currentState}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
                        <h3 className="text-sm font-bold text-violet-800 mb-2">🎯 优先改善方向</h3>
                        <div className="space-y-2">
                          {insightAnalysis.orgInsight.priorities.map((p, i) => (
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
                  {insightAnalysis.issues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-stone-700 mb-3">🔥 高频问题详情</h3>
                      <div className="space-y-3">
                        {insightAnalysis.issues.map((issue, i) => {
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
                    onClick={runInsightAnalysis}
                    disabled={isInsightAnalyzing}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {isInsightAnalyzing ? '正在分析...' : insightError ? '重试分析' : '生成 AI 组织洞察'}
                  </button>
                  {insightError && <p className="text-red-500 text-xs mt-2">{insightError}</p>}
                </div>
              )}
            </div>
          </section>

          {/* ═══ Section 7: 管理优化建议 ═══ */}
          <section>
            <SectionTitle num="7" title="管理优化建议" subtitle="短期措施与长期建设方向" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              {insightAnalysis?.managementAdvice ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center text-xs">⚡</span>
                      短期措施（1-4 周）
                    </h3>
                    <div className="space-y-2">
                      {insightAnalysis.managementAdvice.shortTerm.map((item, i) => (
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
                      {insightAnalysis.managementAdvice.longTerm.map((item, i) => (
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
                    {insightAnalysis ? '管理建议已包含在 AI 组织洞察中' : '请先在上方生成 AI 组织洞察'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Batch Input Modal */}
      {showBatchInput && (
        <BatchInput
          onConfirm={() => {
            setShowBatchInput(false);
            fetchStats();
          }}
          onClose={() => setShowBatchInput(false)}
        />
      )}
    </div>
  );
}
