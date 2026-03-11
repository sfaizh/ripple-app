'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RevealAnimation } from './RevealAnimation';

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
  onReveal?: (id: string) => Promise<void>;
  onReply?: (id: string) => void;
  showReplyButton?: boolean;
}

const categoryColors: Record<string, string> = {
  professional: 'bg-blue-100 text-blue-800 border-blue-200',
  creative: 'bg-purple-100 text-purple-800 border-purple-200',
  personal_growth: 'bg-green-100 text-green-800 border-green-200',
  just_because: 'bg-pink-100 text-pink-800 border-pink-200',
};

const categoryLabels: Record<string, string> = {
  professional: 'Professional',
  creative: 'Creative',
  personal_growth: 'Personal Growth',
  just_because: 'Just Because',
};

const cluePrefix: Record<string, string> = {
  linkedin: '💼 Someone who follows you on LinkedIn',
  company: '🏢 A colleague from your company',
  recent: '✨ Someone you met recently',
  generic: '💫 Someone special',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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

    if (onReveal) {
      await onReveal(compliment.id);
    }

    setTimeout(() => {
      setIsRevealed(true);
      setIsAnimating(false);
    }, 600);
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className={categoryColors[compliment.category]}>
          {categoryLabels[compliment.category]}
        </Badge>
        <div className="flex items-center gap-2">
          {!compliment.isRead && !isRevealed && (
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500" title="Unread" />
          )}
          <span className="text-xs text-gray-400">{timeAgo(compliment.createdAt)}</span>
        </div>
      </div>

      {/* Clue text */}
      <p className="text-sm text-gray-500 mb-4 italic">
        {compliment.clueText || cluePrefix[compliment.clueType]} said...
      </p>

      {/* Reveal */}
      <RevealAnimation
        isRevealed={isRevealed}
        isAnimating={isAnimating}
        onClick={handleReveal}
      >
        <p className="text-base leading-relaxed text-gray-800 py-2">{compliment.message}</p>
      </RevealAnimation>

      {/* Reply CTA */}
      {isRevealed && showReplyButton && onReply && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReply(compliment.id)}
            className="w-full"
          >
            Send one back ✨
          </Button>
        </div>
      )}
    </Card>
  );
}
