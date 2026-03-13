import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
const RESERVED = new Set(['admin', 'api', 'wall', 'dashboard', 'settings', 'signin', 'signup', 'inbox']);

const settingsSchema = z.object({
  theme: z.enum(['default', 'sunset', 'ocean']).optional(),
  emailNotifications: z.boolean().optional(),
  username: z.string().optional(),
});

export async function PATCH(request: Request) {
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
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (parsed.data.theme !== undefined) updates.theme = parsed.data.theme;
    if (parsed.data.emailNotifications !== undefined) updates.emailNotifications = parsed.data.emailNotifications;

    if (parsed.data.username !== undefined) {
      const username = parsed.data.username;

      if (!USERNAME_REGEX.test(username) || RESERVED.has(username)) {
        return NextResponse.json(
          { error: 'Invalid username format', code: 'INVALID_USERNAME' },
          { status: 400 }
        );
      }

      // Check uniqueness — allow keeping own current username
      const conflict = await db.query.users.findFirst({
        where: and(eq(users.username, username), ne(users.id, user.id)),
        columns: { id: true },
      });

      if (conflict) {
        return NextResponse.json(
          { error: 'Username already taken', code: 'USERNAME_TAKEN' },
          { status: 409 }
        );
      }

      updates.username = username;
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));

    return NextResponse.json({ success: true, user: parsed.data });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
