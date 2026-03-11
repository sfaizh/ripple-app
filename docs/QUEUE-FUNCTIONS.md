# Ripple - Async Queue Workers Documentation

## Overview

Async processing uses **Supabase's native PostgreSQL queue** (`pgmq` extension) instead of a third-party service. Workers are Next.js API routes triggered by Vercel Cron. Scheduled tasks use Supabase `pg_cron`.

All worker logic lives in `lib/workers/`.

---

## Queue Setup

### Enable Extensions (SQL migration)

```sql
-- Run once in Supabase SQL editor
create extension if not exists pgmq;
create extension if not exists pg_cron;

-- Create queues
select pgmq.create('moderation');
select pgmq.create('notifications');
```

### Queue Client Helper

```typescript
// lib/queue/client.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only
);

export async function enqueue<T>(queue: string, payload: T, delaySeconds = 0) {
  const { error } = await supabase.rpc('pgmq_send', {
    queue_name: queue,
    msg: payload,
    sleep_seconds: delaySeconds,
  });

  if (error) throw new Error(`Failed to enqueue to ${queue}: ${error.message}`);
}

export async function dequeue<T>(queue: string, visibilitySeconds = 30, batchSize = 5) {
  const { data, error } = await supabase.rpc('pgmq_read', {
    queue_name: queue,
    vt: visibilitySeconds,
    qty: batchSize,
  });

  if (error) throw new Error(`Failed to dequeue from ${queue}: ${error.message}`);
  return (data ?? []) as Array<{ msg_id: number; message: T }>;
}

export async function ack(queue: string, msgId: number) {
  await supabase.rpc('pgmq_archive', { queue_name: queue, msg_id: msgId });
}

export async function nack(queue: string, msgId: number) {
  // Make message immediately visible again for retry
  await supabase.rpc('pgmq_set_vt', { queue_name: queue, msg_id: msgId, vt: 0 });
}
```

---

## Enqueueing Jobs

```typescript
// In POST /api/compliments/send (after inserting compliment)
import { enqueue } from '@/lib/queue/client';

await enqueue('moderation', { complimentId: newCompliment.id });
```

---

## Worker 1: Moderation Worker

**Purpose**: AI moderation of compliments using Groq API (llama-3.1-8b-instant), then trigger notifications

**Trigger**: Vercel Cron every minute → `POST /api/workers/moderation`

**File**: `app/api/workers/moderation/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { dequeue, ack, nack } from '@/lib/queue/client';
import { db } from '@/lib/db/client';
import { compliments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { moderateWithGroq } from '@/lib/ai/moderation';
import { enqueue } from '@/lib/queue/client';

// Protect worker routes from public access
function isAuthorized() {
  const authHeader = headers().get('authorization');
  return authHeader === `Bearer ${process.env.WORKER_SECRET}`;
}

export async function POST() {
  if (!isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobs = await dequeue<{ complimentId: string }>('moderation');

  const results = await Promise.allSettled(
    jobs.map(async ({ msg_id, message }) => {
      const { complimentId } = message;

      try {
        // Fetch compliment
        const compliment = await db.query.compliments.findFirst({
          where: eq(compliments.id, complimentId),
        });

        if (!compliment) throw new Error(`Compliment ${complimentId} not found`);

        // Skip if already moderated (idempotency)
        if (compliment.moderationStatus !== 'pending') {
          await ack('moderation', msg_id);
          return { skipped: true };
        }

        // Run Groq moderation
        const moderation = await moderateWithGroq(compliment.message);

        // Update status
        await db.update(compliments)
          .set({
            moderationStatus: moderation.approved ? 'approved' : 'rejected',
            moderationResult: moderation,
            updatedAt: new Date(),
          })
          .where(eq(compliments.id, complimentId));

        // If approved, enqueue notifications
        if (moderation.approved) {
          await Promise.all([
            enqueue('notifications', {
              type: 'email',
              complimentId,
              recipientId: compliment.recipientId,
            }),
            enqueue('notifications', {
              type: 'realtime',
              recipientId: compliment.recipientId,
            }),
          ]);
        }

        await ack('moderation', msg_id);
        return { success: true, approved: moderation.approved };

      } catch (error) {
        // Nack: make message visible again for retry
        await nack('moderation', msg_id);
        throw error;
      }
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ processed: jobs.length, succeeded, failed });
}
```

