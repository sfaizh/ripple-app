'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

interface SoketiProviderProps {
  userId: string | null;
  children: React.ReactNode;
}

export function SoketiProvider({ userId, children }: SoketiProviderProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const soketiKey = process.env.NEXT_PUBLIC_SOKETI_KEY;
    const soketiHost = process.env.NEXT_PUBLIC_SOKETI_HOST;

    // Soketi not configured yet — skip silently
    if (!soketiKey || !soketiHost) return;

    let pusher: import('pusher-js').default | null = null;

    import('pusher-js').then(({ default: Pusher }) => {
      // Soketi is Pusher-compatible; cluster is required by types but ignored by Soketi
      const options = {
        wsHost: soketiHost,
        wsPort: parseInt(process.env.NEXT_PUBLIC_SOKETI_PORT || '443'),
        forceTLS: process.env.NEXT_PUBLIC_SOKETI_ENCRYPTED !== 'false',
        disableStats: true,
        enabledTransports: ['ws', 'wss'] as ('ws' | 'wss')[],
        authEndpoint: '/api/soketi/auth',
        cluster: 'mt1', // required by types, ignored by Soketi
      };
      pusher = new Pusher(soketiKey, options);

      const channel = pusher!.subscribe(`private-user-${userId}`);

      channel.bind('new-compliment', (data: { message: string }) => {
        toast({
          title: '✨ New compliment!',
          description: data.message,
          duration: 5000,
        });
      });
    });

    return () => {
      if (pusher) {
        pusher.unsubscribe(`private-user-${userId}`);
        pusher.disconnect();
      }
    };
  }, [userId, toast]);

  return <>{children}</>;
}
