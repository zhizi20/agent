'use client';

import { useState, useRef, useEffect } from 'react';
import { CATEGORY_MAP } from '@/lib/types';
import type { Feedback } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles, User, Building2, Clock, CheckCircle2 } from 'lucide-react';

interface VoiceCardProps {
  feedback: Feedback;
  onUpdate: () => void;
}

export function VoiceCard({ feedback, onUpdate }: VoiceCardProps) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const replyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    replyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replyText]);

  const handleAIReply = async () => {
    setReplying(true);
    setStreaming(true);
    setReplyText('');

    try {
      const res = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: { id: feedback.id } }),
      });

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
              setReplyText(fullText);
            }
            if (data.done) {
              onUpdate();
            }
            if (data.error) {
              setReplyText(`生成失败：${data.error}`);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setReplyText('生成失败，请稍后重试');
    } finally {
      setStreaming(false);
    }
  };

  const catInfo = CATEGORY_MAP[feedback.category];
  const displayReply = replyText || feedback.result || '';

  return (
    <Card className="rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={`${catInfo?.color || 'bg-gray-100 text-gray-700'}`} variant="secondary">
              {catInfo?.label || '其他'}
            </Badge>
            {feedback.factory && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {feedback.factory}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(feedback.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* Title */}
        {feedback.title && (
          <h3 className="font-semibold text-gray-900 mb-2">{feedback.title}</h3>
        )}

        {/* Content */}
        <p className="text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">
          {feedback.description}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {feedback.department || '匿名'}
          </span>
          {feedback.handler && (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已处理
            </span>
          )}
        </div>

        {/* AI Reply Section */}
        {displayReply && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">处理回复</span>
            </div>
            <div className="bg-gradient-to-br from-amber-50/50 to-coral-50/50 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {displayReply}
                {streaming && <span className="inline-block w-1.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-middle" />}
              </p>
              <div ref={replyEndRef} />
            </div>
          </div>
        )}

        {/* Actions */}
        {!displayReply && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button
              onClick={handleAIReply}
              disabled={streaming}
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
            >
              {streaming ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  生成处理建议
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
