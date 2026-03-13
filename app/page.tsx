import { redirect } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function HomePage() {
  // redirect() throws a RedirectError — must be outside try/catch
  let shouldRedirect = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const profile = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { id: true },
      });
      if (profile) shouldRedirect = true;
    }
  } catch {
    // DB not yet configured — render landing page
  }

  if (shouldRedirect) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar user={null} />
      <HeroSection />
    </div>
  );
}
