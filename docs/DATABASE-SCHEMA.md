# Ripple - Database Schema

## Overview

Ripple uses **Supabase** (PostgreSQL) with **Drizzle ORM** for type-safe database access.

---

## Core Tables

### 1. users

Stores user accounts and preferences.

```typescript
// lib/db/schema.ts
import { pgTable, uuid, varchar, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';

export const themeEnum = pgEnum('theme', ['default', 'sunset', 'ocean']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }), // Nullable for SSO users
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // Preferences
  theme: themeEnum('theme').notNull().default('default'),
  emailNotifications: boolean('email_notifications').notNull().default(true),

  // Stats (denormalized for performance)
  currentStreak: integer('current_streak').notNull().default(0),
  totalSent: integer('total_sent').notNull().default(0),
  totalReceived: integer('total_received').notNull().default(0),
});
```

**Indexes:**
- `email` (unique, automatic via constraint)
- `username` (unique, automatic via constraint)

**Sample Row:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "username": "alice_sparkle_42",
  "passwordHash": "$2b$10$...",
  "createdAt": "2026-03-11T10:00:00Z",
  "updatedAt": "2026-03-11T10:00:00Z",
  "theme": "sunset",
  "emailNotifications": true,
  "currentStreak": 3,
  "totalSent": 12,
  "totalReceived": 8
}
```

---

### 2. compliments

Stores all compliments sent/received.

```typescript
export const categoryEnum = pgEnum('category', [
  'professional',
  'creative',
  'personal_growth',
  'just_because'
]);

export const clueTypeEnum = pgEnum('clue_type', [
  'linkedin',
  'company',
  'recent',
  'generic'
]);

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'approved',
  'rejected'
]);

export const compliments = pgTable('compliments', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relationships
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }), // Nullable for anonymous
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Content
  category: categoryEnum('category').notNull(),
  message: varchar('message', { length: 280 }).notNull(),

  // Clue system
  clueType: clueTypeEnum('clue_type').notNull().default('generic'),
  clueText: varchar('clue_text', { length: 255 }),

  // Moderation
  moderationStatus: moderationStatusEnum('moderation_status').notNull().default('pending'),
  moderationResult: json('moderation_result'), // Stores Gemini API response

  // Read tracking
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),

  // Public display
  isPublic: boolean('is_public').notNull().default(true), // For trending wall

  // Threading (Phase 2)
  parentId: uuid('parent_id').references(() => compliments.id, { onDelete: 'cascade' }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Indexes:**
```typescript
// Create indexes for common queries
export const complimentsRecipientIdIdx = index('compliments_recipient_id_idx').on(compliments.recipientId);
export const complimentsCreatedAtIdx = index('compliments_created_at_idx').on(compliments.createdAt);
export const complimentsModerationStatusIdx = index('compliments_moderation_status_idx').on(compliments.moderationStatus);
export const complimentsIsPublicIdx = index('compliments_is_public_idx').on(compliments.isPublic);
```

**Sample Row:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "senderId": null,
  "recipientId": "550e8400-e29b-41d4-a716-446655440000",
  "category": "professional",
  "message": "Your presentation yesterday was incredibly inspiring! The way you explained complex concepts made everything so clear.",
  "clueType": "linkedin",
  "clueText": "Someone who follows you on LinkedIn",
  "moderationStatus": "approved",
  "moderationResult": {
    "approved": true,
    "categories": {
      "abuse": 0.01,
      "sexual": 0.00,
      "toxic": 0.02,
      "dangerous": 0.00,
      "hate": 0.00
    },
    "reason": "Clean, positive feedback"
  },
  "isRead": false,
  "readAt": null,
  "isPublic": true,
  "parentId": null,
  "createdAt": "2026-03-11T14:30:00Z",
  "updatedAt": "2026-03-11T14:30:15Z"
}
```

---

### 3. teams (Phase 3 - Team Mode)

Stores team/company information for SSO integration.

```typescript
export const ssoProviderEnum = pgEnum('sso_provider', [
  'google',
  'microsoft',
  'okta',
  'auth0'
]);

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),

  // SSO Configuration
  ssoProvider: ssoProviderEnum('sso_provider'),
  ssoConfig: json('sso_config'), // Stores OAuth credentials, domain, etc.

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Sample Row:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "ssoProvider": "google",
  "ssoConfig": {
    "domain": "acme.com",
    "clientId": "xxx.apps.googleusercontent.com",
    "allowedEmails": ["*@acme.com"]
  },
  "createdAt": "2026-03-11T09:00:00Z",
  "updatedAt": "2026-03-11T09:00:00Z"
}
```

---

### 4. teamMembers (Phase 3 - Team Mode)

Stores team membership and roles.

```typescript
export const teamRoleEnum = pgEnum('team_role', ['admin', 'member']);

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});
```

**Indexes:**
```typescript
export const teamMembersTeamIdIdx = index('team_members_team_id_idx').on(teamMembers.teamId);
export const teamMembersUserIdIdx = index('team_members_user_id_idx').on(teamMembers.userId);
```

**Sample Row:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "teamId": "770e8400-e29b-41d4-a716-446655440002",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin",
  "joinedAt": "2026-03-11T09:15:00Z"
}
```