**Moderation Logic** (`lib/ai/moderation.ts`):

```typescript
import Groq from 'groq-sdk';

export interface ModerationResult {
  approved: boolean;
  reason: string;
  categories: {
    abuse: number;
    sexual: number;
    toxic: number;
    dangerous: number;
    hate: number;
  };
}

export async function moderateWithGroq(message: string): Promise<ModerationResult> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `
Analyze the following compliment message for safety. Flag if it contains:
- Abuse or harassment
- Sexual content
- Toxic or mean-spirited language
- Dangerous or harmful content
- Hate speech or discrimination

Return a JSON response with this exact format:
{
  "approved": true/false,
  "reason": "Brief explanation",
  "categories": {
    "abuse": 0.0-1.0,
    "sexual": 0.0-1.0,
    "toxic": 0.0-1.0,
    "dangerous": 0.0-1.0,
    "hate": 0.0-1.0
  }
}

Compliment message:
"${message}"
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid Groq response format');

  const moderation: ModerationResult = JSON.parse(jsonMatch[0]);

  // Reject if any category score > 0.5
  const maxScore = Math.max(...Object.values(moderation.categories));
  if (maxScore > 0.5) {
    moderation.approved = false;
    moderation.reason = `Content flagged: ${Object.entries(moderation.categories)
      .filter(([_, score]) => score > 0.5)
      .map(([category]) => category)
      .join(', ')}`;
  }

  return moderation;
}
```

---

## Worker 2: Notification Worker

**Purpose**: Send real-time Soketi notifications (and optional email) after moderation approval

**Trigger**: Vercel Cron every minute → `POST /api/workers/notifications`

**File**: `app/api/workers/notifications/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { dequeue, ack, nack } from '@/lib/queue/client';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { soketiServer } from '@/lib/soketi/server';

function isAuthorized() {
  const authHeader = headers().get('authorization');
  return authHeader === `Bearer ${process.env.WORKER_SECRET}`;
}

type NotificationJob =
  | { type: 'realtime'; recipientId: string }
  | { type: 'email'; complimentId: string; recipientId: string };

