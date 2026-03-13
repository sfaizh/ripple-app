'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CopyButton } from '@/components/shared/CopyButton';
import { useToast } from '@/components/ui/toast';

interface UsernameEditProps {
  username: string;
  wallUrl: string;
}

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function UsernameEdit({ username, wallUrl }: UsernameEditProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username);
  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editing) return;

    if (value === username) {
      setAvailability('idle');
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setAvailability('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(value)}`);
        const json = await res.json();
        if (json.error) {
          setAvailability('invalid');
        } else {
          setAvailability(json.available ? 'available' : 'taken');
        }
      } catch {
        setAvailability('idle');
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, username, editing]);

  const handleEdit = () => {
    setValue(username);
    setAvailability('idle');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setValue(username);
    setAvailability('idle');
  };

  const handleSave = async () => {
    if (value === username) { setEditing(false); return; }
    if (availability !== 'available') return;

    setSaving(true);
    try {
      const res = await fetch('/api/users/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update username');
      }

      toast({ title: 'Username updated', description: `Your wall link is now /wall/${value}` });
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const canSave = value !== username && availability === 'available' && !saving;

  return (
    <div className="bg-gradient-to-r from-primary to-teal rounded-xl p-5 mb-8 text-white">
      <p className="font-semibold mb-1">Share your wall link</p>
      <p className="text-sm text-white/80 mb-3">
        Anyone with your link can send you an anonymous compliment.
      </p>

      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
            <span className="text-sm font-mono text-white/60">/wall/</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase())}
              className="bg-transparent border-none text-white placeholder-white/50 text-sm font-mono p-0 h-auto focus-visible:ring-0 flex-1"
              autoFocus
            />
            {availability === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-white/70 shrink-0" />}
            {availability === 'available' && <Check className="h-4 w-4 text-green-300 shrink-0" />}
            {(availability === 'taken' || availability === 'invalid') && <X className="h-4 w-4 text-red-300 shrink-0" />}
          </div>
          {availability === 'taken' && <p className="text-xs text-red-300">Username already taken</p>}
          {availability === 'invalid' && <p className="text-xs text-red-300">Invalid format (3–20 chars, letters/digits/underscores, start with letter)</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={!canSave}
              className="bg-white text-primary hover:bg-white/90 text-xs"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="text-white hover:bg-white/20 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
          <span className="text-sm font-mono truncate flex-1">/wall/{username}</span>
          <button
            onClick={handleEdit}
            className="text-white/70 hover:text-white transition-colors shrink-0"
            aria-label="Edit username"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <CopyButton text={wallUrl} label="Copy" />
        </div>
      )}
    </div>
  );
}