---

## Relationships

```
users (1) ──< (many) compliments [senderId]
users (1) ──< (many) compliments [recipientId]
users (1) ──< (many) teamMembers
teams (1) ──< (many) teamMembers
compliments (1) ──< (many) compliments [parentId] (self-referencing for threads)
```

---

## Common Queries

### 1. Get User's Inbox (Approved Compliments)

```typescript
import { eq, and, desc } from 'drizzle-orm';

const inboxCompliments = await db.query.compliments.findMany({
  where: and(
    eq(compliments.recipientId, userId),
    eq(compliments.moderationStatus, 'approved')
  ),
  orderBy: [desc(compliments.createdAt)],
  limit: 20,
  offset: 0,
});
```

**SQL Equivalent:**
```sql
SELECT * FROM compliments
WHERE recipient_id = $1
  AND moderation_status = 'approved'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

---

### 2. Get Trending Wall (Public Compliments)

```typescript
const trendingCompliments = await db.query.compliments.findMany({
  where: and(
    eq(compliments.isPublic, true),
    eq(compliments.moderationStatus, 'approved')
  ),
  columns: {
    id: true,
    category: true,
    message: true,
    createdAt: true,
    // Exclude: senderId, recipientId, clueText
  },
  orderBy: [desc(compliments.createdAt)],
  limit: 20,
});
```

**SQL Equivalent:**
```sql
SELECT id, category, message, created_at
FROM compliments
WHERE is_public = true
  AND moderation_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;
```

---

### 3. Get User by Username (For Wall Page)

```typescript
const user = await db.query.users.findFirst({
  where: eq(users.username, username),
  columns: {
    id: true,
    username: true,
    theme: true,
    totalReceived: true,
    // Exclude: email, passwordHash
  },
});
```

**SQL Equivalent:**
```sql
SELECT id, username, theme, total_received
FROM users
WHERE username = $1;
```

---

### 4. Find Active Users for Streak Check

```typescript
import { gte, exists } from 'drizzle-orm';

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const activeUsers = await db.query.users.findMany({
  where: exists(
    db.select()
      .from(compliments)
      .where(
        and(
          eq(compliments.senderId, users.id),
          gte(compliments.createdAt, yesterday)
        )
      )
  ),
});
```

**SQL Equivalent:**
```sql
SELECT u.*
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM compliments c
  WHERE c.sender_id = u.id
    AND c.created_at >= $1
);
```

---

### 5. Mark Compliment as Read

```typescript
await db.update(compliments)
  .set({
    isRead: true,
    readAt: new Date(),
  })
  .where(eq(compliments.id, complimentId));
```

**SQL Equivalent:**
```sql
UPDATE compliments
SET is_read = true, read_at = NOW()
WHERE id = $1;
```

---

## Migrations

### Initial Migration

```bash
# Generate migration
pnpm drizzle-kit generate

