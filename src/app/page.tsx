'use client';

import { useEffect, useState, useCallback } from 'react';
import { CATEGORY_MAP } from '@/lib/types';
import type { Feedback, FeedbackCategory } from '@/lib/types';
import { VoiceCard } from '@/components/voice-card';
import { VoiceForm } from '@/components/voice-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Filter, Search, Sparkles } from 'lucide-react';

export default function Home() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      
      const res = await fetch(`/api/voices?${params}`);
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleCreate = async (data: { category: FeedbackCategory; title: string; description: string; department: string }) => {
    const res = await fetch('/api/voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      setShowForm(false);
      fetchFeedbacks();
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      f.description.toLowerCase().includes(query) ||
      f.title.toLowerCase().includes(query) ||
      f.department.toLowerCase().includes(query)
    );
  });

  const categoryCounts = feedbacks.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          茂佳科技 · 员工反馈分析平台
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">员工心声助手</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          对员工反馈进行分类、归纳并生成响应建议，让每个声音都被听见
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索反馈内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-coral-500 text-white text-sm font-medium hover:from-amber-600 hover:to-coral-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          提交反馈
        </button>
      </div>

      {/* Voice Form */}
      {showForm && (
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="pt-6">
            <VoiceForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部 ({feedbacks.length})
        </button>
        {(Object.keys(CATEGORY_MAP) as FeedbackCategory[]).map((cat) => {
          const info = CATEGORY_MAP[cat];
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <Card className="rounded-2xl border-gray-100">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-1">暂无反馈数据</p>
            <p className="text-sm text-gray-400">点击「提交反馈」开始记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((feedback) => (
            <VoiceCard key={feedback.id} feedback={feedback} onUpdate={fetchFeedbacks} />
          ))}
        </div>
      )}
    </div>
  );
}
