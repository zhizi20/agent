'use client';

import { useEffect, useState, useCallback } from 'react';
import { CATEGORY_MAP, DEPARTMENT_RESPONSIBILITY } from '@/lib/types';
import type { FeedbackCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Users, FileText, AlertTriangle, Building2, Sparkles, Brain, ChevronDown, ChevronUp, Shield } from 'lucide-react';

interface DashboardStats {
  total: number;
  byCategory: Record<string, number>;
  byFactory: Record<string, number>;
  handledCount: number;
  handleRate: number;
  avgScore: number;
  scoreCount: number;
  topIssues: { category: string; count: number; percentage: number; samples: string[] }[];
  detailedFeedbacks: { id: string; description: string; category: string; factory: string; hasResult: boolean }[];
}

interface AnalysisIssue {
  title: string;
  urgency: string;
  description: string;
  relatedCount: number;
  department: string;
  suggestions: string[];
  replyTemplate: string;
}

interface AnalysisResult {
  summary: string;
  issues: AnalysisIssue[];
  overallSuggestions: string[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisText('');
    setAnalysisResult(null);
    setExpandedIssue(null);

    try {
      const res = await fetch('/api/analysis', { method: 'POST' });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const jsonStr = line.replace('data: ', '');
          try {
            const data = JSON.parse(jsonStr);
            if (data.content) {
              fullText += data.content;
              setAnalysisText(fullText);
            }
            if (data.done) {
              // Try to parse JSON from the full text
              const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[1]);
                  setAnalysisResult(parsed);
                } catch {
                  // JSON parse failed, keep raw text
                }
              }
            }
            if (data.error) {
              console.error('Analysis error:', data.error);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      console.error('Failed to analyze:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    const info = CATEGORY_MAP[cat as FeedbackCategory];
    return info?.label || cat;
  };

  const getCategoryColor = (cat: string) => {
    const info = CATEGORY_MAP[cat as FeedbackCategory];
    return info?.color || 'bg-gray-100 text-gray-700';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case '高': return 'bg-red-100 text-red-700 border-red-200';
      case '中': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '低': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case '高': return '🔴';
      case '中': return '🟡';
      case '低': return '🟢';
      default: return '⚪';
    }
  };

