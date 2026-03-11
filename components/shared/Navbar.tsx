'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    toast({ title: 'Signed out', description: 'See you next time!' });
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-purple-600 text-lg tracking-tight">
          ripple ✨
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/inbox">
                <Button variant="ghost" size="sm">Inbox</Button>
              </Link>
              {user.username && (
                <Link href={`/wall/${user.username}`}>
                  <Button variant="ghost" size="sm">My Wall</Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/signin">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
