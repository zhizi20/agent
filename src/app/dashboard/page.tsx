'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { CATEGORY_MAP } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';

interface Stats {
  total: number;
  byCategory: Record<string, number>;
  totalLikes: number;
  anonymousCount: number;
  recentWeek: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
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

            {/* Insights */}
            <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
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
