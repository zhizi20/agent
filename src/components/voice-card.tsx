'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Voice, VoiceCategory } from '@/lib/types';
import { CATEGORY_MAP } from '@/lib/types';
import { cn } from '@/lib/utils';

interface VoiceCardProps {
  voice: Voice;
  index: number;
  onLike: (id: string) => void;
  onRequestAiReply: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: { content: string; category: VoiceCategory; status?: 'resolved' | 'unresolved' }) => Promise<void>;
}

export function VoiceCard({ voice, index, onLike, onRequestAiReply, onDelete, onUpdate }: VoiceCardProps) {
  const [aiReplyText, setAiReplyText] = useState(voice.aiReply || '');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(voice.content);
  const [editCategory, setEditCategory] = useState<VoiceCategory>(voice.category);
  const [editStatus, setEditStatus] = useState<'resolved' | 'unresolved'>(voice.status || 'unresolved');

  const category = CATEGORY_MAP[voice.category];
  const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

  const handleAiReply = useCallback(async () => {
    if (isStreaming || voice.aiReply) return;
    setIsStreaming(true);
    setAiReplyText('');

    try {
      const response = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voice.id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        setAiReplyText(errData.error || '生成失败');
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

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
                setAiReplyText((prev) => prev + data.content);
              }
              if (data.done) {
                setIsStreaming(false);
              }
              if (data.error) {
                setAiReplyText(data.error);
                setIsStreaming(false);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch {
      setAiReplyText('网络异常，请稍后重试');
      setIsStreaming(false);
    }
  }, [voice.id, voice.aiReply, isStreaming]);

  useEffect(() => {
    if (voice.aiReply && !aiReplyText) {
      setAiReplyText(voice.aiReply);
    }
  }, [voice.aiReply, aiReplyText]);

  const timeAgo = getTimeAgo(voice.createdAt);

  return (
    <div
      className={cn(
        'voice-card animate-fade-in-up opacity-0 rounded-2xl border border-border/60 bg-card p-5 shadow-sm',
        staggerClass
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${category.color}15`,
              color: category.color,
            }}
          >
            <span>{category.icon}</span>
            {category.label}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {voice.author || '未署名'}
          </span>
          {(onDelete || onUpdate) && (
            <div className="flex items-center gap-1">
              {onUpdate && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={async () => {
                          await onUpdate(voice.id, { content: editContent, category: editCategory, status: editStatus });
                          setIsEditing(false);
                        }}
                        className="rounded p-1 text-green-600 transition-colors hover:bg-green-50"
                        title="保存"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditContent(voice.content);
                          setEditCategory(voice.category);
                          setEditStatus(voice.status || 'unresolved');
                        }}
                        className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted"
                        title="取消"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                      title="编辑"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                  )}
                </>
              )}
              {onDelete && !isEditing && (
                <button
                  onClick={() => onDelete(voice.id)}
                  className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="删除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-4 space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-background/50 p-3 text-sm text-foreground/90 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CATEGORY_MAP) as [VoiceCategory, { label: string; icon: string }][]).map(([key, { label, icon }]) => (
              <button
                key={key}
                onClick={() => setEditCategory(key)}
                className={`rounded-full px-3 py-1 text-xs transition-all ${
                  editCategory === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (onUpdate) {
                  await onUpdate(voice.id, { content: editContent, category: editCategory, status: editStatus });
                }
                setIsEditing(false);
              }}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
            >
              保存
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(voice.content);
                setEditCategory(voice.category);
                setEditStatus(voice.status || 'unresolved');
              }}
              className="rounded-lg bg-muted px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted/80"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-4 leading-relaxed text-foreground/90 text-[15px]">
          {voice.content}
        </p>
      )}

      {/* AI Reply */}
      {(aiReplyText || isStreaming) && (
        <div className="mb-4 rounded-xl bg-secondary/60 p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            >
              <path d="M12 2C6.48 2 2 6 2 10.5c0 2.5 1.5 4.8 3.8 6.2L4 22l4.5-2.3c1.1.3 2.3.5 3.5.5 5.52 0 10-4 10-8.5S17.52 2 12 2z" />
            </svg>
            <span className="text-xs font-medium text-accent">暖心回复</span>
            {isStreaming && (
              <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            {aiReplyText}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-accent align-middle" />
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onLike(voice.id)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
          {voice.likes}
        </button>

        {!voice.aiReply && !isStreaming && (
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (!isExpanded) handleAiReply();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            AI 暖心回复
          </button>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
