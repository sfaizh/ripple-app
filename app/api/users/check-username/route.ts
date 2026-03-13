import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
const RESERVED = new Set(['admin', 'api', 'wall', 'dashboard', 'settings', 'signin', 'signup', 'inbox']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username') ?? '';

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false, error: 'Invalid format' });
  }

  if (RESERVED.has(username)) {
    return NextResponse.json({ available: false, error: 'Reserved username' });
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { id: true },
    });

    return NextResponse.json({ available: !existing });
  } catch {
    return NextResponse.json({ available: false, error: 'Server error' }, { status: 500 });
  }
}
