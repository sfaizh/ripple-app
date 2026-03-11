'use client';

import { useState } from 'react';
import { Linkedin, Users, UserPlus, Sparkles } from 'lucide-react';
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
  professional: 'bg-[#dff0e7] text-[#3d405b] border-[#a0c5b3]',
  creative: 'bg-[#fde8e0] text-[#ab3f21] border-[#e7957e]',
  personal_growth: 'bg-[#f2efd9] text-[#3d405b] border-[#e6dfb3]',
  just_because: 'bg-[#fef0d3] text-[#875b10] border-[#f4d5a4]',
};

const categoryLabels: Record<string, string> = {
  professional: 'Professional',
  creative: 'Creative',
  personal_growth: 'Personal Growth',
  just_because: 'Just Because',
};

const clueConfig: Record<string, { icon: React.ElementType; label: string }> = {
  linkedin: { icon: Linkedin, label: 'Someone who follows you on LinkedIn' },
  company: { icon: Users, label: 'A colleague from your company' },
  recent: { icon: UserPlus, label: 'Someone you met recently' },
  generic: { icon: Sparkles, label: 'Someone special' },
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
    if (onReveal) await onReveal(compliment.id);
    setTimeout(() => {
      setIsRevealed(true);
      setIsAnimating(false);
    }, 600);
  };

  const clue = clueConfig[compliment.clueType];
  const ClueIcon = clue.icon;

  return (
    <Card className="p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className={categoryColors[compliment.category]}>
          {categoryLabels[compliment.category]}
        </Badge>
        <div className="flex items-center gap-2">
          {!compliment.isRead && !isRevealed && (
            <span className="inline-block w-2 h-2 rounded-full bg-primary" title="Unread" />
          )}
          <span className="text-xs text-ink-muted">{timeAgo(compliment.createdAt)}</span>
        </div>
      </div>

      {/* Clue */}
      <div className="flex items-center gap-1.5 text-sm text-ink-muted mb-4 italic">
        <ClueIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>{compliment.clueText || clue.label} said...</span>
      </div>

      {/* Reveal */}
      <RevealAnimation
        isRevealed={isRevealed}
        isAnimating={isAnimating}
        onClick={handleReveal}
      >
        <p className="text-base leading-relaxed text-ink py-2">{compliment.message}</p>
      </RevealAnimation>

      {/* Reply CTA */}
      {isRevealed && showReplyButton && onReply && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
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
