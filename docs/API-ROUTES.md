# Ripple - API Routes Documentation

## Overview

All API routes are located in `app/api/` and follow Next.js 16 App Router conventions.

---

## Authentication Routes

### POST /api/auth/signup

Register a new user.

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "securepassword123",
  "username": "alice"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "username": "alice"
  }
}
```

**Validation:**
- Email: Valid email format
- Password: Min 8 characters, max 255 characters
- Username (optional): If omitted, auto-generated using `nanoid` (format: `{random}_sparkle_{number}`). If provided, 3–30 characters, alphanumeric + underscores/hyphens, no reserved words.

**Errors:**
- `400`: Invalid input (email/password/username validation failed)
- `409`: Email already exists
- `409`: Username already taken (`code: "USERNAME_TAKEN"`)

---

### POST /api/auth/signin

Sign in existing user.

**Request Body:**
```json
{
  "email": "alice@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "username": "alice_sparkle_42"
  }
}
```

**Errors:**
- `400`: Invalid input
- `401`: Invalid credentials

---

### POST /api/auth/signout

Sign out current user.

**Response (200):**
```json
{
  "success": true
}
```

---

### GET /api/auth/session

Get current user session.

**Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alice@example.com",
    "username": "alice_sparkle_42",
    "theme": "sunset"
  }
}
```

**Response (401 - Not authenticated):**
```json
{
  "user": null
}
```

---

## Compliment Routes

### POST /api/compliments/send

Send a compliment to another user.

**Request Body:**
```json
{
  "recipientUsername": "bob_awesome_99",
  "category": "professional",
  "message": "Your presentation yesterday was incredibly inspiring!",
  "clueType": "linkedin",
  "aiGenerated": false
}
```

**Field Validation:**
- `recipientUsername` (required): Valid username, must exist
- `category` (required): One of: `professional`, `creative`, `personal_growth`, `just_because`
- `message` (required): 1-280 characters
- `clueType` (optional): One of: `linkedin`, `company`, `recent`, `generic` (default: `generic`)
- `aiGenerated` (optional): Boolean (future use)

**Response (200):**
```json
{
  "success": true,
  "complimentId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Side Effects:**
1. Creates compliment with `moderationStatus: pending`
2. Increments sender `totalSent` (authenticated senders only)
3. `after()` runs in background: calls Groq for moderation, updates status, triggers Soketi push on approval

**Errors:**
- `400`: Invalid input (validation failed)
- `401`: Not authenticated
- `404`: Recipient username not found
- `429`: Rate limit exceeded (max 10 per day)

---

### GET /api/compliments/inbox

Get current user's inbox (received compliments).

**Query Parameters:**
- `status` (optional): Filter by moderation status (`approved`, `pending`, `rejected`). Default: `approved`
- `unread` (optional): Boolean, filter for unread compliments only
- `limit` (optional): Number of compliments per page (default: 20, max: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```
GET /api/compliments/inbox?status=approved&unread=true&limit=20&offset=0
```

**Response (200):**
```json
{
  "compliments": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "category": "professional",
      "message": "Your presentation yesterday was incredibly inspiring!",
      "clueType": "linkedin",
      "clueText": "Someone who follows you on LinkedIn",
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-03-11T14:30:00Z"
    }
  ],
  "total": 1,
  "hasMore": false
}
```

**Notes:**
- `senderId` is **never** exposed to protect anonymity
- Only `approved` compliments shown by default
- Results sorted by `createdAt DESC`

**Errors:**
- `401`: Not authenticated

---

### GET /api/compliments/[id]

Get details of a single compliment.

**Path Parameters:**
- `id`: Compliment UUID

**Response (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "category": "professional",
  "message": "Your presentation yesterday was incredibly inspiring!",
  "clueType": "linkedin",
  "clueText": "Someone who follows you on LinkedIn",
  "isRead": true,
  "readAt": "2026-03-11T15:00:00Z",
  "createdAt": "2026-03-11T14:30:00Z"
}
```

