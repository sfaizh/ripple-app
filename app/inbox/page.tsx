import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users, compliments } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { Navbar } from '@/components/shared/Navbar';
import { InboxList } from '@/components/inbox/InboxList';
import { InboxSendModal } from '@/components/inbox/InboxSendModal';
import { CopyButton } from '@/components/shared/CopyButton';

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const profile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!profile) {
    redirect('/signin');
  }

  const wallUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/wall/${profile.username}`;

  const [{ value: totalReceived }] = await db
    .select({ value: count() })
    .from(compliments)
    .where(and(eq(compliments.recipientId, user.id), eq(compliments.moderationStatus, 'approved')));

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar user={{ username: profile.username, email: profile.email }} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink mb-1">Your inbox</h1>
          <p className="text-ink-muted text-sm">
            Click a compliment to reveal it ✨
          </p>
        </div>

        {/* Wall link card */}
        <div className="bg-gradient-to-r from-primary to-teal rounded-xl p-5 mb-8 text-white">
          <p className="font-semibold mb-1">Share your wall link</p>
          <p className="text-sm text-white/80 mb-3">
            Anyone with your link can send you an anonymous compliment.
          </p>
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
            <span className="text-sm font-mono truncate flex-1">/wall/{profile.username}</span>
            <CopyButton text={wallUrl} label="Copy" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Received', value: totalReceived },
            { label: 'Sent', value: profile.totalSent },
            { label: 'Streak', value: `${profile.currentStreak}d` },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-xl p-4 text-center border border-border-subtle shadow-sm">
              <p className="text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Send compliment button */}
        <div className="mb-8">
          <InboxSendModal />
        </div>

        <InboxList />
      </main>
    </div>
  );
}
