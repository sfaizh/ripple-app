import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'secondary';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'bg-purple-600 text-white': variant === 'default',
          'border border-current bg-transparent': variant === 'outline',
          'bg-gray-100 text-gray-800': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
