# Ripple - Inngest Functions Documentation

## Overview

Inngest is used for event-driven async processing. All functions are located in `lib/inngest/functions/`.

---

## Core Concepts

### Inngest Client Setup

```typescript
// lib/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'ripple',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

### Event Types

```typescript
// lib/inngest/types.ts
export type ComplimentSentEvent = {
  name: 'compliment.sent';
  data: {
    complimentId: string;
  };
};

export type ComplimentApprovedEvent = {
  name: 'compliment.approved';
  data: {
    complimentId: string;
    recipientId: string;
  };
};

export type StreakMilestoneEvent = {
  name: 'streak.milestone';
  data: {
    userId: string;
    streak: number;
  };
};

export type Events =
  | ComplimentSentEvent
  | ComplimentApprovedEvent
  | StreakMilestoneEvent;
```

---

## Function 1: Moderate Compliment

**Purpose**: AI moderation of compliments using Gemini API

**Trigger**: `compliment.sent` event

**File**: `lib/inngest/functions/moderate-compliment.ts`

```typescript
import { inngest } from '@/lib/inngest/client';
import { db } from '@/lib/db/client';
import { compliments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { moderateWithGemini } from '@/lib/ai/moderation';

export const moderateCompliment = inngest.createFunction(
  {
    id: 'moderate-compliment',
    name: 'Moderate Compliment with AI',
  },
  { event: 'compliment.sent' },
  async ({ event, step }) => {
    const { complimentId } = event.data;

    // Step 1: Fetch compliment from database
    const compliment = await step.run('fetch-compliment', async () => {
      const result = await db.query.compliments.findFirst({
        where: eq(compliments.id, complimentId),
      });

      if (!result) {
        throw new Error(`Compliment ${complimentId} not found`);
      }

      return result;
    });

    // Step 2: Call Gemini API for moderation
    const moderation = await step.run('ai-moderation', async () => {
      return moderateWithGemini(compliment.message);
    });

    // Step 3: Update moderation status in database
    await step.run('update-status', async () => {
      await db.update(compliments)
        .set({
          moderationStatus: moderation.approved ? 'approved' : 'rejected',
          moderationResult: moderation,
          updatedAt: new Date(),
        })
        .where(eq(compliments.id, complimentId));
    });

    // Step 4: If approved, emit follow-up event
    if (moderation.approved) {
      await step.sendEvent('emit-approval', {
        name: 'compliment.approved',
        data: {
          complimentId,
          recipientId: compliment.recipientId,
        },
      });
    }

    return {
      success: true,
      approved: moderation.approved,
      reason: moderation.reason,
    };
  }
);
```

**Moderation Logic** (`lib/ai/moderation.ts`):

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

export async function moderateWithGemini(message: string): Promise<ModerationResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid Gemini response format');
  }

  const moderation: ModerationResult = JSON.parse(jsonMatch[0]);

  // Safety threshold: reject if any category > 0.5
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

**Error Handling:**
- If Gemini API fails: Retry 3 times with exponential backoff
- If still fails: Mark compliment as `rejected` with reason "Moderation failed"
- Log error to monitoring system (Sentry)

**Expected Duration**: 1-3 seconds

---

## Function 2: Send Notification Email

**Purpose**: Send email notification when compliment is approved

**Trigger**: `compliment.approved` event

**File**: `lib/inngest/functions/send-notification-email.ts`

```typescript
import { inngest } from '@/lib/inngest/client';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/resend';

export const sendNotificationEmail = inngest.createFunction(
  {
    id: 'send-notification-email',
    name: 'Send Email Notification',
  },
  { event: 'compliment.approved' },
  async ({ event, step }) => {
    const { complimentId, recipientId } = event.data;

    // Step 1: Fetch user preferences
    const user = await step.run('fetch-user', async () => {
      const result = await db.query.users.findFirst({
        where: eq(users.id, recipientId),
      });

      if (!result) {
        throw new Error(`User ${recipientId} not found`);
      }

      return result;
    });

    // Step 2: Check if user has email notifications enabled
    if (!user.emailNotifications) {
      return { skipped: true, reason: 'Email notifications disabled' };
    }

    // Step 3: Send email via Resend
    const emailResult = await step.run('send-email', async () => {
      return sendEmail({
        to: user.email,
        subject: 'You have a secret compliment waiting ✨',
        template: 'new-compliment',
        data: {
          username: user.username,
          complimentId,
          inboxUrl: `${process.env.NEXT_PUBLIC_APP_URL}/inbox`,
        },
      });
    });

    return {
      success: true,
      emailId: emailResult.id,
    };
  }
);
```

**Email Template** (`lib/email/templates/new-compliment.tsx`):

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(options: {
  to: string;
  subject: string;
  template: string;
  data: any;
}) {
  const { to, subject, data } = options;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #8b5cf6; margin: 0; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; }
          .cta { text-align: center; margin-top: 30px; }
          .button {
            display: inline-block;
            background: #8b5cf6;
            color: white !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Ripple</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.username}!</h2>
            <p>Someone sent you a secret compliment. They wanted you to know how much you mean to them.</p>
            <p>Your compliment is waiting to be revealed...</p>
          </div>
          <div class="cta">
            <a href="${data.inboxUrl}" class="button">Reveal Your Compliment</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have email notifications enabled.</p>
            <p>Update your preferences at any time in your settings.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return resend.emails.send({
    from: 'Ripple <notifications@ripple.com>',
    to,
    subject,
    html,
  });
}
```

**Error Handling:**
- If Resend API fails: Retry 3 times
- Log failed emails to database (future: retry queue)

**Expected Duration**: 500ms - 2 seconds

---

## Function 3: Trigger Soketi Notification

**Purpose**: Send real-time notification via Soketi

**Trigger**: `compliment.approved` event

**File**: `lib/inngest/functions/send-soketi-notification.ts`

```typescript
import { inngest } from '@/lib/inngest/client';
import { soketiServer } from '@/lib/soketi/server';

export const sendSoketiNotification = inngest.createFunction(
  {
    id: 'send-soketi-notification',
    name: 'Send Soketi Notification',
  },
  { event: 'compliment.approved' },
  async ({ event, step }) => {
    const { recipientId } = event.data;

    await step.run('trigger-soketi', async () => {
      await soketiServer.trigger(
        `private-user-${recipientId}`,
        'new-compliment',
        {
          message: 'You have a secret compliment waiting',
          timestamp: new Date().toISOString(),
        }
      );
    });

    return { success: true };
  }
);
```

**Soketi Server Setup** (`lib/soketi/server.ts`):

```typescript
import Pusher from 'pusher-js'; // Soketi is Pusher-compatible

export const soketiServer = new Pusher({
  appId: process.env.SOKETI_APP_ID!,
  key: process.env.NEXT_PUBLIC_SOKETI_KEY!,
  secret: process.env.SOKETI_SECRET!,
  host: process.env.SOKETI_HOST!, // your-app.fly.dev
  port: process.env.SOKETI_PORT || '6001',
  useTLS: true,
});
```

**Error Handling:**
- If Soketi fails: Log error but don't fail (email is fallback)
- No retries (real-time events are ephemeral)

**Expected Duration**: 200ms - 1 second

---

## Function 4: Daily Streak Check

**Purpose**: Track user streaks and unlock rewards

**Trigger**: Scheduled (cron: `0 0 * * *` - midnight UTC daily)

**File**: `lib/inngest/functions/daily-streak-check.ts`

```typescript
import { inngest } from '@/lib/inngest/client';
import { db } from '@/lib/db/client';
import { users, compliments } from '@/lib/db/schema';
import { eq, gte, and } from 'drizzle-orm';

export const dailyStreakCheck = inngest.createFunction(
  {
    id: 'daily-streak-check',
    name: 'Daily Streak Check',
  },
  { cron: '0 0 * * *' }, // Run at midnight UTC
  async ({ step }) => {
    // Step 1: Find users who sent compliment in last 24h
    const activeUserIds = await step.run('find-active-users', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const activeCompliments = await db.query.compliments.findMany({
        where: and(
          gte(compliments.createdAt, yesterday),
          eq(compliments.moderationStatus, 'approved')
        ),
        columns: {
          senderId: true,
        },
      });

      // Get unique sender IDs (filter out anonymous/null)
      return [...new Set(activeCompliments.map(c => c.senderId).filter(Boolean))] as string[];
    });

    // Step 2: Update streaks for active users
    await step.run('update-streaks', async () => {
      const promises = activeUserIds.map(userId =>
        db.update(users)
          .set({
            currentStreak: db.raw('current_streak + 1'),
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
      );

      return Promise.all(promises);
    });

    // Step 3: Reset streaks for inactive users
    await step.run('reset-inactive-streaks', async () => {
      await db.update(users)
        .set({
          currentStreak: 0,
          updatedAt: new Date(),
        })
        .where(
          // Users not in activeUserIds
          db.raw(`id NOT IN (${activeUserIds.map(id => `'${id}'`).join(',')})`)
        );
    });

    // Step 4: Find users who hit streak milestones
    const milestoneUsers = await step.run('find-milestones', async () => {
      return db.query.users.findMany({
        where: gte(users.currentStreak, 7), // 7-day streak milestone
      });
    });

    // Step 5: Emit milestone events
    await step.run('emit-milestone-events', async () => {
      const events = milestoneUsers.map(user => ({
        name: 'streak.milestone' as const,
        data: {
          userId: user.id,
          streak: user.currentStreak,
        },
      }));

      if (events.length > 0) {
        await inngest.send(events);
      }
    });

    return {
      activeUsers: activeUserIds.length,
      milestones: milestoneUsers.length,
    };
  }
);
```

**Expected Duration**: 5-10 seconds (depends on user count)

---

## Function 5: Send Streak Reward

**Purpose**: Unlock custom theme for users who reach 7-day streak

**Trigger**: `streak.milestone` event

**File**: `lib/inngest/functions/send-streak-reward.ts`

```typescript
import { inngest } from '@/lib/inngest/client';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/resend';

export const sendStreakReward = inngest.createFunction(
  {
    id: 'send-streak-reward',
    name: 'Send Streak Reward',
  },
  { event: 'streak.milestone' },
  async ({ event, step }) => {
    const { userId, streak } = event.data;

    // Only trigger for first milestone (7 days)
    if (streak !== 7) {
      return { skipped: true };
    }

    // Step 1: Fetch user
    const user = await step.run('fetch-user', async () => {
      return db.query.users.findFirst({
        where: eq(users.id, userId),
      });
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Step 2: Send congratulations email
    await step.run('send-email', async () => {
      return sendEmail({
        to: user.email,
        subject: '🎉 7-day streak! You unlocked custom themes',
        template: 'streak-reward',
        data: {
          username: user.username,
          streak,
          settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
        },
      });
    });

    return { success: true };
  }
);
```

---

## Function Registry

**File**: `app/api/inngest/route.ts`

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { moderateCompliment } from '@/lib/inngest/functions/moderate-compliment';
import { sendNotificationEmail } from '@/lib/inngest/functions/send-notification-email';
import { sendSoketiNotification } from '@/lib/inngest/functions/send-soketi-notification';
import { dailyStreakCheck } from '@/lib/inngest/functions/daily-streak-check';
import { sendStreakReward } from '@/lib/inngest/functions/send-streak-reward';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    moderateCompliment,
    sendNotificationEmail,
    sendSoketiNotification,
    dailyStreakCheck,
    sendStreakReward,
  ],
});
```

---

## Event Flow Diagram

```
POST /api/compliments/send
         │
         └─ Create compliment (status: pending)
         └─ inngest.send('compliment.sent')
                      │
                      └─ moderateCompliment function
                               │
                               ├─ Gemini AI moderation
                               └─ Update status
                                    │
                                    ├─ If approved:
                                    │    └─ inngest.send('compliment.approved')
                                    │              │
                                    │              ├─ sendNotificationEmail
                                    │              │     └─ Resend email
                                    │              │
                                    │              └─ sendSoketiNotification
                                    │                    └─ Soketi event
                                    │
                                    └─ If rejected:
                                         └─ Log to monitoring

