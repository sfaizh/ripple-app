import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Navbar } from '@/components/shared/Navbar';
import { InboxList } from '@/components/inbox/InboxList';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={{ username: profile.username, email: profile.email }} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Your inbox</h1>
          <p className="text-gray-500 text-sm">
            Click a compliment to reveal it ✨
          </p>
        </div>

        {/* Wall link card */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl p-5 mb-8 text-white">
          <p className="font-semibold mb-1">Share your wall link</p>
          <p className="text-sm text-purple-100 mb-3">
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
            { label: 'Received', value: profile.totalReceived },
            { label: 'Sent', value: profile.totalSent },
            { label: 'Streak', value: `${profile.currentStreak}d` },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <InboxList />
      </main>
    </div>
  );
}

