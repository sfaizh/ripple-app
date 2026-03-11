'use client';

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
    icon: '💼',
    description: 'Work skills, leadership, teamwork',
  },
  {
    value: 'creative' as const,
    label: 'Creative',
    icon: '🎨',
    description: 'Ideas, design, innovation',
  },
  {
    value: 'personal_growth' as const,
    label: 'Personal Growth',
    icon: '🌱',
    description: 'Character, values, resilience',
  },
  {
    value: 'just_because' as const,
    label: 'Just Because',
    icon: '✨',
    description: 'No reason needed!',
  },
];

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((category) => (
        <button
          key={category.value}
          type="button"
          onClick={() => onChange(category.value)}
          className={cn(
            'p-4 rounded-lg border-2 transition-all text-left',
            'hover:border-purple-300 hover:bg-purple-50',
            value === category.value
              ? 'border-purple-500 bg-purple-50 shadow-md'
              : 'border-gray-200 bg-white'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{category.icon}</span>
            <span className="font-medium text-sm">{category.label}</span>
          </div>
          <p className="text-xs text-gray-500">{category.description}</p>
        </button>
      ))}
    </div>
  );
}
