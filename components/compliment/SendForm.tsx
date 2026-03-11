'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CategorySelector, type Category } from './CategorySelector';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const sendFormSchema = z.object({
  recipientUsername: z.string().min(1),
  category: z.enum(['professional', 'creative', 'personal_growth', 'just_because']),
  message: z.string().min(1, 'Message is required').max(280, 'Message must be under 280 characters'),
  clueType: z.enum(['linkedin', 'company', 'recent', 'generic']),
  isPublic: z.boolean(),
});

type SendFormData = z.infer<typeof sendFormSchema>;

interface SendFormProps {
  recipientUsername: string;
  onSuccess?: () => void;
}

export function SendForm({ recipientUsername, onSuccess }: SendFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SendFormData>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: {
      recipientUsername,
      category: 'just_because',
      message: '',
      clueType: 'generic',
      isPublic: true,
    },
  });

  const messageLength = form.watch('message')?.length || 0;

  const onSubmit = async (data: SendFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/compliments/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send');
      }

      toast({
        title: 'Compliment sent! ✨',
        description: 'Your kind words are on their way.',
      });

      form.reset({ ...form.getValues(), message: '' });
      onSuccess?.();
    } catch (error: unknown) {
      toast({
        title: 'Failed to send',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What type of compliment?
        </label>
        <CategorySelector
          value={form.watch('category') as Category}
          onChange={(cat) => form.setValue('category', cat)}
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your message
        </label>
        <Textarea
          {...form.register('message')}
          placeholder="Write something kind and genuine..."
          rows={4}
          className="resize-none"
          maxLength={280}
        />
        {form.formState.errors.message && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.message.message}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">
            Be specific. What did they do that stood out?
          </p>
          <p className={cn('text-xs', messageLength > 260 ? 'text-red-500 font-medium' : 'text-gray-400')}>
            {messageLength}/280
          </p>
        </div>
      </div>

      {/* Clue */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Give them a clue? (Optional)
        </label>
        <select
          {...form.register('clueType')}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="generic">Keep it mysterious 🤫</option>
          <option value="linkedin">LinkedIn connection 💼</option>
          <option value="company">Colleague 🏢</option>
          <option value="recent">Someone they met recently ✨</option>
        </select>
      </div>

      {/* Public toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isPublic"
          {...form.register('isPublic')}
          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
        />
        <label htmlFor="isPublic" className="text-sm text-gray-600">
          Share anonymously on the trending wall
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Compliment ✨'}
      </Button>
    </form>
  );
}