**Authorization:**
- User must be the recipient of the compliment

**Errors:**
- `401`: Not authenticated
- `403`: Forbidden (not the recipient)
- `404`: Compliment not found

---

### PATCH /api/compliments/[id]/read

Mark a compliment as read.

**Path Parameters:**
- `id`: Compliment UUID

**Request Body:**
```json
{
  "isRead": true
}
```

**Response (200):**
```json
{
  "success": true,
  "readAt": "2026-03-11T15:00:00Z"
}
```

**Side Effects:**
- Sets `isRead: true` and `readAt: now()`

**Errors:**
- `401`: Not authenticated
- `403`: Forbidden (not the recipient)
- `404`: Compliment not found

---

### GET /api/compliments/trending

Get public compliments for trending wall.

**Query Parameters:**
- `limit` (optional): Number of compliments (default: 20, max: 50)
- `offset` (optional): Pagination offset (default: 0)
- `category` (optional): Filter by category

**Example Request:**
```
GET /api/compliments/trending?limit=20&offset=0&category=professional
```

**Response (200):**
```json
{
  "compliments": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "category": "professional",
      "message": "Your presentation yesterday was incredibly inspiring!",
      "createdAt": "2026-03-11T14:30:00Z"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

**Notes:**
- Only shows compliments with `isPublic: true` and `moderationStatus: approved`
- **No** `senderId`, `recipientId`, or `clueText` exposed (full anonymity)
- Sorted by `createdAt DESC`

**Errors:**
- None (public endpoint)

---

## User Routes

### GET /api/users/[username]

Get public user profile (for wall pages).

**Path Parameters:**
- `username`: User's unique username

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice_sparkle_42",
  "theme": "sunset",
  "totalReceived": 8,
  "createdAt": "2026-03-11T10:00:00Z"
}
```

**Notes:**
- Email and passwordHash **never** exposed
- Used to render `/wall/[username]` pages

**Errors:**
- `404`: User not found

---

### GET /api/users/check-username

Check whether a username is available (public endpoint, no auth required).

**Query Parameters:**
- `username` (required): Username to check

**Example Request:**
```
GET /api/users/check-username?username=alice
```

**Response (200):**
```json
{
  "available": true
}
```

**Validation:**
- 3–30 characters, alphanumeric + underscores/hyphens
- Must not be a reserved word (e.g. `admin`, `api`, `dashboard`, `wall`)

**Errors:**
- `400`: Invalid username format (fails validation)

---

### GET /api/users/me/stats

Get current user's stats.

**Response (200):**
```json
{
  "totalSent": 12,
  "totalReceived": 8,
  "currentStreak": 3,
  "unreadCount": 2,
  "joinedAt": "2026-03-11T10:00:00Z"
}
```

**Errors:**
- `401`: Not authenticated

---

### PATCH /api/users/me/settings

Update current user's settings.

**Request Body:**
```json
{
  "username": "new_username",
  "theme": "ocean",
  "emailNotifications": false
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "username": "new_username",
    "theme": "ocean",
    "emailNotifications": false
  }
}
```

**Validation:**
- `username` (optional): 3–30 characters, alphanumeric + underscores/hyphens, no reserved words
- `theme` (optional): One of: `default`, `sunset`, `ocean`
- `emailNotifications` (optional): Boolean

**Errors:**
- `400`: Invalid input
- `401`: Not authenticated
- `409`: Username already taken (`code: "USERNAME_TAKEN"`)

---

## Webhook Routes

### POST /api/webhooks/compliment-approved

Supabase DB webhook — called when a compliment's `moderation_status` changes to `approved`.

**Headers:**
- `Authorization: Bearer <WEBHOOK_SECRET>` (set in Supabase webhook config via `x-webhook-secret`)

**Request Body** (sent by Supabase):
```json
{
  "type": "UPDATE",
  "table": "compliments",
  "record": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "recipient_id": "550e8400-e29b-41d4-a716-446655440000",
    "moderation_status": "approved"
  }
}
```

