import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { users, compliments } from '@/lib/db/schema';
import { eq, and, gte, notInArray } from 'drizzle-orm';

async function isAuthorized(): Promise<boolean> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  return authHeader === `Bearer ${process.env.WORKER_SECRET}`;
}

export async function POST() {
  if (!(await isAuthorized())) {
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

  const activeUserIds = [
    ...new Set(
      activeCompliments.map((c) => c.senderId).filter(Boolean) as string[]
    ),
  ];

  let milestones = 0;

  if (activeUserIds.length > 0) {
    // Increment streaks for active users (one by one due to Drizzle limitations)
    for (const userId of activeUserIds) {
      const profile = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (profile) {
        const newStreak = profile.currentStreak + 1;
        await db.update(users)
          .set({ currentStreak: newStreak, updatedAt: new Date() })
          .where(eq(users.id, userId));

        // Check 7-day milestone
        if (newStreak === 7) {
          milestones++;
          console.log(`User ${userId} hit 7-day streak milestone!`);
        }
      }
    }

    // Reset streaks for inactive users
    await db.update(users)
      .set({ currentStreak: 0, updatedAt: new Date() })
      .where(notInArray(users.id, activeUserIds));
  } else {
    // Reset all streaks if no one was active
    await db.update(users)
      .set({ currentStreak: 0, updatedAt: new Date() });
  }

  return NextResponse.json({
    activeUsers: activeUserIds.length,
    milestones,
  });
}
