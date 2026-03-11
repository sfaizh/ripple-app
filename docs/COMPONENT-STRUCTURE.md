# Ripple - Component Structure Documentation

## Overview

This document describes the key UI components for the Ripple platform.

**Component Library**: shadcn/ui (Radix UI primitives) + custom components

---

## Component Hierarchy

```
app/
├── layout.tsx (Root layout with Soketi subscription)
├── page.tsx (Homepage)
├── (auth)/
│   ├── signin/page.tsx
│   └── signup/page.tsx
├── wall/[username]/page.tsx (User wall)
├── inbox/page.tsx (User inbox)
├── trending/page.tsx (Trending wall)
└── settings/page.tsx

components/
├── ui/ (shadcn components)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── skeleton.tsx
│   └── toast.tsx
├── compliment/
│   ├── ComplimentCard.tsx
│   ├── RevealAnimation.tsx
│   ├── SendForm.tsx
│   └── CategorySelector.tsx
├── wall/
│   ├── UserWall.tsx
│   └── ShareWallButton.tsx
├── inbox/
│   ├── InboxList.tsx
│   └── InboxFilter.tsx
├── trending/
│   └── TrendingFeed.tsx
├── settings/
│   ├── ThemeSelector.tsx
│   └── NotificationSettings.tsx
└── shared/
    ├── Navbar.tsx
    ├── Footer.tsx
    └── SoketiProvider.tsx
```

---

## Core Components

### 1. ComplimentCard

**Purpose**: Displays a single compliment with reveal animation

**File**: `components/compliment/ComplimentCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RevealAnimation } from './RevealAnimation';
import { formatDistanceToNow } from 'date-fns';

interface Compliment {
  id: string;
  category: 'professional' | 'creative' | 'personal_growth' | 'just_because';
  message: string;
  clueType: 'linkedin' | 'company' | 'recent' | 'generic';
  clueText: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface ComplimentCardProps {
  compliment: Compliment;
  onReveal?: (id: string) => void;
  onReply?: (id: string) => void;
  showReplyButton?: boolean;
}

const categoryColors = {
  professional: 'bg-blue-100 text-blue-800 border-blue-200',
  creative: 'bg-purple-100 text-purple-800 border-purple-200',
  personal_growth: 'bg-green-100 text-green-800 border-green-200',
  just_because: 'bg-pink-100 text-pink-800 border-pink-200',
};

const categoryLabels = {
  professional: 'Professional',
  creative: 'Creative',
  personal_growth: 'Personal Growth',
  just_because: 'Just Because',
};

export function ComplimentCard({
  compliment,
  onReveal,
  onReply,
  showReplyButton = false,
}: ComplimentCardProps) {
  const [isRevealed, setIsRevealed] = useState(compliment.isRead);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleReveal = async () => {
    if (isRevealed || isAnimating) return;

    setIsAnimating(true);

    // Call API to mark as read
    if (onReveal) {
      await onReveal(compliment.id);
    }

    // Wait for animation to complete
    setTimeout(() => {
      setIsRevealed(true);
      setIsAnimating(false);
    }, 600);
  };

  const cluePrefix = {
    linkedin: '💼 Someone who follows you on LinkedIn',
    company: '🏢 A colleague from your company',
    recent: '✨ Someone you met recently',
    generic: '💫 Someone special',
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      {/* Header: Category Badge + Timestamp */}
      <div className="flex items-center justify-between mb-4">
        <Badge
          variant="outline"
          className={categoryColors[compliment.category]}
        >
          {categoryLabels[compliment.category]}
        </Badge>
        <span className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(compliment.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>

      {/* Clue Text */}
      <p className="text-sm text-gray-600 mb-4 italic">
        {compliment.clueText || cluePrefix[compliment.clueType]} said...
      </p>

      {/* Compliment Message with Reveal Animation */}
      <RevealAnimation
        isRevealed={isRevealed}
        isAnimating={isAnimating}
        onClick={handleReveal}
      >
        <p className="text-lg leading-relaxed">{compliment.message}</p>
      </RevealAnimation>

      {/* Actions: Reply Button (if revealed) */}
      {isRevealed && showReplyButton && onReply && (
        <div className="mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onReply(compliment.id)}
            className="w-full"
          >
            Send one back
          </Button>
        </div>
      )}
    </Card>
  );
}
```

