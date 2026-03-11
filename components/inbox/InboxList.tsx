'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ComplimentCard } from '@/components/compliment/ComplimentCard';
import { InboxFilter } from './InboxFilter';
import { Skeleton } from '@/components/ui/skeleton';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function InboxList() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const url = `/api/compliments/inbox${filter === 'unread' ? '?unread=true' : ''}`;
  const { data, isLoading, mutate } = useSWR(url, fetcher);

  const handleReveal = async (id: string) => {
    await fetch(`/api/compliments/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    });
    mutate();
  };

  if (isLoading) {
    return (
      <div>
        <InboxFilter value={filter} onChange={setFilter} />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const compliments = data?.compliments || [];

  return (
    <div>
      <InboxFilter value={filter} onChange={setFilter} />

      {compliments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">💌</p>
          <p className="text-gray-500 font-medium mb-2">No compliments yet</p>
          <p className="text-sm text-gray-400">
            Share your wall link to start receiving kind words!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {compliments.map((compliment: Parameters<typeof ComplimentCard>[0]['compliment']) => (
            <ComplimentCard
              key={compliment.id}
              compliment={compliment}
              onReveal={handleReveal}
              showReplyButton={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