Daily cron (midnight UTC)
         │
         └─ dailyStreakCheck function
                  │
                  ├─ Update active user streaks
                  ├─ Reset inactive user streaks
                  └─ inngest.send('streak.milestone')
                           │
                           └─ sendStreakReward
                                └─ Unlock custom theme
                                └─ Send congratulations email
```

---

## Testing Inngest Functions

### Local Development

```bash
# Terminal 1: Start Next.js dev server
pnpm dev

# Terminal 2: Start Inngest dev server
npx inngest-cli dev

# The Inngest UI will be available at http://localhost:8288
```

### Trigger Test Event

```typescript
// scripts/test-inngest.ts
import { inngest } from '@/lib/inngest/client';

async function testModeration() {
  await inngest.send({
    name: 'compliment.sent',
    data: {
      complimentId: 'test-compliment-id-123',
    },
  });

  console.log('✅ Test event sent!');
}

testModeration();
```

### Unit Testing Functions

```typescript
// lib/inngest/functions/__tests__/moderate-compliment.test.ts
import { moderateCompliment } from '../moderate-compliment';
import { db } from '@/lib/db/client';
import { moderateWithGemini } from '@/lib/ai/moderation';

jest.mock('@/lib/db/client');
jest.mock('@/lib/ai/moderation');

