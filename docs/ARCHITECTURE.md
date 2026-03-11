# Ripple - System Architecture

## High-Level Architecture

Ripple is a Next.js application using an event-driven architecture for async processing:

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       ├─────── HTTP (API Routes) ────────┐
       │                                   │
       ├─────── Soketi (Real-time) ───────┤
       │                                   ▼
┌──────▼──────────────────────────────────────┐
│          Next.js App (Vercel)               │
│  ┌────────────────────────────────────┐    │
│  │  API Routes                         │    │
│  │  - /api/auth/[...all]              │    │
│  │  - /api/compliments/*              │    │
│  │  - /api/inngest (webhook)          │    │
│  └───────────┬────────────────────────┘    │
│              │                              │
│  ┌───────────▼────────────────────────┐    │
│  │  Inngest Client                     │    │
│  │  - Emit events                      │    │
│  │  - compliment.sent                  │    │
│  └───────────┬────────────────────────┘    │
└──────────────┼──────────────────────────────┘
               │
    ┌──────────┴───────────┬──────────────┐
    │                      │              │
    ▼                      ▼              ▼
┌─────────┐       ┌──────────────┐   ┌─────────┐
│Supabase │       │   Inngest    │   │ Soketi  │
│Postgres │       │   (Cloud)    │   │(fly.io) │
│         │       │              │   │         │
│ Users   │       │ Functions:   │   │ Notify  │
│Complmts │       │ - moderate   │   │ Users   │
│ Stats   │       │ - send-email │   │         │
└─────────┘       │ - streaks    │   └─────────┘
                  └───┬──────────┘
                      │
              ┌───────┴────────┬─────────┐
              ▼                ▼         ▼
         ┌────────┐      ┌─────────┐  ┌────────┐
         │ Gemini │      │ Resend  │  │Supabase│
         │   AI   │      │  Email  │  │ Update │
         └────────┘      └─────────┘  └────────┘
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Animations**: framer-motion
- **Forms**: React Hook Form + Zod

### Backend
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Authentication**: Supabase Auth
- **Event System**: Inngest
- **Real-time**: Soketi (self-hosted on fly.io)
- **AI**: Gemini API (Google Generative AI)
- **Email**: Resend (optional)

---

## Event-Driven Architecture

### Why Event-Driven?

1. **Decouples heavy processing** from API routes (AI moderation, emails)
2. **Built-in retries** and error handling via Inngest
3. **Scalable** - async processing doesn't block user requests
4. **Observability** - function logs, execution history in Inngest dashboard
5. **Easy testing** - Inngest step.run() enables unit testing

---

## Core Workflows

### Flow 1: Sending a Compliment

```
User → Send Form → POST /api/compliments/send
                         │
                         ├─ Create compliment (status: pending)
                         ├─ Emit Inngest event: "compliment.sent"
                         └─ Return success to user ✅

Inngest picks up event:

"compliment.sent" → moderate-compliment function
                         │
                         ├─ Step 1: Fetch compliment from DB
                         ├─ Step 2: Call Gemini API for moderation
                         ├─ Step 3: Update status (approved/rejected)
                         └─ If approved → Emit "compliment.approved"

"compliment.approved" → send-notification-email function (optional)
                    └─ send-soketi-notification function
                         │
                         ├─ Check user email preferences
                         ├─ Send email via Resend (if enabled)
                         └─ Trigger Soketi event on user channel

User receives:
                         ├─ Real-time toast notification (Soketi)
                         └─ Email notification (optional)
```

### Flow 2: Receiving & Revealing

```
User navigates to /inbox
                         │
                         └─ GET /api/compliments/inbox
                              │
                              ├─ Query: recipientId = currentUser
                              ├─ Filter: moderationStatus = "approved"
                              └─ Return compliments

User sees compliment with blur effect + clue

User clicks to reveal
                         │
                         ├─ Play reveal animation (blur → clear)
                         ├─ PATCH /api/compliments/[id]/read
                         │    └─ Update: isRead = true, readAt = now()
                         └─ Show "Send one back" CTA
```

### Flow 3: Real-Time Notifications

```
Inngest: compliment.approved event
                         │
                         └─ send-soketi-notification function
                              │
                              └─ soketiServer.trigger(
                                   channel: "private-user-{recipientId}",
                                   event: "new-compliment",
                                   data: { message: "You have a secret compliment waiting" }
                                 )

Frontend: app/layout.tsx
                         │
                         ├─ useEffect: Subscribe to private-user-{userId} via Soketi
                         ├─ Listen for "new-compliment" event
                         └─ On event: toast.success("You have a secret compliment waiting")
```

### Flow 4: Streak Tracking (Scheduled)

```
Inngest scheduled function (cron: "0 0 * * *")
                         │
                         └─ daily-streak-check function
                              │
                              ├─ Step 1: Query users who sent compliment in last 24h
                              ├─ Step 2: Update currentStreak += 1 for active users
                              ├─ Step 3: Find users with streak >= 7
                              └─ Step 4: Emit "streak.milestone" events

"streak.milestone" → send-streak-reward function
                         │
                         ├─ Unlock custom theme for user
                         └─ Send congratulations email
```

---

## Database Design Principles

### 1. Anonymity First
- Compliments can be sent without `senderId` (null for anonymous)
- Public trending wall shows no user identifiers
- Clues are intentionally vague

### 2. Moderation as Gatekeeper
- All compliments start with `moderationStatus: pending`
- Only `approved` compliments shown to recipients
- `moderationResult` stored as JSON for audit trail

### 3. Performance Optimization
- Indexes on high-query fields: `recipientId`, `createdAt`, `moderationStatus`
- Pagination with limit/offset for trending wall
- Denormalized stats in `users` table (totalSent, totalReceived)

### 4. Extensibility
- `clueType` enum for future clue types
- `parentId` for threading (Phase 2)
- `teams` and `teamMembers` tables ready for Team Mode

---

## Security Measures

### 1. Authentication
- Supabase Auth with email/password
- JWT-based auth with secure cookies
- Row-level security (RLS) policies
- Protected routes via middleware

### 2. Input Validation
- Zod schemas for all API inputs
- Max message length: 280 characters
- Category enum validation

### 3. Rate Limiting
- Max 10 compliments per user per day (Day 1)
- Implement via Vercel Edge Config or Upstash Redis

### 4. AI Moderation
- Gemini API filters: abuse, sexual, toxic, dangerous, hate
- All compliments moderated before delivery
- Manual review queue for edge cases (Phase 2)

### 5. Data Privacy
- User emails never exposed publicly
- Optional public display for trending wall
- Users can opt-out of email notifications

---

## Scalability Strategy

### Day 1 (MVP)
- Supabase free tier: 500 MB storage, unlimited compute hours
- Inngest free tier: 1M step runs/month
- Soketi on fly.io: 3 shared CPU VMs (free tier)
- Expected load: 100-1000 users

### Phase 2 (Growth)
- Add Redis caching (Upstash) for trending wall
- Implement CDN for static assets
- Scale Soketi horizontally on fly.io
- Expected load: 1K-10K users

### Phase 3 (Scale)
- Upgrade Supabase to Pro: 8 GB database, dedicated compute
- Add read replicas for inbox queries
- Implement horizontal scaling with edge functions
- Expected load: 10K-100K users

---

## Monitoring & Observability

### Application Monitoring
- Vercel Analytics for page performance
- Error tracking with Sentry
- Custom logging with Axiom or Logtail

### Infrastructure Monitoring
- Inngest dashboard: function execution, retries, failures
- Soketi dashboard: connection stats, event delivery (via metrics endpoint)
- Supabase dashboard: slow query log, database stats

### Business Metrics
- Compliments sent/received per day
- AI moderation approval rate
- Real-time notification delivery rate
- Email delivery rate
- User retention cohorts

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Vercel Edge Network             │
│  ┌───────────────────────────────────┐  │
│  │  Next.js App (Serverless)         │  │
│  │  - API Routes (Node.js runtime)   │  │
│  │  - Pages (React Server Components)│  │
│  │  - Static Assets (CDN)            │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬──────────┐
        │           │           │          │
        ▼           ▼           ▼          ▼
┌──────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐
│Supabase  │  │ Inngest  │  │ Soketi │  │fly.io   │
│(Postgres)│  │  Cloud   │  │(fly.io)│  │ (host)  │
│          │  │          │  │        │  │         │
└──────────┘  └──────────┘  └────────┘  └─────────┘
```

### CI/CD Pipeline
1. Push to GitHub `main` branch
2. Vercel auto-deploys to production
3. Database migrations run via `supabase db push` or `pnpm drizzle-kit push`
4. Inngest functions deployed via webhook
5. Soketi running on fly.io (no deployment needed)
6. Smoke tests run post-deployment

---

## Disaster Recovery

### Backup Strategy
- Supabase: daily automated backups (7-day retention on free tier)
- Manual backups before major migrations via `supabase db dump`
- Database snapshots stored in Supabase dashboard

### Rollback Plan
1. Revert Git commit via Vercel dashboard
2. Rollback database migration if needed
3. Re-deploy Inngest functions to previous version
4. Monitor error logs and metrics

### Incident Response
1. Monitor Vercel, Inngest, Supabase, Soketi dashboards
2. Set up alerts for critical failures (Sentry)
3. On-call rotation for post-launch (PagerDuty)
4. Incident post-mortem template

---

## Future Architecture Enhancements

### Phase 2: Caching Layer
```
Next.js App → Redis (Upstash) → Supabase
                │
                └─ Cache: trending wall, user stats
```

### Phase 3: Microservices
```
┌─────────────┐
│  Next.js    │
│  (Frontend) │
└──────┬──────┘
       │
       ├─ /api/compliments → Compliments Service (Node.js)
       ├─ /api/ai         → AI Service (Python + FastAPI)
       └─ /api/analytics  → Analytics Service (Go)
```

### Phase 4: Multi-Region
```
Vercel Edge Network
       │
       ├─ US-East: Primary DB (Postgres)
       ├─ EU-West: Read Replica
       └─ Asia-Pacific: Read Replica
```

---

## Key Architectural Trade-offs

### 1. Inngest vs. Custom Queue (e.g., BullMQ)
**Chosen**: Inngest
- ✅ Fully managed, no infrastructure
- ✅ Built-in retries, observability
- ✅ Great DX, TypeScript support
- ❌ Vendor lock-in
- ❌ Cold start latency (~1-2s)

### 2. Soketi vs. Pusher
**Chosen**: Soketi (self-hosted)
- ✅ Free (self-hosted on fly.io)
- ✅ Pusher-compatible API (drop-in replacement)
- ✅ No cost scaling with users
- ❌ Requires managing deployment
- ❌ Need to monitor uptime

### 3. Supabase vs. Vercel Postgres
**Chosen**: Supabase
- ✅ More generous free tier (500 MB + unlimited compute)
- ✅ Built-in auth, realtime, storage
- ✅ Better scalability (read replicas, edge functions)
- ✅ Active community and ecosystem
- ❌ External service (not native Vercel integration)
- ❌ Requires separate deployment configuration

### 4. Drizzle vs. Prisma
**Chosen**: Drizzle
- ✅ Smaller bundle size, edge-compatible
- ✅ SQL-like syntax (easier migration from raw SQL)
- ✅ Better TypeScript inference
- ❌ Smaller community than Prisma
- ❌ Fewer integrations

### 5. Supabase Auth vs. NextAuth
**Chosen**: Supabase Auth
- ✅ Built into Supabase (no additional service)
- ✅ Row-level security integration
- ✅ Multiple auth providers (email, OAuth, magic links)
- ✅ Great TypeScript support
- ❌ Tied to Supabase ecosystem
- ❌ Less flexible than standalone auth libraries

---

## Conclusion

Ripple's architecture is designed for:
1. **Fast iteration** - serverless, managed services
2. **Reliability** - event-driven with retries
3. **Scalability** - horizontal scaling via edge functions
4. **Developer experience** - TypeScript, great tooling
5. **Cost efficiency** - generous free tiers for MVP

As the platform grows, the architecture can evolve with:
- Caching layers (Redis)
- Read replicas (multi-region)
- Microservices (if needed)
- Custom infrastructure (post-PMF)