export async function POST() {
  if (!isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobs = await dequeue<NotificationJob>('notifications');

  const results = await Promise.allSettled(
    jobs.map(async ({ msg_id, message }) => {
      try {
        if (message.type === 'realtime') {
          // Soketi real-time push (fire-and-forget, don't fail on error)
          try {
            await soketiServer.trigger(
              `private-user-${message.recipientId}`,
              'new-compliment',
              { message: 'You have a secret compliment waiting', timestamp: new Date().toISOString() }
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
            const { sendEmail } = await import('@/lib/email/resend');
            await sendEmail({
              to: user.email,
              subject: 'You have a secret compliment waiting',
              template: 'new-compliment',
              data: {
                username: user.username,
                complimentId: message.complimentId,
                inboxUrl: `${process.env.NEXT_PUBLIC_APP_URL}/inbox`,
              },
            });
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

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ processed: jobs.length, succeeded, failed });
}
```

**Soketi Server Setup** (`lib/soketi/server.ts`):

```typescript
import Pusher from 'pusher'; // server-side Pusher SDK (Soketi-compatible)

export const soketiServer = new Pusher({
  appId: process.env.SOKETI_APP_ID!,
  key: process.env.NEXT_PUBLIC_SOKETI_KEY!,
  secret: process.env.SOKETI_SECRET!,
  host: process.env.SOKETI_HOST!, // your-app.fly.dev
  port: process.env.SOKETI_PORT || '6001',
  useTLS: true,
});
```

---

## Scheduled Task: Daily Streak Check

**Purpose**: Track user streaks and emit streak milestone rewards

**Trigger**: `pg_cron` runs SQL at midnight UTC daily (no external service needed)

### pg_cron Setup (SQL)

```sql
-- Run once in Supabase SQL editor
select cron.schedule(
  'daily-streak-check',
  '0 0 * * *', -- midnight UTC
  $$
    select net.http_post(
      url := current_setting('app.base_url') || '/api/workers/daily-streak',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.worker_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

> **Note**: Set `app.base_url` and `app.worker_secret` via Supabase's `ALTER DATABASE ... SET` or use the Supabase dashboard under Database → Configuration.

Alternatively, use Vercel Cron (simpler setup):

```json
// vercel.json
{
  "crons": [
    { "path": "/api/workers/moderation",    "schedule": "* * * * *" },
    { "path": "/api/workers/notifications", "schedule": "* * * * *" },
    { "path": "/api/workers/daily-streak",  "schedule": "0 0 * * *" }
  ]
}
```

### Daily Streak Worker

**File**: `app/api/workers/daily-streak/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { users, compliments } from '@/lib/db/schema';
import { eq, gte, and, notInArray } from 'drizzle-orm';

function isAuthorized() {
  const authHeader = headers().get('authorization');
  return authHeader === `Bearer ${process.env.WORKER_SECRET}`;
}

export async function POST() {
  if (!isAuthorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Find users who sent an approved compliment in the last 24h
  const activeCompliments = await db.query.compliments.findMany({
    where: and(
      gte(compliments.createdAt, yesterday),
      eq(compliments.moderationStatus, 'approved')
    ),
    columns: { senderId: true },
  });

  const activeUserIds = [...new Set(
    activeCompliments.map(c => c.senderId).filter(Boolean)
  )] as string[];

  // Increment streaks for active users
  if (activeUserIds.length > 0) {
    await db.execute(
      `UPDATE users SET current_streak = current_streak + 1, updated_at = now()
       WHERE id = ANY($1)`,
      [activeUserIds]
    );
  }

  // Reset streaks for everyone else
  await db.update(users)
    .set({ currentStreak: 0, updatedAt: new Date() })
    .where(activeUserIds.length > 0 ? notInArray(users.id, activeUserIds) : undefined);

  // Unlock reward for users who just hit 7-day streak
  const milestoneUsers = await db.query.users.findMany({
    where: eq(users.currentStreak, 7), // exactly 7 = first milestone
  });

  await Promise.allSettled(
    milestoneUsers.map(async (user) => {
      const { sendEmail } = await import('@/lib/email/resend');
      await sendEmail({
        to: user.email,
        subject: '7-day streak! You unlocked custom themes',
        template: 'streak-reward',
        data: {
          username: user.username,
          streak: 7,
          settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        },
      });
    })
  );

  return NextResponse.json({
    activeUsers: activeUserIds.length,
    milestones: milestoneUsers.length,
  });
}
```

---

## Event Flow Diagram

```
POST /api/compliments/send
         │
         └─ Insert compliment (status: pending)
         └─ enqueue('moderation', { complimentId })
                      │
              Vercel Cron (every 1 min)
                      │
         POST /api/workers/moderation
                      │
                      ├─ Groq AI moderation
                      └─ Update status
                           │
                           ├─ If approved:
                           │    ├─ enqueue('notifications', { type: 'realtime', ... })
                           │    └─ enqueue('notifications', { type: 'email', ... })
                           │              │
                           │    Vercel Cron (every 1 min)
                           │              │
                           │    POST /api/workers/notifications
                           │         ├─ Soketi real-time push
                           │         └─ Resend email (if enabled)
                           │
                           └─ If rejected: logged in DB

Vercel Cron (midnight UTC)
         │
         └─ POST /api/workers/daily-streak
                  │
                  ├─ Increment active user streaks
                  ├─ Reset inactive user streaks
                  └─ Send reward email to 7-day milestone users
```

---

## Testing Workers

### Local Development

```bash
# Start Next.js dev server
pnpm dev

# Trigger moderation worker manually
curl -X POST http://localhost:3000/api/workers/moderation \
  -H "Authorization: Bearer your-worker-secret"

# Trigger notifications worker manually
curl -X POST http://localhost:3000/api/workers/notifications \
  -H "Authorization: Bearer your-worker-secret"

# Trigger daily streak worker manually
curl -X POST http://localhost:3000/api/workers/daily-streak \
  -H "Authorization: Bearer your-worker-secret"
```

### Seed a Test Job

```typescript
// scripts/test-queue.ts
import { enqueue } from '@/lib/queue/client';

await enqueue('moderation', { complimentId: 'test-compliment-id-123' });
console.log('Test job enqueued');
```

### Inspect Queue State

```sql
-- Check pending jobs in Supabase SQL editor
select * from pgmq.q_moderation;
select * from pgmq.a_moderation; -- archived (processed) jobs
```

### Unit Testing Workers

```typescript
// app/api/workers/moderation/__tests__/route.test.ts
import { POST } from '../route';
import { dequeue, ack } from '@/lib/queue/client';
import { moderateWithGroq } from '@/lib/ai/moderation';

jest.mock('@/lib/queue/client');
jest.mock('@/lib/ai/moderation');

describe('Moderation Worker', () => {
  it('should approve clean compliment and enqueue notifications', async () => {
    (dequeue as jest.Mock).mockResolvedValue([{
      msg_id: 1,
      message: { complimentId: 'test-id' },
    }]);
    (moderateWithGroq as jest.Mock).mockResolvedValue({
      approved: true,
      reason: 'Clean content',
      categories: { abuse: 0.01, sexual: 0.00, toxic: 0.02, dangerous: 0.00, hate: 0.00 },
    });

    const req = new Request('http://localhost/api/workers/moderation', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WORKER_SECRET}` },
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(body.succeeded).toBe(1);
    expect(ack).toHaveBeenCalledWith('moderation', 1);
  });
});
```

---

## Error Handling

### Retry Behavior

Jobs remain in the queue if the worker crashes or calls `nack()`. Vercel Cron will re-trigger the worker on the next cycle (next minute), giving automatic retries without any extra config.

For persistent failures, messages accumulate in the queue and can be inspected via SQL. Set a max retry count by tracking attempts in the payload:

```typescript
type ModerationJob = {
  complimentId: string;
  attempts?: number;
};

// In worker:
const attempts = (message.attempts ?? 0) + 1;
if (attempts >= 3) {
  // Dead-letter: mark compliment as rejected and ack
  await db.update(compliments)
    .set({ moderationStatus: 'rejected', updatedAt: new Date() })
    .where(eq(compliments.id, message.complimentId));
  await ack('moderation', msg_id);
  return;
}

// Re-enqueue with incremented attempt count
await enqueue('moderation', { ...message, attempts });
await ack('moderation', msg_id); // ack original to avoid duplicates
```

### Idempotency

Workers check `moderationStatus !== 'pending'` before processing, so duplicate deliveries are safe.

### Graceful Degradation

Soketi failures are caught and logged but don't fail the notification job — the compliment is already delivered, real-time push is best-effort.

---

## Monitoring

Queue depth and job history are queryable directly in Supabase:

```sql
-- How many jobs are pending?
select count(*) from pgmq.q_moderation;
select count(*) from pgmq.q_notifications;

-- Recently processed jobs
select * from pgmq.a_moderation order by archived_at desc limit 20;
```

For structured logging, use `console.error` / `console.log` — these appear in Vercel's function logs per invocation.

---

## Summary

| Concern | Solution |
|---|---|
| Async moderation | `pgmq` queue + Vercel Cron worker |
| Notifications | `pgmq` queue + Vercel Cron worker |
| Scheduled streaks | Vercel Cron (or `pg_cron`) |
| Retries | Automatic via cron re-trigger + `nack` |
| Observability | Supabase SQL + Vercel logs |
| External dependencies | None (queue lives in existing Supabase DB) |
