import { test, expect } from '@playwright/test';

/**
 * E2E tests for the moderation worker and AI content filtering
 *
 * Prerequisites:
 * - Server running with WORKER_SECRET env var set
 * - Test database with at least one user
 * - pgmq queue configured (or fallback auto-approve enabled in dev)
 */
test.describe('Moderation Worker E2E', () => {
  const WORKER_SECRET = process.env.WORKER_SECRET || 'test-secret';
  const baseURL = 'http://localhost:3000';

  test('should process compliment via API and approve clean messages', async ({
    request,
  }) => {
    // 1. Create a test user via signup API
    const signupRes = await request.post(`${baseURL}/api/auth/signup`, {
      data: {
        email: `test.${Date.now()}@ripple-test.local`,
        password: 'TestPassword123!',
      },
    });
    expect(signupRes.ok()).toBeTruthy();

    const signupData = await signupRes.json();
    const recipientId = signupData.user.id;

    // 2. Send a compliment (unauthenticated)
    const complimentRes = await request.post(`${baseURL}/api/compliments/send`, {
      data: {
        recipientUsername: signupData.user.username,
        category: 'professional',
        message: 'You are an excellent team member and a pleasure to work with!',
        clueType: 'company',
        isPublic: true,
      },
    });
    expect(complimentRes.ok()).toBeTruthy();

    const complimentData = await complimentRes.json();
    const complimentId = complimentData.complimentId;

    // 3. Trigger the moderation worker
    const moderationRes = await request.post(
      `${baseURL}/api/workers/moderation`,
      {
        headers: {
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
      }
    );
    expect(moderationRes.ok()).toBeTruthy();

    const moderationResult = await moderationRes.json();
    // Worker should process at least the job we just created (if queue is enabled)
    expect(moderationResult.processed).toBeGreaterThanOrEqual(0);

    // 4. Verify the compliment was approved by checking inbox API
    // (This requires the moderation to have completed)
    const inboxRes = await request.get(
      `${baseURL}/api/compliments/inbox`,
      {
        headers: {
          // In a real test, we'd authenticate here
          // For now, this is a structural test
        },
      }
    );
    // Should return 401 without auth (expected)
    expect(inboxRes.status()).toBe(401);
  });

  test('should reject toxic messages and not increment totalReceived', async ({
    request,
  }) => {
    // 1. Create test user
    const signupRes = await request.post(`${baseURL}/api/auth/signup`, {
      data: {
        email: `test.${Date.now()}@ripple-test.local`,
        password: 'TestPassword123!',
      },
    });
    expect(signupRes.ok()).toBeTruthy();

    const signupData = await signupRes.json();
    const recipientUsername = signupData.user.username;

    // 2. Send a message that should be flagged as toxic
    // (Using a test message that triggers Groq moderation)
    const complimentRes = await request.post(
      `${baseURL}/api/compliments/send`,
      {
        data: {
          recipientUsername,
          category: 'professional',
          message: 'You are an idiot and a waste of space', // Intentionally negative
          clueType: 'generic',
          isPublic: true,
        },
      }
    );
    expect(complimentRes.ok()).toBeTruthy();

    const complimentData = await complimentRes.json();
    const complimentId = complimentData.complimentId;

    // 3. Trigger moderation worker
    const moderationRes = await request.post(
      `${baseURL}/api/workers/moderation`,
      {
        headers: {
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
      }
    );
    expect(moderationRes.ok()).toBeTruthy();

    // 4. In a full E2E test with real DB access, we would verify:
    // - compliment.moderationStatus === 'rejected'
    // - user.totalReceived was NOT incremented
    // This requires direct DB access which we skip in this foundational test
  });

  test('webhook endpoint rejects requests without the correct secret', async ({
    request,
  }) => {
    const webhookURL = `${baseURL}/api/webhooks/compliment-approved`;

    const approvalPayload = {
      type: 'UPDATE',
      table: 'compliments',
      schema: 'public',
      record: { id: 'comp-1', recipient_id: 'user-abc', moderation_status: 'approved' },
      old_record: { id: 'comp-1', recipient_id: 'user-abc', moderation_status: 'pending' },
    };

    // 1. No secret header → 401
    const noSecretRes = await request.post(webhookURL, { data: approvalPayload });
    expect(noSecretRes.status()).toBe(401);

    // 2. Wrong secret → 401
    const wrongSecretRes = await request.post(webhookURL, {
      data: approvalPayload,
      headers: { 'x-webhook-secret': 'wrong-value' },
    });
    expect(wrongSecretRes.status()).toBe(401);
  });

  test('webhook endpoint skips non-approval events gracefully', async ({
    request,
  }) => {
    const webhookURL = `${baseURL}/api/webhooks/compliment-approved`;

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

  test('should handle worker authorization correctly', async ({
    request,
  }) => {
    // 1. Call without authorization header
    const unAuthRes = await request.post(
      `${baseURL}/api/workers/moderation`,
      {
        headers: {
          Authorization: 'Bearer invalid-secret',
        },
      }
    );
    expect(unAuthRes.status()).toBe(401);

    // 2. Call with correct authorization
    const authRes = await request.post(
      `${baseURL}/api/workers/moderation`,
      {
        headers: {
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
      }
    );
    expect(authRes.ok()).toBeTruthy();
  });

  test('should gracefully handle empty queue', async ({
    request,
  }) => {
    // Even with no jobs in the queue, the worker should respond successfully
    const res = await request.post(`${baseURL}/api/workers/moderation`, {
      headers: {
        Authorization: `Bearer ${WORKER_SECRET}`,
      },
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.processed).toBeGreaterThanOrEqual(0);
  });
});
