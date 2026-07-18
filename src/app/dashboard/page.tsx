'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
                // Try to parse the final result
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

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            数据看板
          </h1>
          <p className="text-sm text-muted-foreground">
            了解员工心声的整体趋势与分布
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
            {/* Overview cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="心声总数"
                value={stats.total}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
                color="#D4A574"
              />
              <StatCard
                label="本周新增"
                value={stats.recentWeek}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
                color="#7EB8D4"
              />
              <StatCard
                label="获得共鸣"
                value={stats.totalLikes}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 10v12" />
                    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                  </svg>
                }
                color="#E8917A"
              />
              <StatCard
                label="匿名心声"
                value={stats.anonymousCount}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                }
                color="#B8A9C9"
              />
            </div>

            {/* Category distribution */}
            <div className="mb-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-foreground">
                分类分布
              </h2>
              <div className="space-y-4">
                {categories.map(([key, val]) => {
                  const count = stats.byCategory[key] || 0;
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
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
            </div>

            {/* Pie chart - Category distribution */}
            <div className="mb-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-foreground">
                分类占比
              </h2>
              <CategoryPieChart byCategory={stats.byCategory} total={stats.total} />
            </div>

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
                  text={`共获得 ${stats.totalLikes} 次共鸣，说明员工之间有着良好的互动与理解。`}
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
  // Try to parse partial JSON for progressive display
  const parsed = parseAnalysisResult(rawText);

  if (parsed) {
    return <AnalysisDisplay result={parsed} />;
  }

  // Show raw streaming text with a nice container
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

function CategoryPieChart({ byCategory, total }: { byCategory: Record<string, number>; total: number }) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const radius = 90;
  const centerX = 110;
  const centerY = 110;

  const slices = useMemo(() => {
    const entries = Object.entries(byCategory)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        key,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        ...CATEGORY_MAP[key as VoiceCategory],
      }));

    // Compute cumulative start angles purely (no mutable variables)
    const sliceStartAngles = entries.map((_, i) =>
      entries.slice(0, i).reduce((sum, e) => sum + (e.percentage / 100) * 360, -90)
    );

    return entries.map((entry, idx) => {
      const angle = (entry.percentage / 100) * 360;
      const startAngle = sliceStartAngles[idx];
      const endAngle = startAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      return { ...entry, pathData };
    });
  }, [byCategory, total, centerX, centerY, radius]);

  if (slices.length === 0 || total === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mb-2 text-3xl opacity-40">📊</div>
        <p className="text-sm text-muted-foreground">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
      {/* SVG Pie Chart */}
      <div className="relative shrink-0">
        <svg width="220" height="220" viewBox="0 0 220 220">
          {slices.map((slice) => (
            <path
              key={slice.key}
              d={slice.pathData}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200"
              style={{
                transform: hoveredSlice === slice.key ? 'scale(1.06)' : 'scale(1)',
                transformOrigin: 'center',
                opacity: hoveredSlice !== null && hoveredSlice !== slice.key ? 0.55 : 1,
              }}
              onMouseEnter={() => setHoveredSlice(slice.key)}
              onMouseLeave={() => setHoveredSlice(null)}
            />
          ))}
          {/* Center donut hole */}
          <circle cx={centerX} cy={centerY} r="48" fill="var(--card)" />
          <text
            x={centerX}
            y={centerY - 6}
            textAnchor="middle"
            className="fill-foreground text-2xl font-bold"
            style={{ fontSize: '22px', fontWeight: 700 }}
          >
            {total}
          </text>
          <text
            x={centerX}
            y={centerY + 14}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: '11px' }}
          >
            条心声
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {slices.map((slice) => (
          <div
            key={slice.key}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 cursor-pointer"
            onMouseEnter={() => setHoveredSlice(slice.key)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div
              className="h-3.5 w-3.5 shrink-0 rounded"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-sm text-foreground">
              {slice.emoji} {slice.label}
            </span>
            <span className="ml-auto text-sm font-semibold text-foreground">
              {slice.count}
            </span>
            <span
              className="min-w-[3rem] rounded-full px-2 py-0.5 text-center text-xs font-medium"
              style={{ backgroundColor: `${slice.color}18`, color: slice.color }}
            >
              {slice.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="voice-card rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-bold text-foreground">{value}</div>
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
    // Extract JSON from markdown code block or raw text
    let jsonStr = text;

    // Try to find JSON in code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    } else {
      // Try to find JSON object directly
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
  return CATEGORY_MAP[top[0] as VoiceCategory]?.emoji || '💬';
}

function getTopCategoryLabel(byCategory: Record<string, number>): string {
  const entries = Object.entries(byCategory);
  if (entries.length === 0) return '暂无';
  const top = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  return CATEGORY_MAP[top[0] as VoiceCategory]?.label || '其他';
}
