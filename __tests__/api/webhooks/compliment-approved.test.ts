import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these are available when vi.mock factories run (which are hoisted)
const mockTrigger = vi.hoisted(() => vi.fn());
const mockHeadersMap = vi.hoisted(() => new Map<string, string>());

vi.mock('@/lib/soketi/server', () => ({
  soketiServer: { trigger: mockTrigger },
}));

vi.mock('next/headers', () => ({
  headers: () => ({ get: (key: string) => mockHeadersMap.get(key) ?? null }),
}));

import { POST } from '@/app/api/webhooks/compliment-approved/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, secret?: string): Request {
  mockHeadersMap.clear();
  if (secret !== undefined) {
    mockHeadersMap.set('x-webhook-secret', secret);
  }
  return new Request('http://localhost/api/webhooks/compliment-approved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function approvalPayload(overrides: {
  type?: string;
  newStatus?: string;
  oldStatus?: string;
  recipientId?: string;
} = {}) {
  return {
    type: overrides.type ?? 'UPDATE',
    table: 'compliments',
    schema: 'public',
    record: {
      id: 'comp-1',
      recipient_id: overrides.recipientId ?? 'user-abc',
      moderation_status: overrides.newStatus ?? 'approved',
    },
    old_record: {
      id: 'comp-1',
      recipient_id: overrides.recipientId ?? 'user-abc',
      moderation_status: overrides.oldStatus ?? 'pending',
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/compliment-approved', () => {
  beforeEach(() => {
    mockTrigger.mockReset();
    mockHeadersMap.clear();
  });

  // ── Authentication ──────────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('returns 401 when x-webhook-secret header is missing', async () => {
      const res = await POST(makeRequest(approvalPayload(), undefined));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('returns 401 when x-webhook-secret is wrong', async () => {
      const res = await POST(makeRequest(approvalPayload(), 'wrong-secret'));
      expect(res.status).toBe(401);
      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('proceeds when x-webhook-secret matches WORKER_SECRET', async () => {
      mockTrigger.mockResolvedValue(undefined);
      const res = await POST(makeRequest(approvalPayload(), 'test-worker-secret-abc123'));
      expect(res.status).toBe(200);
    });
  });

  // ── Payload guards ──────────────────────────────────────────────────────────

  describe('Payload guards — skipped events', () => {
    const SECRET = 'test-worker-secret-abc123';

    it('skips INSERT events', async () => {
      const res = await POST(makeRequest(approvalPayload({ type: 'INSERT' }), SECRET));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.skipped).toBe(true);
      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('skips DELETE events', async () => {
      const res = await POST(makeRequest(approvalPayload({ type: 'DELETE' }), SECRET));
      const body = await res.json();
      expect(body.skipped).toBe(true);
      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('skips UPDATE where new status is still pending', async () => {
      const res = await POST(makeRequest(approvalPayload({ newStatus: 'pending', oldStatus: 'pending' }), SECRET));
      const body = await res.json();
      expect(body.skipped).toBe(true);
      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('skips UPDATE where new status is rejected', async () => {
      const res = await POST(makeRequest(approvalPayload({ newStatus: 'rejected', oldStatus: 'pending' }), SECRET));
      const body = await res.json();
      expect(body.skipped).toBe(true);
      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('skips UPDATE where old_record was already approved (duplicate fire)', async () => {
      const res = await POST(makeRequest(approvalPayload({ newStatus: 'approved', oldStatus: 'approved' }), SECRET));
      const body = await res.json();
      expect(body.skipped).toBe(true);
      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('Happy path — approved transition', () => {
    const SECRET = 'test-worker-secret-abc123';

    it('calls soketiServer.trigger with correct channel and event', async () => {
      mockTrigger.mockResolvedValue(undefined);
      const res = await POST(makeRequest(approvalPayload({ recipientId: 'user-xyz' }), SECRET));

      expect(res.status).toBe(200);
      expect(mockTrigger).toHaveBeenCalledOnce();
      const [channel, event, data] = mockTrigger.mock.calls[0];
      expect(channel).toBe('private-user-user-xyz');
      expect(event).toBe('new-compliment');
      expect(data.message).toBe('You have a secret compliment waiting');
      expect(typeof data.timestamp).toBe('string');
    });

    it('returns { ok: true } on success', async () => {
      mockTrigger.mockResolvedValue(undefined);
      const res = await POST(makeRequest(approvalPayload(), SECRET));
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.skipped).toBeUndefined();
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  describe('Error handling', () => {
    const SECRET = 'test-worker-secret-abc123';

    it('returns 400 for malformed JSON body', async () => {
      mockHeadersMap.set('x-webhook-secret', SECRET);
      const req = new Request('http://localhost/api/webhooks/compliment-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json{{{',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid payload');
    });

    it('returns 500 when Soketi trigger throws', async () => {
      mockTrigger.mockRejectedValue(new Error('Soketi unreachable'));
      const res = await POST(makeRequest(approvalPayload(), SECRET));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Soketi push failed');
    });
  });
});
