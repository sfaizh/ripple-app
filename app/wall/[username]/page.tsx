import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/Navbar';
import { WallSendForm } from '@/components/wall/WallSendForm';

interface WallPageProps {
  params: Promise<{ username: string }>;
}

const themeGradients = {
  default: 'from-purple-600 to-pink-500',
  sunset: 'from-orange-400 to-pink-500',
  ocean: 'from-teal-400 to-blue-500',
};

export async function generateMetadata({ params }: WallPageProps) {
  const { username } = await params;
  return {
    title: `Send ${username} a compliment — Ripple`,
    description: `Send an anonymous compliment to @${username}`,
  };
}

export default async function WallPage({ params }: WallPageProps) {
  const { username } = await params;

  const wallUser = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: {
      id: true,
      username: true,
      theme: true,
      totalReceived: true,
      createdAt: true,
    },
  });

  if (!wallUser) {
    notFound();
  }

  // Get current logged-in user (for Navbar)
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

  const isOwnWall = currentUser?.username === username;
  const gradient = themeGradients[wallUser.theme] || themeGradients.default;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={currentUser} />

      {/* Hero banner */}
      <div className={`bg-gradient-to-br ${gradient} text-white`}>
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl mx-auto mb-4">
            ✨
          </div>
          <h1 className="text-2xl font-bold mb-1">@{wallUser.username}</h1>
          <p className="text-white/80 text-sm">
            {wallUser.totalReceived} compliments received
          </p>

          {isOwnWall && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              🏠 This is your wall
            </div>
          )}
        </div>
      </div>

      {/* Send form */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {isOwnWall ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-gray-500 mb-4">
              This is your wall. Share your link so others can send you compliments!
            </p>
            <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm text-gray-600">
              {typeof window !== 'undefined' ? window.location.href : `/wall/${username}`}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Send @{wallUser.username} a compliment
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              They won&apos;t know it&apos;s from you unless you tell them.
            </p>
            <WallSendForm recipientUsername={wallUser.username} />
          </div>
        )}
      </main>
    </div>
  );
}
