import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users, compliments } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const profile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const [{ value: unreadCount }] = await db
      .select({ value: count() })
      .from(compliments)
      .where(
        and(
          eq(compliments.recipientId, user.id),
          eq(compliments.isRead, false),
          eq(compliments.moderationStatus, 'approved')
        )
      );

    return NextResponse.json({
      totalSent: profile.totalSent,
      totalReceived: profile.totalReceived,
      currentStreak: profile.currentStreak,
      unreadCount,
      joinedAt: profile.createdAt,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
