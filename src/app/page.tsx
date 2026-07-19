'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { VoiceCard } from '@/components/voice-card';
import { VoiceForm } from '@/components/voice-form';
import { CategoryFilter } from '@/components/category-filter';
import { BatchInput, BatchResultChart } from '@/components/batch-input';
import type { Voice, VoiceCategory } from '@/lib/types';

interface BatchResult {
  voices: Array<{
    id: string;
    content: string;
    category: string;
  }>;
  distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  total: number;
}

export default function HomePage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [category, setCategory] = useState<VoiceCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBatchInput, setShowBatchInput] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  const fetchVoices = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const url = category === 'all' ? '/api/voices' : `/api/voices?category=${category}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setVoices(data.data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    setIsLoading(true);
    fetchVoices();
    // Poll every 3 seconds for real-time updates
    const interval = setInterval(() => {
      fetchVoices(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchVoices]);

  const handleLike = async (id: string) => {
    try {
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'like' }),
      });
      const data = await res.json();
      if (data.success) {
        setVoices((prev) =>
          prev.map((v) => (v.id === id ? { ...v, likes: data.data.likes } : v))
        );
      }
    } catch {
      // silently fail
    }
  };

  const handleSubmit = async (formData: {
    content: string;
    category: VoiceCategory;
    author: string;
    isAnonymous: boolean;
  }) => {
    try {
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setVoices((prev) => [data.data, ...prev]);
        setShowForm(false);
      }
    } catch {
      throw new Error('发布失败');
    }
  };

  const handleRequestAiReply = (_id: string) => {
    // Handled inside VoiceCard
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Hero section */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            员工心声墙
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              每一个声音都值得被听见，每一份心声都会被温柔以待
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs text-green-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              实时
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CategoryFilter selected={category} onChange={setCategory} />
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setShowBatchInput(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted hover:shadow-md active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              批量输入
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-[0.97]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              发布心声
            </button>
          </div>
        </div>

        {/* Batch result chart */}
        {batchResult && (
          <div className="mb-8 animate-fade-in-up rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">批量输入结果</h3>
                <p className="text-xs text-muted-foreground">
                  成功导入 {batchResult.total} 条心声，AI 已自动分类
                </p>
              </div>
              <button
                onClick={() => setBatchResult(null)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <BatchResultChart distribution={batchResult.distribution} total={batchResult.total} />
          </div>
        )}

        {/* Voice form (collapsible) */}
        {showForm && (
          <div className="mb-8 animate-fade-in-up opacity-0">
            <VoiceForm onSubmit={handleSubmit} />
          </div>
        )}

        {/* Voice grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-3 w-12 rounded bg-muted" />
                </div>
                <div className="mb-2 h-4 w-full rounded bg-muted" />
                <div className="mb-4 h-4 w-3/4 rounded bg-muted" />
                <div className="h-6 w-20 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        ) : voices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-3 text-4xl">💬</div>
            <p className="text-sm text-muted-foreground">
              还没有心声，成为第一个分享的人吧
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {voices.map((voice, index) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                index={index}
                onLike={handleLike}
                onRequestAiReply={handleRequestAiReply}
              />
            ))}
          </div>
        )}
      </main>

      {/* Batch input modal */}
      {showBatchInput && (
        <BatchInput
          onSuccess={async (result) => {
            setBatchResult(result);
            setShowBatchInput(false);
            await fetchVoices();
          }}
          onClose={() => setShowBatchInput(false)}
        />
      )}
    </div>
  );
}
