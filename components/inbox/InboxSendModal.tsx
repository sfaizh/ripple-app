'use client';

import { useState } from 'react';
import { WallSendForm } from '@/components/wall/WallSendForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function InboxSendModal() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'username' | 'form'>('username');

  function handleClose() {
    setOpen(false);
    setUsername('');
    setStep('username');
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Send a Compliment ✨</Button>;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl border border-border-subtle shadow-lg w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Send a Compliment</h2>
          <button
            onClick={handleClose}
            className="text-ink-muted hover:text-ink text-xl leading-none"
          >
            ×
          </button>
        </div>

        {step === 'username' ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">Who would you like to compliment?</p>
            <Input
              placeholder="Enter their username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && username.trim() && setStep('form')
              }
            />
            <Button
              className="w-full"
              disabled={!username.trim()}
              onClick={() => setStep('form')}
            >
              Continue
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-ink-muted mb-4">
              Sending to{' '}
              <span className="font-medium text-ink">@{username}</span>
              <button
                onClick={() => setStep('username')}
                className="ml-2 text-primary hover:underline text-xs"
              >
                change
              </button>
            </p>
            <WallSendForm recipientUsername={username} onSent={handleClose} />
          </div>
        )}
      </div>
    </div>
  );
}
