'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { CATEGORY_MAP } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Stats {
  total: number;
  byCategory: Record<string, number>;
  totalLikes: number;
  anonymousCount: number;
  recentWeek: number;
  dailyTrend: { date: string; count: number }[];
  topVoices: { id: string; content: string; category: string; likes: number; createdAt: string }[];
  avgLikesPerVoice: number;
  replyRate: number;
}

interface AnalysisIssue {
  title: string;
  urgency: string;
  description: string;
  relatedCount: number;
  department: string;
  suggestions: string[];
}

interface AnalysisResult {
  summary: string;
  issues: AnalysisIssue[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawAnalysisText, setRawAnalysisText] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const runAnalysis = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setRawAnalysisText('');

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json();
        setRawAnalysisText(errData.error || '分析失败');
        setIsAnalyzing(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setIsAnalyzing(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setRawAnalysisText(accumulated);
              }
              if (data.done) {
                const parsed = parseAnalysisResult(accumulated);
                if (parsed) {
                  setAnalysis(parsed);
                }
                setIsAnalyzing(false);
              }
              if (data.error) {
                setRawAnalysisText(data.error);
                setIsAnalyzing(false);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch {
      setRawAnalysisText('网络异常，请稍后重试');
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const categories = Object.entries(CATEGORY_MAP) as [
    VoiceCategory,
    (typeof CATEGORY_MAP)[VoiceCategory],
  ][];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            数据看板
          </h1>
          <p className="text-sm text-muted-foreground">
            全方位洞察员工心声，助力管理决策
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border/60 bg-card p-6"
              >
                <div className="mb-2 h-3 w-16 rounded bg-muted" />
                <div className="h-8 w-12 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Overview cards - 6 cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard
                label="心声总数"
                value={stats.total}
                icon={<MessageIcon />}
                color="#D4A574"
              />
              <StatCard
                label="本周新增"
                value={stats.recentWeek}
                icon={<ClockIcon />}
                color="#7EB8D4"
              />
              <StatCard
                label="获得共鸣"
                value={stats.totalLikes}
                icon={<HeartIcon />}
                color="#E8917A"
              />
              <StatCard
                label="匿名心声"
                value={stats.anonymousCount}
                icon={<ShieldIcon />}
                color="#B8A9C9"
              />
              <StatCard
                label="平均共鸣"
                value={stats.avgLikesPerVoice}
                icon={<TrendUpIcon />}
                color="#8BC49E"
                suffix="次/条"
              />
              <StatCard
                label="AI 回复率"
                value={stats.replyRate}
                icon={<BotIcon />}
                color="#D4A574"
                suffix="%"
              />
            </div>

            {/* Two column layout: Trend + Category */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              {/* Daily Trend Chart */}
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-foreground">
                  近 7 天趋势
                </h2>
                <TrendChart data={stats.dailyTrend} />
              </div>

              {/* Category Distribution */}
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-foreground">
                  分类分布
                </h2>
                <CategoryChart categories={categories} byCategory={stats.byCategory} total={stats.total} />
              </div>
            </div>

            {/* Top Voices + Urgency Summary (if analysis done) */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              {/* Top Voices */}
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="text-lg">🏆</span>
                  热门心声 TOP 5
                </h2>
                <TopVoicesList voices={stats.topVoices} />
              </div>

              {/* Urgency Overview (from analysis) */}
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="text-lg">⚡</span>
                  紧急程度概览
                </h2>
                {analysis ? (
                  <UrgencyOverview issues={analysis.issues} />
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center text-center">
                    <div className="mb-2 text-3xl opacity-40">📊</div>
                    <p className="text-sm text-muted-foreground">
                      运行 AI 深度分析后，将展示紧急程度分布
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Department Distribution (if analysis done) */}
            {analysis && (
              <div className="mb-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <span className="text-lg">🏢</span>
                  责任部门分布
                </h2>
                <DepartmentChart issues={analysis.issues} />
              </div>
            )}

            {/* AI Analysis Section */}
            <div className="mb-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                      <circle cx="12" cy="15" r="2" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-foreground">
                    AI 深度分析
                  </h2>
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all',
                    isAnalyzing
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-accent/10 text-accent hover:bg-accent/20 active:scale-[0.97]'
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                      分析中...
                    </>
                  ) : analysis ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      重新分析
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      生成分析
                    </>
                  )}
                </button>
              </div>

              {/* Analysis content */}
              {analysis ? (
                <AnalysisDisplay result={analysis} />
              ) : isAnalyzing ? (
                <StreamingAnalysis rawText={rawAnalysisText} />
              ) : rawAnalysisText ? (
                <div className="rounded-xl bg-destructive/5 p-4 text-sm text-destructive">
                  {rawAnalysisText}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mb-2 text-3xl opacity-40">🔍</div>
                  <p className="text-sm text-muted-foreground">
                    点击「生成分析」，AI 将基于所有心声数据生成深度分析报告
                  </p>
                </div>
              )}
            </div>

            {/* Insights */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                洞察小结
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
                <InsightItem
                  emoji={getTopCategory(stats.byCategory)}
                  text={`当前员工最关注的方向是「${getTopCategoryLabel(stats.byCategory)}」，建议重点关注。`}
                />
                <InsightItem
                  emoji="📊"
                  text={`本周共收到 ${stats.recentWeek} 条新心声，${stats.recentWeek > 0 ? '员工参与度良好' : '可以鼓励更多员工参与'}。`}
                />
                <InsightItem
                  emoji="🤝"
                  text={`共获得 ${stats.totalLikes} 次共鸣，平均每条心声 ${stats.avgLikesPerVoice} 次共鸣，说明员工之间有着良好的互动与理解。`}
                />
                <InsightItem
                  emoji="🤖"
                  text={`AI 回复率为 ${stats.replyRate}%，${stats.replyRate >= 80 ? '回复覆盖率良好' : '建议提升回复覆盖率，让每条心声都得到回应'}。`}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">加载数据失败</p>
          </div>
        )}
      </main>
    </div>
  );
}

/* ==================== Chart Components ==================== */

function TrendChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 120;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2" style={{ height: chartHeight }}>
        {data.map((item, idx) => {
          const height = item.count > 0 ? Math.max((item.count / maxCount) * chartHeight, 8) : 4;
          return (
            <div key={idx} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-foreground/70">
                {item.count}
              </span>
              <div
                className="w-full rounded-t-lg transition-all duration-500 ease-out"
                style={{
                  height: `${height}px`,
                  backgroundColor: item.count > 0 ? '#D4A57440' : '#E8E2DB40',
                  border: item.count > 0 ? '1px solid #D4A57460' : '1px solid #E8E2DB60',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 border-t border-border/40 pt-2">
        {data.map((item, idx) => (
          <span key={idx} className="flex-1 text-center text-[10px] text-muted-foreground">
            {item.date}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryChart({
  categories,
  byCategory,
  total,
}: {
  categories: [VoiceCategory, (typeof CATEGORY_MAP)[VoiceCategory]][];
  byCategory: Record<string, number>;
  total: number;
}) {
  return (
    <div className="space-y-3">
      {categories.map(([key, val]) => {
        const count = byCategory[key] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-6 text-center text-base">{val.emoji}</span>
            <span className="w-12 text-sm text-foreground">{val.label}</span>
            <div className="flex-1">
              <div className="h-7 w-full overflow-hidden rounded-full bg-secondary/60">
                <div
                  className="flex h-full items-center rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(percentage, 2)}%`,
                    backgroundColor: `${val.color}30`,
                  }}
                >
                  <span
                    className="ml-2 text-xs font-medium"
                    style={{ color: val.color }}
                  >
                    {count}
                  </span>
                </div>
              </div>
            </div>
            <span className="w-12 text-right text-xs text-muted-foreground">
              {percentage.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopVoicesList({
  voices,
}: {
  voices: { id: string; content: string; category: string; likes: number; createdAt: string }[];
}) {
  if (voices.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        暂无心声数据
      </div>
    );
  }

  const categoryInfo = CATEGORY_MAP[voices[0]?.category as VoiceCategory] || { emoji: '💬', color: '#A8A29E' };

  return (
    <div className="space-y-3">
      {voices.map((voice, idx) => {
        const catInfo = CATEGORY_MAP[voice.category as VoiceCategory] || { emoji: '💬', color: '#A8A29E', label: '其他' };
        return (
          <div
            key={voice.id}
            className="flex items-start gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3 transition-all hover:border-border/60 hover:bg-secondary/40"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: idx === 0 ? '#D4A57420' : idx === 1 ? '#E8E2DB40' : idx === 2 ? '#E8917A15' : '#F3EDE740',
                color: idx === 0 ? '#D4A574' : idx === 1 ? '#8A817A' : idx === 2 ? '#E8917A' : '#8A817A',
              }}
            >
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed text-foreground/85 line-clamp-2">
                {voice.content}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: `${catInfo.color}15`, color: catInfo.color }}
                >
                  {catInfo.emoji} {catInfo.label}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-destructive/80">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M7 10v12" />
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
              <span>{voice.likes}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UrgencyOverview({ issues }: { issues: AnalysisIssue[] }) {
  const urgencyCounts = { '高': 0, '中': 0, '低': 0 };
  for (const issue of issues) {
    if (issue.urgency in urgencyCounts) {
      urgencyCounts[issue.urgency as keyof typeof urgencyCounts]++;
    }
  }

  const total = issues.length || 1;
  const urgencyConfig = [
    { label: '高', count: urgencyCounts['高'], color: '#DC2626', bg: '#FEE2E2' },
    { label: '中', count: urgencyCounts['中'], color: '#D97706', bg: '#FEF3C7' },
    { label: '低', count: urgencyCounts['低'], color: '#059669', bg: '#D1FAE5' },
  ];

  return (
    <div className="space-y-4">
      {/* Visual bar */}
      <div className="flex h-8 overflow-hidden rounded-full">
        {urgencyConfig.map((item) => (
          item.count > 0 && (
            <div
              key={item.label}
              className="flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
              style={{
                width: `${(item.count / total) * 100}%`,
                backgroundColor: item.color,
              }}
            >
              {item.count}
            </div>
          )
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between">
        {urgencyConfig.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">
              {item.label}紧急 ({item.count})
            </span>
          </div>
        ))}
      </div>

      {/* Issue list sorted by urgency */}
      <div className="space-y-2">
        {[...issues]
          .sort((a, b) => {
            const order = { '高': 0, '中': 1, '低': 2 };
            return (order[a.urgency as keyof typeof order] ?? 3) - (order[b.urgency as keyof typeof order] ?? 3);
          })
          .map((issue, idx) => {
            const config = getUrgencyConfig(issue.urgency);
            return (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-secondary/10 px-3 py-2"
              >
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: config.bgColor, color: config.textColor }}
                >
                  {config.dot}
                  {issue.urgency}
                </span>
                <span className="flex-1 truncate text-xs text-foreground/80">{issue.title}</span>
                <span className="text-[10px] text-muted-foreground">{issue.department}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function DepartmentChart({ issues }: { issues: AnalysisIssue[] }) {
  const deptMap: Record<string, { count: number; urgencies: string[] }> = {};
  for (const issue of issues) {
    if (!issue.department) continue;
    if (!deptMap[issue.department]) {
      deptMap[issue.department] = { count: 0, urgencies: [] };
    }
    deptMap[issue.department].count++;
    deptMap[issue.department].urgencies.push(issue.urgency);
  }

  const departments = Object.entries(deptMap)
    .sort((a, b) => b[1].count - a[1].count);

  const maxCount = Math.max(...departments.map(([, v]) => v.count), 1);

  const deptColors = ['#D4A574', '#7EB8D4', '#B8A9C9', '#8BC49E', '#E8917A', '#A8A29E'];

  return (
    <div className="space-y-3">
      {departments.map(([dept, data], idx) => {
        const color = deptColors[idx % deptColors.length];
        const percentage = (data.count / maxCount) * 100;
        const hasHigh = data.urgencies.includes('高');
        return (
          <div key={dept} className="flex items-center gap-3">
            <span className="w-24 truncate text-sm text-foreground" title={dept}>
              {dept}
            </span>
            <div className="flex-1">
              <div className="h-8 w-full overflow-hidden rounded-lg bg-secondary/60">
                <div
                  className="flex h-full items-center rounded-lg transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(percentage, 8)}%`,
                    backgroundColor: `${color}25`,
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <span className="ml-2 text-xs font-medium" style={{ color }}>
                    {data.count} 个问题
                  </span>
                </div>
              </div>
            </div>
            {hasHigh && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                含紧急
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ==================== Analysis Components ==================== */

function AnalysisDisplay({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-xl bg-secondary/40 p-4">
        <div className="mb-1.5 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="text-xs font-medium text-primary">整体态势</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/85">{result.summary}</p>
      </div>

      {/* Issues list */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">高频问题与处理建议</h3>
        {result.issues.map((issue, idx) => (
          <IssueCard key={idx} issue={issue} index={idx} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue, index }: { issue: AnalysisIssue; index: number }) {
  const urgencyConfig = getUrgencyConfig(issue.urgency);

  return (
    <div
      className="animate-fade-in-up opacity-0 rounded-xl border border-border/50 bg-card p-4"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{issue.title}</span>
          <span
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: urgencyConfig.bgColor,
              color: urgencyConfig.textColor,
            }}
          >
            {urgencyConfig.dot}
            {issue.urgency}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          涉及 {issue.relatedCount} 条心声
        </span>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-foreground/75">
        {issue.description}
      </p>

      {/* Responsible department */}
      {issue.department && (
        <div className="mb-3 flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-chart-4">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-xs text-muted-foreground">建议责任部门：</span>
          <span className="inline-flex items-center rounded-md bg-chart-4/10 px-2 py-0.5 text-xs font-medium text-chart-4">
            {issue.department}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">处理建议：</span>
        {issue.suggestions.map((suggestion, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
            <span>{suggestion}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreamingAnalysis({ rawText }: { rawText: string }) {
  const parsed = parseAnalysisResult(rawText);

  if (parsed) {
    return <AnalysisDisplay result={parsed} />;
  }

  return (
    <div className="rounded-xl bg-secondary/30 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        <span className="text-xs font-medium text-accent">AI 正在分析中...</span>
      </div>
      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/60 font-mono">
        {rawText}
        <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-accent align-middle" />
      </pre>
    </div>
  );
}

/* ==================== Base UI Components ==================== */

function StatCard({
  label,
  value,
  icon,
  color,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="voice-card rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function InsightItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-base">{emoji}</span>
      <p>{text}</p>
    </div>
  );
}

/* ==================== Icon Components ==================== */

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

/* ==================== Utility Functions ==================== */

function getUrgencyConfig(urgency: string): {
  bgColor: string;
  textColor: string;
  dot: React.ReactNode;
} {
  switch (urgency) {
    case '高':
      return {
        bgColor: '#FEE2E2',
        textColor: '#DC2626',
        dot: <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />,
      };
    case '中':
      return {
        bgColor: '#FEF3C7',
        textColor: '#D97706',
        dot: <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />,
      };
    case '低':
      return {
        bgColor: '#D1FAE5',
        textColor: '#059669',
        dot: <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />,
      };
    default:
      return {
        bgColor: '#F3F4F6',
        textColor: '#6B7280',
        dot: <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />,
      };
  }
}

function parseAnalysisResult(text: string): AnalysisResult | null {
  try {
    let jsonStr = text;

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed.summary && Array.isArray(parsed.issues)) {
      return {
        summary: parsed.summary,
        issues: parsed.issues.map((issue: Record<string, unknown>) => ({
          title: String(issue.title || ''),
          urgency: String(issue.urgency || '中'),
          description: String(issue.description || ''),
          relatedCount: Number(issue.relatedCount || 0),
          department: String(issue.department || ''),
          suggestions: Array.isArray(issue.suggestions)
            ? issue.suggestions.map(String)
            : [],
        })),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function getTopCategory(byCategory: Record<string, number>): string {
  const entries = Object.entries(byCategory);
  if (entries.length === 0) return '💡';
  const top = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  const emojiMap: Record<string, string> = {
    suggestion: '💡',
    vent: '😤',
    gratitude: '🙏',
    confusion: '🤔',
    idea: '✨',
    other: '💬',
  };
  return emojiMap[top[0]] || '💬';
}

function getTopCategoryLabel(byCategory: Record<string, number>): string {
  const entries = Object.entries(byCategory);
  if (entries.length === 0) return '暂无';
  const top = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  const labelMap: Record<string, string> = {
    suggestion: '建议',
    vent: '吐槽',
    gratitude: '感恩',
    confusion: '困惑',
    idea: '灵感',
    other: '其他',
  };
  return labelMap[top[0]] || '其他';
}