**Props:**
- `compliment`: Compliment object from API
- `onReveal`: Callback when user clicks to reveal (calls API to mark as read)
- `onReply`: Callback when user clicks reply button
- `showReplyButton`: Whether to show "Send one back" button after reveal

**States:**
- `isRevealed`: Whether compliment is currently visible (no blur)
- `isAnimating`: Whether reveal animation is in progress

**Styling:**
- Category-based color coding for badges
- Responsive design (mobile-first)
- Hover effects for interactivity

---

### 2. RevealAnimation

**Purpose**: Beautiful blur-to-clear animation wrapper

**File**: `components/compliment/RevealAnimation.tsx`

```typescript
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RevealAnimationProps {
  children: React.ReactNode;
  isRevealed: boolean;
  isAnimating: boolean;
  onClick: () => void;
}

export function RevealAnimation({
  children,
  isRevealed,
  isAnimating,
  onClick,
}: RevealAnimationProps) {
  return (
    <motion.div
      className={cn(
        'relative cursor-pointer select-none',
        !isRevealed && 'hover:scale-[1.02] transition-transform'
      )}
      onClick={onClick}
      initial={false}
      animate={{
        filter: isRevealed ? 'blur(0px)' : 'blur(8px)',
        opacity: isRevealed ? 1 : 0.7,
        scale: isAnimating ? [1, 0.98, 1] : 1,
      }}
      transition={{
        filter: { duration: 0.5, ease: 'easeOut' },
        opacity: { duration: 0.3, ease: 'easeOut' },
        scale: { duration: 0.4, ease: 'easeInOut' },
      }}
    >
      {/* Blur overlay with "Click to reveal" text */}
      {!isRevealed && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg"
          initial={{ opacity: 1 }}
          animate={{ opacity: isAnimating ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center">
            <p className="text-sm font-medium text-purple-600 mb-1">
              Click to reveal
            </p>
            <p className="text-xs text-purple-400">✨ Your secret awaits ✨</p>
          </div>
        </motion.div>
      )}

      {/* Actual content */}
      <div className={cn(!isRevealed && 'pointer-events-none')}>
        {children}
      </div>
    </motion.div>
  );
}
```

**Animation Sequence:**
1. **Before reveal**: Blur filter (8px), overlay with "Click to reveal" text
2. **On click**:
   - Blur: 8px → 0px (500ms)
   - Opacity: 0.7 → 1 (300ms)
   - Scale: 1 → 0.98 → 1 (400ms, slight "pop" effect)
   - Overlay fades out (300ms)
3. **After reveal**: Clear, no blur, full opacity

**Optional Enhancement**: Confetti effect on reveal (use `canvas-confetti` library)

---

### 3. SendForm

**Purpose**: Form for sending compliments

**File**: `components/compliment/SendForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CategorySelector } from './CategorySelector';
import { toast } from '@/components/ui/use-toast';

const sendFormSchema = z.object({
  recipientUsername: z.string().min(1),
  category: z.enum(['professional', 'creative', 'personal_growth', 'just_because']),
  message: z.string().min(1).max(280, 'Message must be under 280 characters'),
  clueType: z.enum(['linkedin', 'company', 'recent', 'generic']).optional(),
});

type SendFormData = z.infer<typeof sendFormSchema>;

interface SendFormProps {
  recipientUsername: string;
  onSuccess?: () => void;
}

export function SendForm({ recipientUsername, onSuccess }: SendFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SendFormData>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: {
      recipientUsername,
      category: 'just_because',
      message: '',
      clueType: 'generic',
    },
  });

  const messageLength = form.watch('message')?.length || 0;

  const onSubmit = async (data: SendFormData) => {
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/compliments/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      toast({
        title: 'Compliment sent! ✨',
        description: 'Your kind words are on their way.',
      });

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Failed to send',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Category Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          What type of compliment?
        </label>
        <CategorySelector
          value={form.watch('category')}
          onChange={(category) => form.setValue('category', category)}
        />
      </div>

      {/* Message Textarea */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Your message
        </label>
        <Textarea
          {...form.register('message')}
          placeholder="Write something kind..."
          rows={4}
          className="resize-none"
          maxLength={280}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Be specific and genuine. What did they do that stood out?
          </p>
          <p
            className={cn(
              'text-xs',
              messageLength > 260 ? 'text-red-500' : 'text-gray-400'
            )}
          >
            {messageLength}/280
          </p>
        </div>
      </div>

      {/* Clue Type Selector (Optional) */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Give them a clue? (Optional)
        </label>
        <select
          {...form.register('clueType')}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="generic">Keep it mysterious</option>
          <option value="linkedin">LinkedIn connection</option>
          <option value="company">Colleague</option>
          <option value="recent">Someone they met recently</option>
        </select>
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Compliment ✨'}
      </Button>
    </form>
  );
}
```

