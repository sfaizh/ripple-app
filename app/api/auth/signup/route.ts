import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
const RESERVED = new Set(['admin', 'api', 'wall', 'dashboard', 'settings', 'signin', 'signup', 'inbox']);

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(255),
  username: z.string().optional(),
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

    const { email, password, username: requestedUsername } = parsed.data;

    // Validate custom username if provided
    if (requestedUsername) {
      if (!USERNAME_REGEX.test(requestedUsername) || RESERVED.has(requestedUsername)) {
        return NextResponse.json(
          { error: 'Invalid username format', code: 'INVALID_USERNAME' },
          { status: 400 }
        );
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.username, requestedUsername),
        columns: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Username already taken', code: 'USERNAME_TAKEN' },
          { status: 409 }
        );
      }
    }

    const supabase = await createClient();

    // Derive origin from request so it works without NEXT_PUBLIC_APP_URL being set
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/api/auth/confirm`,
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

    // Determine username: use provided or generate unique one
    let username = requestedUsername || generateUsername();
    if (!requestedUsername) {
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db.query.users.findFirst({
          where: eq(users.username, username),
        });
        if (!existing) break;
        username = generateUsername();
        attempts++;
      }
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
