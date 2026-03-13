'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

interface NavbarProps {
  user?: {
    username?: string;
    email?: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { resolvedTheme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    toast({ title: 'Signed out', description: 'See you next time!' });
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b border-border-subtle bg-surface-alt dark:bg-dark dark:border-dark/30 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg tracking-tight text-primary dark:text-warm"
        >
          ripple ✨
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="hover:bg-primary hover:text-white">Dashboard</Button>
              </Link>
              {user.username && (
                <Link href={`/wall/${user.username}`}>
                  <Button variant="ghost" size="sm" className="hover:bg-primary hover:text-white">My Wall</Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/signin">
                <Button variant="ghost" size="sm" className="hover:bg-primary hover:text-white">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="ml-1 h-8 w-8 flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
