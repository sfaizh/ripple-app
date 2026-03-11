import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { dequeue, ack, nack } from '@/lib/queue/client';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { soketiServer } from '@/lib/soketi/server';

async function isAuthorized(): Promise<boolean> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  return authHeader === `Bearer ${process.env.WORKER_SECRET}`;
}

type NotificationJob =
  | { type: 'realtime'; recipientId: string }
  | { type: 'email'; complimentId: string; recipientId: string };

export async function POST() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let jobs: Awaited<ReturnType<typeof dequeue<NotificationJob>>>;

  try {
    jobs = await dequeue<NotificationJob>('notifications');
  } catch (error) {
    console.error('Failed to dequeue from notifications queue:', error);
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, error: 'Queue unavailable' });
  }

  const results = await Promise.allSettled(
    jobs.map(async ({ msg_id, message }) => {
      try {
        if (message.type === 'realtime') {
          try {
            await soketiServer.trigger(
              `private-user-${message.recipientId}`,
              'new-compliment',
              {
                message: 'You have a secret compliment waiting',
                timestamp: new Date().toISOString(),
              }
            );
          } catch (err) {
            console.error('Soketi push failed (non-fatal):', err);
          }
        }

        if (message.type === 'email') {
          const user = await db.query.users.findFirst({
            where: eq(users.id, message.recipientId),
          });

          if (user?.emailNotifications) {
            // Email sending skipped (Resend not configured)
            console.log(`Email notification skipped for user ${user.username} (Resend not configured)`);
          }
        }

        await ack('notifications', msg_id);
        return { success: true };
      } catch (error) {
        await nack('notifications', msg_id);
        throw error;
      }
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ processed: jobs.length, succeeded, failed });
}