**Response (200):**
```json
{ "ok": true }
```

**Side Effects:**
- Increments recipient `totalReceived`
- Triggers Soketi push notification to `private-user-{recipientId}`

**Errors:**
- `401`: Missing or invalid Bearer token
- `400`: Unexpected payload shape

---

## Worker Routes

### POST /api/workers/daily-streak

Runs the daily streak check: increments active streaks, resets inactive, sends milestone rewards.

**Headers:**
- `Authorization: Bearer <WORKER_SECRET>`

**Response (200):**
```json
{
  "activeUsers": 42,
  "milestones": 3
}
```

**Notes:**
- Called by Vercel Cron daily at midnight UTC
- Safe to re-run (idempotent within the same day)

**Errors:**
- `401`: Missing or invalid `WORKER_SECRET`

---

### POST /api/soketi/auth

Authenticate user for Soketi private channels.

**Request Body:**
```json
{
  "socket_id": "123456.789012",
  "channel_name": "private-user-550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "auth": "soketi_signature_here"
}
```

**Authorization:**
- User must be authenticated
- Channel name must match user's ID: `private-user-{userId}`

**Errors:**
- `401`: Not authenticated
- `403`: Channel name doesn't match user ID

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

### Global Rate Limits
- **Authenticated users**: 100 requests/minute
- **Anonymous users**: 20 requests/minute

### Endpoint-Specific Limits
- **POST /api/compliments/send**: 10 requests/day per user
- **POST /api/auth/signup**: 5 requests/hour per IP
- **POST /api/auth/signin**: 10 requests/hour per IP

---

## Pagination

All list endpoints support pagination:

**Request:**
```
GET /api/compliments/inbox?limit=20&offset=40
```

**Response:**
```json
{
  "compliments": [...],
  "total": 100,
  "hasMore": true,
  "nextOffset": 60
}
```

**Best Practices:**
- Default `limit`: 20
- Max `limit`: 50
- Use `offset` for page-based navigation
- Check `hasMore` to determine if more results exist

---

## API Versioning

### Current Version: v1

All routes are implicitly v1. Future versions will use URL prefixing:

- v1: `/api/compliments/send` (current)
- v2: `/api/v2/compliments/send` (future)

### Breaking Changes Policy
- Minor changes (new fields): No version bump
- Breaking changes (removed fields, changed behavior): New version

---

## API Testing

### Example: Send Compliment

```bash
curl -X POST https://ripple.vercel.app/api/compliments/send \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "recipientUsername": "bob_awesome_99",
    "category": "professional",
    "message": "Great job on the project!",
    "clueType": "linkedin"
  }'
```

### Example: Get Inbox

```bash
curl -X GET "https://ripple.vercel.app/api/compliments/inbox?limit=20" \
  -H "Cookie: session=..."
```

---

## Worker Testing

### Trigger Daily Streak Locally

```bash
curl -X POST http://localhost:3000/api/workers/daily-streak \
  -H "Authorization: Bearer your-worker-secret"
```

---

## API Client Examples

### TypeScript/Fetch

```typescript
// lib/api/compliments.ts
export async function sendCompliment(data: {
  recipientUsername: string;
  category: string;
  message: string;
  clueType?: string;
}) {
  const res = await fetch('/api/compliments/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error);
  }

  return res.json();
}
```

### React Hook

```typescript
// hooks/useCompliments.ts
import useSWR from 'swr';

export function useInbox() {
  const { data, error, mutate } = useSWR('/api/compliments/inbox', fetcher);

  return {
    compliments: data?.compliments || [],
    isLoading: !data && !error,
    error,
    refresh: mutate,
  };
}
```

---

## Conclusion

This API is designed for:
1. **Type safety**: Zod validation on all inputs
2. **Security**: Authentication, rate limiting, CORS
3. **Privacy**: No sender/recipient exposure on public endpoints
4. **Performance**: Pagination, indexes, efficient queries
5. **Developer experience**: Clear errors, consistent responses
