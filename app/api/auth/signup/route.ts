import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(255),
});

function generateUsername(): string {
  const adjectives = ['sparkle', 'bright', 'kind', 'warm', 'sunny', 'gentle', 'bold', 'calm'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const id = nanoid(4).toLowerCase().replace(/[^a-z0-9]/g, 'x');
  const num = Math.floor(Math.random() * 90 + 10);
  return `${id}_${adj}_${num}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm`,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email already exists', code: 'EMAIL_EXISTS' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message, code: 'AUTH_ERROR' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    // Generate unique username
    let username = generateUsername();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.query.users.findFirst({
        where: eq(users.username, username),
      });
      if (!existing) break;
      username = generateUsername();
      attempts++;
    }

    // Create user profile in our DB
    const [newUser] = await db.insert(users).values({
      id: authData.user.id,
      email,
      username,
    }).returning();

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