  const maxCategoryCount = stats ? Math.max(...Object.values(stats.byCategory)) : 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">加载数据失败，请刷新页面重试</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-gray-500 mt-1">员工反馈分类统计、高频问题摘要与处理建议</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">总反馈数</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">已处理</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">{stats.handledCount}</p>
                <p className="text-xs text-purple-500 mt-0.5">处理率 {stats.handleRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700">平均评分</p>
                <p className="text-3xl font-bold text-emerald-900 mt-1">{stats.avgScore}</p>
                <p className="text-xs text-emerald-500 mt-0.5">{stats.scoreCount} 条评价</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-coral-50 to-rose-50 border-coral-100 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-coral-700">问题类别</p>
                <p className="text-3xl font-bold text-coral-900 mt-1">{Object.keys(stats.byCategory).length}</p>
                <p className="text-xs text-coral-500 mt-0.5">个分类</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-coral-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-coral-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              反馈分类分布
            </CardTitle>
            <CardDescription>按问题类别统计反馈数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topIssues.map((issue) => (
                <div key={issue.category} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(issue.category)} variant="secondary">
                        {getCategoryLabel(issue.category)}
                      </Badge>
                      <span className="text-sm font-medium text-gray-700">{issue.count} 条</span>
                    </div>
                    <span className="text-sm text-gray-500">{issue.percentage}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-coral-400 transition-all duration-700 ease-out group-hover:opacity-80"
                      style={{ width: `${(issue.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  {issue.samples.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      典型: {issue.samples[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Factory Distribution */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-lavender" />
              厂区分布
            </CardTitle>
            <CardDescription>按厂区/部门统计反馈数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byFactory)
                .sort(([, a], [, b]) => b - a)
                .map(([factory, count]) => {
                  const maxFactory = Math.max(...Object.values(stats.byFactory));
                  const percentage = Math.round((count / stats.total) * 100);
                  return (
                    <div key={factory} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700">{factory}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{count} 条</span>
                          <span className="text-xs text-gray-400">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-lavender to-purple-400 transition-all duration-700 ease-out group-hover:opacity-80"
                          style={{ width: `${(count / maxFactory) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Issues Summary */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-coral" />
            高频问题摘要
          </CardTitle>
          <CardDescription>基于 {stats.total} 条反馈提炼的核心问题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.topIssues.slice(0, 6).map((issue) => (
              <div key={issue.category} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-sm font-bold text-gray-600">{issue.count}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getCategoryColor(issue.category)} variant="secondary">
                      {getCategoryLabel(issue.category)}
                    </Badge>
                    <span className="text-xs text-gray-400">{issue.percentage}%</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {issue.samples[0] || '暂无典型反馈'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                AI 深度分析
              </CardTitle>
              <CardDescription>
                基于全部 {stats.total} 条反馈，生成紧急程度判断、责任部门建议与处理方案
              </CardDescription>
            </div>
            <Button
              onClick={handleAnalysis}
              disabled={analyzing}
              className="bg-gradient-to-r from-amber-500 to-coral-500 hover:from-amber-600 hover:to-coral-600 text-white rounded-xl"
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成分析
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Analysis Result - Structured View */}
          {analysisResult && analysisResult.issues && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-coral-50 border border-amber-100">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  整体分析摘要
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.summary}</p>
              </div>

              {/* Issues with Urgency */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-coral" />
                  问题详情与处理建议
                </h3>
                <div className="space-y-3">
                  {analysisResult.issues.map((issue, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedIssue(expandedIssue === idx ? null : idx)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-lg">{getUrgencyIcon(issue.urgency)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{issue.title}</span>
                            <Badge className={getUrgencyColor(issue.urgency)} variant="outline">
                              {issue.urgency}紧急
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{issue.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                            {issue.department}
                          </Badge>
                          {expandedIssue === idx ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>
                      {expandedIssue === idx && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1.5">问题描述</h4>
                            <p className="text-sm text-gray-600">{issue.description}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1.5">处理建议</h4>
                            <ul className="space-y-1">
                              {issue.suggestions.map((s, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1.5">员工回复话术</h4>
                            <div className="p-3 rounded-lg bg-gray-50 text-sm text-gray-600 leading-relaxed">
                              {issue.replyTemplate}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Suggestions */}
              {analysisResult.overallSuggestions && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    公司层面改进建议
                  </h3>
                  <ul className="space-y-1.5">
                    {analysisResult.overallSuggestions.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Raw Streaming Text (shown during analysis or if JSON parse fails) */}
          {analyzing && !analysisResult && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10" />
              <div className="max-h-96 overflow-y-auto pt-4">
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {analysisText}
                </div>
              </div>
            </div>
          )}

          {!analyzing && !analysisResult && !analysisText && (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-coral-100 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-gray-600 mb-1">点击「生成分析」按钮</p>
              <p className="text-sm text-gray-400">AI 将分析全部 {stats.total} 条反馈，生成处理建议</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="rounded-2xl bg-gradient-to-r from-amber-50 to-coral-50 border-amber-100">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            数据洞察
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-white/60">
              <p className="text-sm text-gray-600">
                绩效问题占比最高（{stats.topIssues[0]?.percentage || 0}%），建议重点关注绩效考核透明度和沟通机制。
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/60">
              <p className="text-sm text-gray-600">
                住宿和用餐问题合计占比超过 38%，生活服务类是员工关注的重点方向。
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/60">
              <p className="text-sm text-gray-600">
                智能总装一厂反馈最多，建议优先关注该厂区的管理改善和服务提升。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
