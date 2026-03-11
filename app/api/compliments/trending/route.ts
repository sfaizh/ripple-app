import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { compliments } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');

    const conditions = [
      eq(compliments.isPublic, true),
      eq(compliments.moderationStatus, 'approved'),
    ];

    if (category) {
      conditions.push(
        eq(compliments.category, category as 'professional' | 'creative' | 'personal_growth' | 'just_because')
      );
    }

    const whereClause = and(...conditions);

    const [rows, [{ value: total }]] = await Promise.all([
      db.query.compliments.findMany({
        where: whereClause,
        orderBy: [desc(compliments.createdAt)],
        limit,
        offset,
        columns: {
          id: true,
          category: true,
          message: true,
          createdAt: true,
        },
      }),
      db.select({ value: count() }).from(compliments).where(whereClause),
    ]);

    return NextResponse.json({
      compliments: rows,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Trending error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
