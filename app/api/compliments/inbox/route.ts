import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { compliments } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'approved';
    const unread = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions = [
      eq(compliments.recipientId, user.id),
      eq(compliments.moderationStatus, status as 'approved' | 'pending' | 'rejected'),
    ];

    if (unread) {
      conditions.push(eq(compliments.isRead, false));
    }

    const whereClause = and(...conditions);

    const [rows, [{ value: total }]] = await Promise.all([
      db.query.compliments.findMany({
        where: whereClause,
        orderBy: [desc(compliments.createdAt)],
        limit,
        offset,
      }),
      db.select({ value: count() }).from(compliments).where(whereClause),
    ]);

    const result = rows.map((c) => ({
      id: c.id,
      category: c.category,
      message: c.message,
      clueType: c.clueType,
      clueText: c.clueText,
      isRead: c.isRead,
      readAt: c.readAt,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      compliments: result,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
    });
  } catch (error) {
    console.error('Inbox error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