describe('moderateCompliment', () => {
  it('should approve clean compliment', async () => {
    const mockCompliment = {
      id: 'test-id',
      message: 'You are awesome!',
      recipientId: 'user-id',
    };

    (db.query.compliments.findFirst as jest.Mock).mockResolvedValue(mockCompliment);
    (moderateWithGemini as jest.Mock).mockResolvedValue({
      approved: true,
      reason: 'Clean content',
      categories: { abuse: 0.01, sexual: 0.00, toxic: 0.02, dangerous: 0.00, hate: 0.00 },
    });

    const result = await moderateCompliment.handler({
      event: { name: 'compliment.sent', data: { complimentId: 'test-id' } },
      step: mockStep,
    });

    expect(result.approved).toBe(true);
  });
});
```

---

## Monitoring & Observability

### Inngest Dashboard

View in production: https://app.inngest.com

**Metrics to track:**
- Function success rate (target: > 99%)
- Average execution time
- Retry count
- Failed events (alerts)

### Custom Logging

```typescript
// lib/inngest/logger.ts
import { Logger } from 'inngest';

export const logger = new Logger({
  service: 'ripple-inngest',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Usage in functions:
await step.run('my-step', async () => {
  logger.info('Processing compliment', { complimentId });
  // ...
});
```

---

## Error Handling Best Practices

### 1. Idempotency

All functions should be idempotent (safe to run multiple times):

```typescript
// ✅ Good: Check if already processed
const compliment = await db.query.compliments.findFirst({
  where: eq(compliments.id, complimentId),
});

if (compliment.moderationStatus !== 'pending') {
  return { skipped: true, reason: 'Already moderated' };
}
```

### 2. Retry Configuration

```typescript
export const moderateCompliment = inngest.createFunction(
  {
    id: 'moderate-compliment',
    retries: 3, // Retry up to 3 times
    rateLimit: {
      limit: 100,
      period: '1m', // Max 100 executions per minute
    },
  },
  { event: 'compliment.sent' },
  async ({ event, step }) => {
    // ...
  }
);
```

### 3. Graceful Degradation

```typescript
// If Soketi fails, don't fail the whole function
try {
  await soketiServer.trigger(...);
} catch (error) {
  logger.error('Soketi notification failed', { error, recipientId });
  // Email will still be sent (separate function)
}
```

---

## Conclusion

Inngest functions provide:
1. **Async processing**: Heavy AI moderation doesn't block API routes
2. **Reliability**: Built-in retries, error handling
3. **Observability**: Function logs, execution history
4. **Scalability**: Automatic scaling, rate limiting
5. **Developer experience**: TypeScript, local testing, step-based execution
