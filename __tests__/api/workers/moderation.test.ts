import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDequeue = vi.hoisted(() => vi.fn());
const mockAck = vi.hoisted(() => vi.fn());
const mockNack = vi.hoisted(() => vi.fn());
const mockEnqueue = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockModerate = vi.hoisted(() => vi.fn());
const mockHeadersMap = vi.hoisted(() => new Map<string, string>());

vi.mock('@/lib/queue/client', () => ({
  dequeue: mockDequeue,
  ack: mockAck,
  nack: mockNack,
  enqueue: mockEnqueue,
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    query: { compliments: { findFirst: mockFindFirst } },
    update: () => ({ set: () => ({ where: mockDbUpdate }) }),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  compliments: {},
  users: { totalReceived: 'totalReceived', id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
}));

vi.mock('@/lib/ai/moderation', () => ({
  moderateWithGroq: mockModerate,
}));

vi.mock('next/headers', () => ({
  headers: () => ({ get: (key: string) => mockHeadersMap.get(key) ?? null }),
}));

import { POST } from '@/app/api/workers/moderation/route';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_SECRET = 'test-worker-secret-abc123';

// The moderation POST() reads auth from next/headers (no Request arg).
// This helper sets the mock header map before each call.
function setAuth(secret?: string) {
  mockHeadersMap.clear();
  if (secret) mockHeadersMap.set('authorization', `Bearer ${secret}`);
}

function notificationEnqueueCalls(): unknown[][] {
  return (mockEnqueue.mock.calls as unknown[][]).filter(
    (call) => call[0] === 'notifications'
  );
}

function moderationEnqueueCalls(): unknown[][] {
  return (mockEnqueue.mock.calls as unknown[][]).filter(
    (call) => call[0] === 'moderation'
  );
}

const PENDING_COMPLIMENT = {
  id: 'comp-1',
  recipientId: 'user-1',
  message: 'You are amazing!',
  moderationStatus: 'pending' as const,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/workers/moderation', () => {
  beforeEach(() => {
    mockDequeue.mockReset();
    mockAck.mockReset();
    mockNack.mockReset();
    mockEnqueue.mockReset();
    mockDbUpdate.mockReset();
    mockFindFirst.mockReset();
    mockModerate.mockReset();
    mockHeadersMap.clear();
    mockDbUpdate.mockResolvedValue(undefined);
    mockAck.mockResolvedValue(undefined);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('returns 401 without Authorization header', async () => {
      setAuth();
      const res = await POST();
      expect(res.status).toBe(401);
    });

    it('returns 401 with wrong Bearer token', async () => {
      setAuth('bad-secret');
      const res = await POST();
      expect(res.status).toBe(401);
    });

    it('returns 200 with correct Bearer token when queue is empty', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([]);
      const res = await POST();
      expect(res.status).toBe(200);
    });
  });

  // ── Core moderation flow ────────────────────────────────────────────────────

  describe('Moderation flow', () => {
    it('approves a clean compliment and increments totalReceived', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1', attempts: 0 } },
      ]);
      mockFindFirst.mockResolvedValue(PENDING_COMPLIMENT);
      mockModerate.mockResolvedValue({ approved: true, reason: 'clean' });

      const res = await POST();
      const body = await res.json();

      expect(body.succeeded).toBe(1);
      expect(body.failed).toBe(0);
      expect(mockModerate).toHaveBeenCalledWith(PENDING_COMPLIMENT.message);
      // Two DB updates: set moderationStatus + increment totalReceived
      expect(mockDbUpdate).toHaveBeenCalledTimes(2);
    });

    it('rejects a toxic compliment and does NOT increment totalReceived', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1', attempts: 0 } },
      ]);
      mockFindFirst.mockResolvedValue(PENDING_COMPLIMENT);
      mockModerate.mockResolvedValue({ approved: false, reason: 'toxic' });

      const res = await POST();
      const body = await res.json();

      expect(body.succeeded).toBe(1);
      // Only one DB update: set moderationStatus (no totalReceived increment)
      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
    });

    it('skips compliments that are already moderated (idempotency)', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1' } },
      ]);
      mockFindFirst.mockResolvedValue({ ...PENDING_COMPLIMENT, moderationStatus: 'approved' });

      const res = await POST();

      expect(mockModerate).not.toHaveBeenCalled();
      expect(mockAck).toHaveBeenCalledWith('moderation', 1);
      const body = await res.json();
      expect(body.succeeded).toBe(1);
    });

    it('skips compliments not found in the DB', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'missing-id' } },
      ]);
      mockFindFirst.mockResolvedValue(null);

      const res = await POST();

      expect(mockModerate).not.toHaveBeenCalled();
      expect(mockAck).toHaveBeenCalledWith('moderation', 1);
      const body = await res.json();
      expect(body.succeeded).toBe(1);
    });

    it('dead-letters a compliment after 3 failed attempts', async () => {
      setAuth(VALID_SECRET);
      // attempts=2 → (2+1)=3 triggers dead-letter path
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1', attempts: 2 } },
      ]);
      mockFindFirst.mockResolvedValue(PENDING_COMPLIMENT);

      const res = await POST();

      expect(mockModerate).not.toHaveBeenCalled();
      expect(mockDbUpdate).toHaveBeenCalled(); // marks compliment rejected
      expect(mockAck).toHaveBeenCalledWith('moderation', 1);
      const body = await res.json();
      expect(body.succeeded).toBe(1);
    });
  });

  // ── Critical: no notification enqueue ───────────────────────────────────────

  describe('Notification queue — MUST NOT be called (webhooks handle this now)', () => {
    it('does NOT enqueue to the notifications queue after approval', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1', attempts: 0 } },
      ]);
      mockFindFirst.mockResolvedValue(PENDING_COMPLIMENT);
      mockModerate.mockResolvedValue({ approved: true, reason: 'clean' });

      await POST();

      expect(notificationEnqueueCalls()).toHaveLength(0);
    });

    it('does NOT enqueue to the notifications queue after rejection', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1', attempts: 0 } },
      ]);
      mockFindFirst.mockResolvedValue(PENDING_COMPLIMENT);
      mockModerate.mockResolvedValue({ approved: false, reason: 'toxic' });

      await POST();

      expect(notificationEnqueueCalls()).toHaveLength(0);
    });
  });

  // ── Queue error handling ─────────────────────────────────────────────────────

  describe('Queue error handling', () => {
    it('returns graceful response when queue is unavailable', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockRejectedValue(new Error('Queue connection failed'));

      const res = await POST();
      const body = await res.json();

      expect(body.error).toBe('Queue unavailable');
      expect(body.processed).toBe(0);
    });

    it('re-enqueues to moderation with incremented attempts on error', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1', attempts: 0 } },
      ]);
      mockFindFirst.mockResolvedValue(PENDING_COMPLIMENT);
      mockModerate.mockRejectedValue(new Error('Groq API error'));
      mockEnqueue.mockResolvedValue(undefined);

      const res = await POST();
      const body = await res.json();

      const retryCalls = moderationEnqueueCalls();
      expect(retryCalls.length).toBeGreaterThan(0);
      expect(retryCalls[0][1]).toMatchObject({ complimentId: 'comp-1', attempts: 1 });
      expect(body.failed).toBe(1);
    });

    it('processes multiple jobs in a single run', async () => {
      setAuth(VALID_SECRET);
      mockDequeue.mockResolvedValue([
        { msg_id: 1, message: { complimentId: 'comp-1', attempts: 0 } },
        { msg_id: 2, message: { complimentId: 'comp-2', attempts: 0 } },
      ]);
      mockFindFirst.mockResolvedValue(PENDING_COMPLIMENT);
      mockModerate.mockResolvedValue({ approved: true, reason: 'clean' });

      const res = await POST();
      const body = await res.json();

      expect(body.processed).toBe(2);
      expect(body.succeeded).toBe(2);
    });
  });
});
