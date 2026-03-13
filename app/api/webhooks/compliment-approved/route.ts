import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { soketiServer } from '@/lib/soketi/server';

interface WebhookRecord {
  id: string;
  recipient_id: string;
  moderation_status: string;
  [key: string]: unknown;
}

interface WebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: WebhookRecord;
  old_record: WebhookRecord;
}

async function verifyWebhookSecret(): Promise<boolean> {
  const headersList = await headers();
  const secret = headersList.get('x-webhook-secret');
  return secret === process.env.WORKER_SECRET;
}

export async function POST(request: Request) {
  if (!(await verifyWebhookSecret())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('Failed to parse webhook payload:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Only process UPDATE events where moderation_status changed to 'approved'
  if (
    payload.type !== 'UPDATE' ||
    payload.record.moderation_status !== 'approved' ||
    payload.old_record.moderation_status === 'approved'
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await soketiServer.trigger(`private-user-${payload.record.recipient_id}`, 'new-compliment', {
      message: 'You have a secret compliment waiting',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to trigger Soketi notification:', error);
    return NextResponse.json(
      { error: 'Soketi push failed', details: String(error) },
      { status: 500 }
    );
  }
}
