import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { compliments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const compliment = await db.query.compliments.findFirst({
      where: eq(compliments.id, id),
    });

    if (!compliment) {
      return NextResponse.json(
        { error: 'Compliment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (compliment.recipientId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const readAt = new Date();

    await db.update(compliments)
      .set({ isRead: true, readAt, updatedAt: readAt })
      .where(eq(compliments.id, id));

    return NextResponse.json({ success: true, readAt });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
