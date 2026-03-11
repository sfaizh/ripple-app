'use client';

import { EyeOff, Linkedin, Users, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ClueType = 'generic' | 'linkedin' | 'company' | 'recent';

interface ClueSelectorProps {
  value: ClueType;
  onChange: (clue: ClueType) => void;
}

const clues = [
  {
    value: 'generic' as const,
    label: 'Keep it mysterious',
    icon: EyeOff,
  },
  {
    value: 'linkedin' as const,
    label: 'LinkedIn connection',
    icon: Linkedin,
  },
  {
    value: 'company' as const,
    label: 'Colleague',
    icon: Users,
  },
  {
    value: 'recent' as const,
    label: 'Someone you met recently',
    icon: UserPlus,
  },
];

export function ClueSelector({ value, onChange }: ClueSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {clues.map((clue) => {
        const Icon = clue.icon;
        const isSelected = value === clue.value;
        return (
          <button
            key={clue.value}
            type="button"
            onClick={() => onChange(clue.value)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-all',
              'hover:border-primary hover:bg-surface-alt',
              isSelected
                ? 'border-primary bg-surface-alt'
                : 'border-border-subtle bg-surface'
            )}
          >
            <Icon
              className={cn('h-4 w-4 shrink-0', isSelected ? 'text-primary' : 'text-ink-muted')}
              strokeWidth={1.75}
            />
            <span className={cn('text-xs font-medium', isSelected ? 'text-ink' : 'text-ink-muted')}>
              {clue.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
