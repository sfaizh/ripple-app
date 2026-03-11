import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { SoketiProvider } from '@/components/shared/SoketiProvider';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ripple — Send anonymous compliments',
  description: 'Spread kindness anonymously. Send heartfelt compliments to the people who matter.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { id: true },
      });
      userId = profile?.id ?? null;
    }
  } catch {
    // DB not yet configured
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased bg-canvas text-ink`}>
        <ThemeProvider>
          <ToastProvider>
            <SoketiProvider userId={userId}>
              {children}
            </SoketiProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
