'use client';

import type { VoiceCategory } from '@/lib/types';
import { CATEGORY_MAP } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selected: VoiceCategory | 'all';
  onChange: (category: VoiceCategory | 'all') => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const categories = Object.entries(CATEGORY_MAP) as [
    VoiceCategory,
    (typeof CATEGORY_MAP)[VoiceCategory],
  ][];

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange('all')}
        className={cn(
          'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
          selected === 'all'
            ? 'bg-foreground text-background shadow-sm'
            : 'bg-secondary text-muted-foreground hover:text-foreground'
        )}
      >
        全部
      </button>
      {categories.map(([key, val]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
            selected === key
              ? 'shadow-sm ring-1 ring-offset-1'
              : 'opacity-60 hover:opacity-100'
          )}
          style={{
            backgroundColor: selected === key ? `${val.color}20` : `${val.color}10`,
            color: val.color,
            ...(selected === key ? { boxShadow: `0 0 0 1px ${val.color}40` } : {}),
          }}
        >
          <span>{val.icon}</span>
          {val.label}
        </button>
      ))}
    </div>
  );
}
