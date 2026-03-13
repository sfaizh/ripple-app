'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type SigninData = z.infer<typeof signinSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SigninData>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SigninData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to sign in');
      }

      toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
      router.push('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-primary">
            ripple ✨
          </Link>
          <p className="text-ink-muted mt-2 text-sm">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Email
                </label>
                <Input
                  {...form.register('email')}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Password
                </label>
                <Input
                  {...form.register('password')}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="text-center text-sm text-ink-muted mt-4">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
