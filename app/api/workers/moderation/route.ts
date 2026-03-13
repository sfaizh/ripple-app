import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { dequeue, ack, nack, enqueue } from '@/lib/queue/client';
import { db } from '@/lib/db/client';
import { compliments } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { users } from '@/lib/db/schema';
import { moderateWithGroq } from '@/lib/ai/moderation';

async function isAuthorized(): Promise<boolean> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  return authHeader === `Bearer ${process.env.WORKER_SECRET}`;
}

export async function POST() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let jobs: Awaited<ReturnType<typeof dequeue<{ complimentId: string; attempts?: number }>>>;

  try {
    jobs = await dequeue<{ complimentId: string; attempts?: number }>('moderation');
  } catch (error) {
    console.error('Failed to dequeue from moderation queue:', error);
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, error: 'Queue unavailable' });
  }

  const results = await Promise.allSettled(
    jobs.map(async ({ msg_id, message }) => {
      const { complimentId } = message;
      const attempts = (message.attempts ?? 0) + 1;

      try {
        const compliment = await db.query.compliments.findFirst({
          where: eq(compliments.id, complimentId),
        });

        if (!compliment) {
          await ack('moderation', msg_id);
          return { skipped: true, reason: 'not_found' };
        }

        // Idempotency: skip if already moderated
        if (compliment.moderationStatus !== 'pending') {
          await ack('moderation', msg_id);
          return { skipped: true, reason: 'already_moderated' };
        }

        // Dead-letter after 3 attempts
        if (attempts >= 3) {
          await db.update(compliments)
            .set({ moderationStatus: 'rejected', updatedAt: new Date() })
            .where(eq(compliments.id, complimentId));
          await ack('moderation', msg_id);
          return { rejected: true, reason: 'max_attempts' };
        }

        const moderation = await moderateWithGroq(compliment.message);

        await db.update(compliments)
          .set({
            moderationStatus: moderation.approved ? 'approved' : 'rejected',
            moderationResult: moderation,
            updatedAt: new Date(),
          })
          .where(eq(compliments.id, complimentId));

        if (moderation.approved) {
          // Increment recipient totalReceived
          await db.update(users)
            .set({ totalReceived: sql`${users.totalReceived} + 1`, updatedAt: new Date() })
            .where(eq(users.id, compliment.recipientId));

          // Notifications are now handled by Supabase webhooks
          // (webhook triggers Soketi push when moderation_status changes to 'approved')
        }

        await ack('moderation', msg_id);
        return { success: true, approved: moderation.approved };
      } catch (error) {
        // Re-enqueue with incremented attempt count
        try {
          await enqueue('moderation', { complimentId, attempts });
          await ack('moderation', msg_id);
        } catch {
          await nack('moderation', msg_id);
        }
        throw error;
      }
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ processed: jobs.length, succeeded, failed });
}
