'use client';

import { useState } from 'react';
import { SendForm } from '@/components/compliment/SendForm';

interface WallSendFormProps {
  recipientUsername: string;
}

export function WallSendForm({ recipientUsername }: WallSendFormProps) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-ink mb-2">
          Compliment sent!
        </h3>
        <p className="text-ink-muted text-sm mb-6">
          Your kind words are on their way to @{recipientUsername}. It will appear in their inbox after AI review.
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-primary hover:underline text-sm font-medium"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <SendForm
      recipientUsername={recipientUsername}
      onSuccess={() => setSent(true)}
    />
  );
}
