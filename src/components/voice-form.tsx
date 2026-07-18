'use client';

import { useState } from 'react';
import type { VoiceCategory } from '@/lib/types';
import { CATEGORY_MAP } from '@/lib/types';
import { cn } from '@/lib/utils';

interface VoiceFormProps {
  onSubmit: (data: {
    content: string;
    category: VoiceCategory;
    author: string;
    isAnonymous: boolean;
  }) => Promise<void>;
}

export function VoiceForm({ onSubmit }: VoiceFormProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<VoiceCategory>('performance');
  const [author, setAuthor] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        content: content.trim(),
        category,
        author: isAnonymous ? '' : author,
        isAnonymous,
      });
      setContent('');
      setCategory('performance');
      setAuthor('');
      setIsAnonymous(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Object.entries(CATEGORY_MAP) as [
    VoiceCategory,
    (typeof CATEGORY_MAP)[VoiceCategory],
  ][];

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        说出你的心声
      </h3>

      {/* Category selection */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          选择分类
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                category === key
                  ? 'ring-2 ring-offset-1 shadow-sm'
                  : 'opacity-60 hover:opacity-100'
              )}
              style={{
                backgroundColor: `${val.color}15`,
                color: val.color,
                ...(category === key ? { ringColor: val.color } : {}),
              }}
            >
              <span>{val.icon}</span>
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在这里写下你想说的话..."
          maxLength={500}
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {content.length}/500
        </div>
      </div>

      {/* Anonymous toggle */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-sm text-foreground">匿名发布</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors',
            isAnonymous ? 'bg-primary' : 'bg-border'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              isAnonymous ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>

      {/* Author name (when not anonymous) */}
      {!isAnonymous && (
        <div className="mb-4">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="你的名字"
            maxLength={20}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className={cn(
          'w-full rounded-xl py-3 text-sm font-medium transition-all',
          content.trim() && !isSubmitting
            ? 'bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:brightness-105 active:scale-[0.98]'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isSubmitting ? '发布中...' : showSuccess ? '发布成功!' : '发布心声'}
      </button>
    </form>
  );
}
