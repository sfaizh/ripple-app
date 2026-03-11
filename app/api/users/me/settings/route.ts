import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const settingsSchema = z.object({
  theme: z.enum(['default', 'sunset', 'ocean']).optional(),
  emailNotifications: z.boolean().optional(),
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
