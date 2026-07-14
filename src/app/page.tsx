'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { VoiceCard } from '@/components/voice-card';
import { VoiceForm } from '@/components/voice-form';
import { CategoryFilter } from '@/components/category-filter';
import type { Voice, VoiceCategory } from '@/lib/types';

export default function HomePage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [category, setCategory] = useState<VoiceCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchVoices = useCallback(async () => {
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
          <p className="text-sm text-muted-foreground">
            每一个声音都值得被听见，每一份心声都会被温柔以待
          </p>
        </div>

        {/* Action bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CategoryFilter selected={category} onChange={setCategory} />
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-[0.97]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            发布心声
          </button>
        </div>

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
    </div>
  );
}