# Push to database
pnpm drizzle-kit push
```

**Generated SQL (partial):**
```sql
CREATE TYPE theme AS ENUM ('default', 'sunset', 'ocean');
CREATE TYPE category AS ENUM ('professional', 'creative', 'personal_growth', 'just_because');
CREATE TYPE clue_type AS ENUM ('linkedin', 'company', 'recent', 'generic');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  theme theme NOT NULL DEFAULT 'default',
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  current_streak INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_received INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE compliments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category category NOT NULL,
  message VARCHAR(280) NOT NULL,
  clue_type clue_type NOT NULL DEFAULT 'generic',
  clue_text VARCHAR(255),
  moderation_status moderation_status NOT NULL DEFAULT 'pending',
  moderation_result JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  is_public BOOLEAN NOT NULL DEFAULT true,
  parent_id UUID REFERENCES compliments(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX compliments_recipient_id_idx ON compliments(recipient_id);
CREATE INDEX compliments_created_at_idx ON compliments(created_at);
CREATE INDEX compliments_moderation_status_idx ON compliments(moderation_status);
CREATE INDEX compliments_is_public_idx ON compliments(is_public);
```

---

## Seed Data (Development)

```typescript
// scripts/seed.ts
import { db } from '@/lib/db/client';
import { users, compliments } from '@/lib/db/schema';
import { hash } from 'bcrypt';

async function seed() {
  // Create test users
  const [alice, bob] = await db.insert(users).values([
    {
      email: 'alice@example.com',
      username: 'alice_sparkle_42',
      passwordHash: await hash('password123', 10),
      theme: 'sunset',
    },
    {
      email: 'bob@example.com',
      username: 'bob_awesome_99',
      passwordHash: await hash('password123', 10),
      theme: 'default',
    },
  ]).returning();

  // Create test compliments
  await db.insert(compliments).values([
    {
      senderId: bob.id,
      recipientId: alice.id,
      category: 'professional',
      message: 'Your presentation was amazing!',
      clueType: 'linkedin',
      clueText: 'Someone who follows you on LinkedIn',
      moderationStatus: 'approved',
      isPublic: true,
    },
    {
      senderId: null, // Anonymous
      recipientId: alice.id,
      category: 'just_because',
      message: 'You make the office a brighter place!',
      clueType: 'generic',
      clueText: 'Someone special',
      moderationStatus: 'approved',
      isPublic: false,
    },
  ]);

  console.log('✅ Database seeded!');
}

seed();
```

---

## Performance Considerations

### Indexes
- **recipientId**: Fast inbox queries (O(log n) instead of O(n))
- **createdAt**: Efficient sorting for trending wall
- **moderationStatus**: Quick filtering for approved compliments
- **isPublic**: Fast public compliment queries

### Query Optimization
1. **Use `columns` parameter** to exclude sensitive fields (passwordHash, email)
2. **Pagination**: Always use `limit` + `offset` to avoid full table scans
3. **Avoid N+1 queries**: Use Drizzle's `with` for relations
4. **Monitor slow queries** via Supabase dashboard

### Scaling Strategy
- **Phase 1 (MVP)**: Single database, all queries direct
- **Phase 2 (Growth)**: Add Redis for trending wall cache
- **Phase 3 (Scale)**: Read replicas for inbox queries, primary for writes

---

## Data Retention Policy

### User Data
- **Active accounts**: Retained indefinitely
- **Deleted accounts**: Soft delete (mark as deleted), hard delete after 30 days
- **Email addresses**: Hashed after account deletion

### Compliments
- **Approved**: Retained indefinitely
- **Rejected**: Retained for 90 days (audit trail), then deleted
- **Pending**: Auto-reject after 24 hours if moderation fails

### Backups
- **Daily automated backups**: 7-day retention (Supabase free tier)
- **Manual backups**: Before major migrations, stored in S3

---

## Schema Versioning

### Current Version: v1.0.0 (MVP)

### Future Versions:

**v1.1.0 (Phase 2)**
- Add `user_stats` table for analytics
- Add `compliment_reactions` table (like/favorite)

**v2.0.0 (Phase 3 - Team Mode)**
- Add `teams` and `teamMembers` tables
- Add `team_id` foreign key to `compliments` (optional)

**v3.0.0 (Phase 4 - Advanced Features)**
- Add `compliment_templates` table
- Add `user_preferences` JSONB column for extensibility
- Add `moderation_overrides` table for manual review

---

## Conclusion

This schema is designed for:
1. **Anonymity**: Nullable `senderId`, no user identifiers on trending wall
2. **Safety**: AI moderation as gatekeeper, status-based filtering
3. **Performance**: Strategic indexes, denormalized stats
4. **Extensibility**: Threading support, team mode ready, JSONB for flexibility
5. **Auditability**: Moderation results stored, timestamps on all tables
