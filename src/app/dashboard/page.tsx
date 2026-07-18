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
            {/* TOP 3 categories mini */}
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
          </section>

          {/* ═══ Section 3: 高频问题洞察 ═══ */}
          <section>
            <SectionTitle num="3" title="高频问题洞察" subtitle="热点问题识别与趋势变化" />
            <div className="bg-white rounded-2xl p-6 border border-stone-200/60 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topCategories.map(([cat, count]) => {
                  const info = CATEGORY_MAP[cat as VoiceCategory];
                  const pct = ((count / stats.total) * 100).toFixed(1);
                  const hotTopics: Record<string, string[]> = {
                    performance: ['评C原因不清', '扣分标准不明', '与考勤关联', '目标不合理'],
                    housing: ['空调不制冷', '热水器故障', '卫生问题', '噪音干扰'],
                    attendance: ['补卡困难', '打卡异常', '工时核算', '加班记录缺失'],
                    management: ['沟通态度', '流程不清', '分配不公'],
                    salary: ['调薪不及时', '薪资标准低', '奖金分配'],
                    dining: ['菜品单一', '食材新鲜度', '就餐环境'],
                    rough_management: ['当众批评', '言语粗暴'],
                    other: ['其他建议', '综合反馈'],
                  };
                  return (
                    <div key={cat} className="p-4 rounded-xl border border-stone-100 bg-gradient-to-br from-stone-50 to-white">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{info?.icon}</span>
                        <div>
                          <h4 className="font-semibold text-stone-800">{info?.label || cat}</h4>
                          <p className="text-xs text-stone-400">{count} 条 · {pct}%</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-stone-500">常见子问题：</p>
                        {(hotTopics[cat] || ['综合反馈']).map((topic, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-stone-600">
                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: info?.pieColor }} />
                            {topic}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
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
