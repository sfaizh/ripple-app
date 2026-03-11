'use client';

import { cn } from '@/lib/utils';

interface InboxFilterProps {
  value: 'all' | 'unread';
  onChange: (value: 'all' | 'unread') => void;
}

export function InboxFilter({ value, onChange }: InboxFilterProps) {
  return (
    <div className="flex gap-1 mb-6 border-b border-border-subtle pb-4">
      {(['all', 'unread'] as const).map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
            value === filter
              ? 'bg-surface-alt text-primary border border-border-subtle'
              : 'text-ink-muted hover:text-ink hover:bg-surface-alt'
          )}
        >
          {filter === 'all' ? 'All' : 'Unread'}
        </button>
      ))}
    </div>
  );
}
