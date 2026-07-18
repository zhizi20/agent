'use client';

import { useState } from 'react';
import { CATEGORY_MAP } from '@/lib/types';
import type { FeedbackCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Send, X } from 'lucide-react';

interface VoiceFormProps {
  onSubmit: (data: { category: FeedbackCategory; title: string; description: string; department: string }) => void;
  onCancel: () => void;
}

export function VoiceForm({ onSubmit, onCancel }: VoiceFormProps) {
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({ category, title, description, department });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">提交员工反馈</h3>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">问题类别</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_MAP) as FeedbackCategory[]).map((cat) => {
            const info = CATEGORY_MAP[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  category === cat
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">标题（可选）</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="简要描述问题"
          className="rounded-xl"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">反馈内容 *</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="请详细描述您遇到的问题或建议..."
          className="min-h-[120px] rounded-xl resize-none"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">所在部门（可选）</label>
        <Input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="如：智能总装一厂"
          className="rounded-xl"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">
          取消
        </Button>
        <Button
          type="submit"
          disabled={submitting || !description.trim()}
          className="bg-gradient-to-r from-amber-500 to-coral-500 hover:from-amber-600 hover:to-coral-600 text-white rounded-xl"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          提交
        </Button>
      </div>
    </form>
  );
}
