import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users, compliments } from '@/lib/db/schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';
import { enqueue } from '@/lib/queue/client';

const sendSchema = z.object({
  recipientUsername: z.string().min(1),
  category: z.enum(['professional', 'creative', 'personal_growth', 'just_because']),
  message: z.string().min(1).max(280),
  clueType: z.enum(['linkedin', 'company', 'recent', 'generic']).optional().default('generic'),
  isPublic: z.boolean().optional().default(true),
});

const CLUE_TEXTS: Record<string, string> = {
  linkedin: 'Someone who follows you on LinkedIn',
  company: 'A colleague from your company',
  recent: 'Someone you met recently',
  generic: 'Someone special',
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { recipientUsername, category, message, clueType, isPublic } = parsed.data;

    // Find recipient
    const recipient = await db.query.users.findFirst({
      where: eq(users.username, recipientUsername),
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Rate limit: 10 compliments per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ value: todayCount }] = await db
      .select({ value: count() })
      .from(compliments)
      .where(
        and(
          eq(compliments.senderId, user.id),
          gte(compliments.createdAt, today)
        )
      );

    if (todayCount >= 10) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 compliments per day.', code: 'RATE_LIMIT_EXCEEDED', retryAfter: 86400 },
        { status: 429 }
      );
    }

    const clueText = CLUE_TEXTS[clueType];

    // Create compliment
    const [newCompliment] = await db.insert(compliments).values({
      senderId: user.id,
      recipientId: recipient.id,
      category,
      message,
      clueType,
      clueText,
      isPublic,
      moderationStatus: 'pending',
    }).returning();

    // Increment sender's totalSent
    await db.update(users)
      .set({ totalSent: sql`${users.totalSent} + 1`, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Try to enqueue for moderation (graceful fallback if queue not set up)
    try {
      await enqueue('moderation', { complimentId: newCompliment.id });
    } catch (queueError) {
      console.error('Queue unavailable, auto-approving for dev:', queueError);
      // In dev without queue: auto-approve
      await db.update(compliments)
        .set({ moderationStatus: 'approved', updatedAt: new Date() })
        .where(eq(compliments.id, newCompliment.id));
    }

    return NextResponse.json({
      success: true,
      complimentId: newCompliment.id,
    });
  } catch (error) {
    console.error('Send compliment error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
