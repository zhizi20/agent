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
    role: string;
  }) => Promise<{ success: boolean; error?: string; isDuplicate?: boolean }>;
}

export function VoiceForm({ onSubmit }: VoiceFormProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<VoiceCategory>('performance');
  const [author, setAuthor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !author.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setDuplicateError(null);
    try {
      // Get role from localStorage (set by role verification dialog)
      const role = typeof window !== 'undefined' 
        ? (localStorage.getItem('userRole') || 'employee')
        : 'employee';
      
      const result = await onSubmit({
        content: content.trim(),
        category,
        author: author.trim(),
        role,
      });
      
      if (result.success) {
        setContent('');
        setCategory('performance');
        setAuthor('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else if (result.isDuplicate && result.error) {
        // Show duplicate error message
        setDuplicateError(result.error);
      }
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

      {/* Author name - required */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          姓名 <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="请输入你的姓名"
          maxLength={20}
          required
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          心声内容 <span className="text-destructive">*</span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在这里写下你想说的话..."
          maxLength={500}
          rows={4}
          required
          className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {content.length}/500
        </div>
      </div>

      {/* Duplicate error message */}
      {duplicateError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{duplicateError}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!content.trim() || !author.trim() || isSubmitting}
        className={cn(
          'w-full rounded-xl py-3 text-sm font-medium transition-all',
          content.trim() && author.trim() && !isSubmitting
            ? 'bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:brightness-105 active:scale-[0.98]'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isSubmitting ? '发布中...' : showSuccess ? '发布成功!' : '发布心声'}
      </button>
    </form>
  );
}
