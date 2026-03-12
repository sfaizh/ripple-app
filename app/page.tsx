import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/shared/Navbar';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function HomePage() {
  let currentUser = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const profile = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { id: true, username: true, email: true },
      });
      currentUser = profile ? { username: profile.username, email: profile.email } : null;
    }
  } catch {
    // DB not yet configured
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar user={currentUser} />

      <main className="max-w-4xl mx-auto px-4 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-surface-alt text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-border-subtle">
          ✨ Anonymous compliments platform
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-ink mb-6 leading-tight">
          Spread kindness,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal">
            anonymously
          </span>
        </h1>

        <p className="text-xl text-ink-muted mb-10 max-w-2xl mx-auto leading-relaxed">
          Send heartfelt compliments to the people who inspire you. No need to reveal yourself —
          let your words create a ripple of positivity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {currentUser ? (
            <>
              <Link href="/inbox">
                <Button size="lg" className="w-full sm:w-auto px-8">
                  View my inbox
                </Button>
              </Link>
              {currentUser.username && (
                <Link href={`/wall/${currentUser.username}`}>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                    My wall
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto px-8">
                  Get started free
                </Button>
              </Link>
              <Link href="/signin">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 hover:bg-primary hover:text-white">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          {[
            {
              icon: '🔒',
              title: 'Stay anonymous',
              desc: 'Send compliments without revealing your identity. Your sender stays a secret.',
            },
            {
              icon: '✨',
              title: 'Reveal with magic',
              desc: 'Recipients unlock their compliments with a beautiful blur-to-reveal animation.',
            },
            {
              icon: '💫',
              title: 'AI moderated',
              desc: "Every compliment is reviewed by AI to ensure it's kind, positive, and safe.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-surface rounded-xl p-6 border border-border-subtle shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
