'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Wall link copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-primary hover:text-primary-dark font-medium shrink-0 transition-colors cursor-pointer"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
