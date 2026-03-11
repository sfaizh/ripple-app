'use client';

import { Briefcase, Palette, Sprout, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Category = 'professional' | 'creative' | 'personal_growth' | 'just_because';

interface CategorySelectorProps {
  value: Category;
  onChange: (category: Category) => void;
}

const categories = [
  {
    value: 'professional' as const,
    label: 'Professional',
    icon: Briefcase,
    description: 'Work skills, leadership, teamwork',
  },
  {
    value: 'creative' as const,
    label: 'Creative',
    icon: Palette,
    description: 'Ideas, design, innovation',
  },
  {
    value: 'personal_growth' as const,
    label: 'Personal Growth',
    icon: Sprout,
    description: 'Character, values, resilience',
  },
  {
    value: 'just_because' as const,
    label: 'Just Because',
    icon: Heart,
    description: 'No reason needed!',
  },
];

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = value === category.value;
        return (
          <button
            key={category.value}
            type="button"
            onClick={() => onChange(category.value)}
            className={cn(
              'p-4 rounded-lg border-2 transition-all text-left',
              'hover:border-primary hover:bg-surface-alt',
              isSelected
                ? 'border-primary bg-surface-alt shadow-sm'
                : 'border-border-subtle bg-surface'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon
                className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-ink-muted')}
                strokeWidth={1.75}
              />
              <span className="font-medium text-sm text-ink">{category.label}</span>
            </div>
            <p className="text-xs text-ink-muted">{category.description}</p>
          </button>
        );
      })}
    </div>
  );
}
