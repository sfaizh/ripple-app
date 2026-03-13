import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Supabase webhook endpoint (/api/webhooks/compliment-approved)
 *
 * This endpoint is an optional backup path for firing Soketi notifications.
 * The primary moderation + notification path is inline via next/server `after()` in the send route.
 */
test.describe('Webhook E2E', () => {
  const WORKER_SECRET = process.env.WORKER_SECRET || 'test-secret';
  const webhookURL = 'http://localhost:3000/api/webhooks/compliment-approved';

  test('webhook endpoint rejects requests without the correct secret', async ({
    request,
  }) => {
    const approvalPayload = {
      type: 'UPDATE',
      table: 'compliments',
      schema: 'public',
      record: { id: 'comp-1', recipient_id: 'user-abc', moderation_status: 'approved' },
      old_record: { id: 'comp-1', recipient_id: 'user-abc', moderation_status: 'pending' },
    };

    // No secret header → 401
    const noSecretRes = await request.post(webhookURL, { data: approvalPayload });
    expect(noSecretRes.status()).toBe(401);

    // Wrong secret → 401
    const wrongSecretRes = await request.post(webhookURL, {
      data: approvalPayload,
      headers: { 'x-webhook-secret': 'wrong-value' },
    });
    expect(wrongSecretRes.status()).toBe(401);
  });

  test('webhook endpoint skips non-approval events gracefully', async ({
    request,
  }) => {
    const insertPayload = {
      type: 'INSERT',
      table: 'compliments',
      schema: 'public',
      record: { id: 'comp-2', recipient_id: 'user-abc', moderation_status: 'pending' },
      old_record: { id: 'comp-2', recipient_id: 'user-abc', moderation_status: 'pending' },
    };

    const res = await request.post(webhookURL, {
      data: insertPayload,
      headers: { 'x-webhook-secret': WORKER_SECRET },
    });

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.skipped).toBe(true);
  });
});