**Features:**
- React Hook Form + Zod validation
- Character counter (280 max)
- Category selector with visual buttons
- Clue type dropdown
- Success/error toast notifications
- Auto-reset on success

---

### 4. CategorySelector

**Purpose**: Visual category selection buttons

**File**: `components/compliment/CategorySelector.tsx`

```typescript
'use client';

import { cn } from '@/lib/utils';

type Category = 'professional' | 'creative' | 'personal_growth' | 'just_because';

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
            <span className="text-2xl">{category.icon}</span>
            <span className="font-medium">{category.label}</span>
          </div>
          <p className="text-xs text-gray-500">{category.description}</p>
        </button>
      ))}
    </div>
  );
}
```

**Design:**
- 2x2 grid layout
- Icon + label for each category
- Active state with purple border/background
- Hover effects

---

### 5. InboxList

**Purpose**: Display list of received compliments

**File**: `components/inbox/InboxList.tsx`

```typescript
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ComplimentCard } from '@/components/compliment/ComplimentCard';
import { InboxFilter } from './InboxFilter';
import { Skeleton } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function InboxList() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading, mutate } = useSWR(
    `/api/compliments/inbox?${filter === 'unread' ? 'unread=true' : ''}`,
    fetcher
  );

  const handleReveal = async (id: string) => {
    // Mark as read
    await fetch(`/api/compliments/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    });

    // Refresh data
    mutate();
  };

  const handleReply = (id: string) => {
    // Navigate to reply page (future feature)
    console.log('Reply to:', id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  const compliments = data?.compliments || [];

  return (
    <div>
      {/* Filter Tabs */}
      <InboxFilter value={filter} onChange={setFilter} />

      {/* Compliment List */}
      {compliments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No compliments yet.</p>
          <p className="text-sm text-gray-400">
            Share your wall link to start receiving kind words!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {compliments.map((compliment: any) => (
            <ComplimentCard
              key={compliment.id}
              compliment={compliment}
              onReveal={handleReveal}
              onReply={handleReply}
              showReplyButton={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Features:**
- SWR for data fetching (auto-revalidation)
- Filter tabs (All / Unread)
- Loading skeletons
- Empty state
- Auto-refresh on reveal

---

### 6. ThemeSelector

**Purpose**: Allow users to select wall theme

**File**: `components/settings/ThemeSelector.tsx`

```typescript
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

type Theme = 'default' | 'sunset' | 'ocean';

const themes = [
  {
    value: 'default' as const,
    label: 'Purple Dream',
    gradient: 'bg-gradient-to-br from-purple-500 to-pink-500',
  },
  {
    value: 'sunset' as const,
    label: 'Sunset Glow',
    gradient: 'bg-gradient-to-br from-orange-400 to-pink-400',
  },
  {
    value: 'ocean' as const,
    label: 'Ocean Breeze',
    gradient: 'bg-gradient-to-br from-teal-400 to-blue-500',
  },
];

interface ThemeSelectorProps {
  currentTheme: Theme;
}

export function ThemeSelector({ currentTheme }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const res = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme }),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast({
        title: 'Theme updated!',
        description: 'Your wall will now use the new theme.',
      });
    } catch (error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Wall Theme</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {themes.map((theme) => (
          <button
            key={theme.value}
            type="button"
            onClick={() => setSelectedTheme(theme.value)}
            className={cn(
              'relative aspect-video rounded-lg overflow-hidden',
              'border-2 transition-all',
              selectedTheme === theme.value
                ? 'border-purple-500 ring-2 ring-purple-200'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className={cn('w-full h-full', theme.gradient)} />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
              <p className="text-xs font-medium">{theme.label}</p>
            </div>
          </button>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving || selectedTheme === currentTheme}
      >
        {isSaving ? 'Saving...' : 'Save Theme'}
      </Button>
    </div>
  );
}
```

**Features:**
- Visual theme previews with gradients
- Active state with ring/border
- Save button (disabled if unchanged)

---

### 7. SoketiProvider

**Purpose**: Real-time notification subscription via Soketi

**File**: `components/shared/SoketiProvider.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import Pusher from 'pusher-js'; // Soketi is Pusher-compatible
import { toast } from '@/components/ui/use-toast';

interface SoketiProviderProps {
  userId: string | null;
  children: React.ReactNode;
}

export function SoketiProvider({ userId, children }: SoketiProviderProps) {
  useEffect(() => {
    if (!userId) return;

    const soketi = new Pusher(process.env.NEXT_PUBLIC_SOKETI_KEY!, {
      wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST!,
      wsPort: parseInt(process.env.NEXT_PUBLIC_SOKETI_PORT || '6001'),
      forceTLS: true,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: '/api/soketi/auth',
    });

    const channel = soketi.subscribe(`private-user-${userId}`);

    channel.bind('new-compliment', (data: any) => {
      toast({
        title: '✨ New compliment!',
        description: data.message,
        duration: 5000,
      });

      // Optional: Play notification sound
      if (typeof Audio !== 'undefined') {
        new Audio('/notification.mp3').play();
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      soketi.disconnect();
    };
  }, [userId]);

  return <>{children}</>;
}
```

**Usage in Root Layout:**

```typescript
// app/layout.tsx
import { SoketiProvider } from '@/components/shared/SoketiProvider';
import { auth } from '@/lib/auth';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html>
      <body>
        <SoketiProvider userId={session?.user?.id || null}>
          {children}
        </SoketiProvider>
      </body>
    </html>
  );
}
```

---

## Responsive Design

All components follow mobile-first design:

```css
/* Tailwind breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

**Example: ComplimentCard responsive padding**
```tsx
<Card className="p-4 sm:p-6 lg:p-8">
  {/* Content */}
</Card>
```

---

## Accessibility

All components follow WCAG 2.1 Level AA:

1. **Keyboard navigation**: All interactive elements accessible via Tab/Enter
2. **ARIA labels**: Descriptive labels for screen readers
3. **Color contrast**: Minimum 4.5:1 ratio
4. **Focus indicators**: Visible focus rings
5. **Semantic HTML**: Proper heading hierarchy, landmarks

**Example: Focus styles**
```tsx
<button className="focus:ring-2 focus:ring-purple-500 focus:outline-none">
  Click me
</button>
```

---

## Performance Optimization

### Code Splitting
```tsx
// Lazy load heavy components
const TrendingFeed = dynamic(() => import('@/components/trending/TrendingFeed'), {
  loading: () => <Skeleton className="h-96" />,
  ssr: false,
});
```

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/avatar.png"
  alt="User avatar"
  width={48}
  height={48}
  className="rounded-full"
/>
```

### Memo for Expensive Renders
```tsx
const ComplimentCard = React.memo(ComplimentCardComponent);
```

---

## Testing Components

### Unit Tests (Jest + React Testing Library)

```typescript
// __tests__/components/ComplimentCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComplimentCard } from '@/components/compliment/ComplimentCard';

describe('ComplimentCard', () => {
  const mockCompliment = {
    id: '1',
    category: 'professional',
    message: 'Great job!',
    clueType: 'generic',
    clueText: null,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  };

  it('should show blur overlay when not revealed', () => {
    render(<ComplimentCard compliment={mockCompliment} />);
    expect(screen.getByText('Click to reveal')).toBeInTheDocument();
  });

  it('should call onReveal when clicked', () => {
    const onReveal = jest.fn();
    render(<ComplimentCard compliment={mockCompliment} onReveal={onReveal} />);

    fireEvent.click(screen.getByText('Click to reveal'));
    expect(onReveal).toHaveBeenCalledWith('1');
  });
});
```

---

## Conclusion

This component structure is designed for:
1. **Reusability**: Shared components used across pages
2. **Type safety**: TypeScript interfaces for all props
3. **Accessibility**: WCAG 2.1 Level AA compliance
4. **Performance**: Code splitting, memoization, lazy loading
5. **Developer experience**: Clear naming, documentation, tests
