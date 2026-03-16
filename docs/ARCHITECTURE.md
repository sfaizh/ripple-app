# Ripple - System Architecture

## High-Level Architecture

Ripple is a Next.js application. Moderation runs inline (non-blocking) using Next.js `after()` — no separate queue service needed.

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
│  │  - /api/workers/daily-streak       │    │
│  └───────────┬────────────────────────┘    │
│              │  after() callback            │
│  ┌───────────▼────────────────────────┐    │
│  │  Inline Moderation (non-blocking)  │    │
│  │  - moderateWithGroq()              │    │
│  │  - update DB status                │    │
│  │  - soketiServer.trigger()          │    │
│  └────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
               │
    ┌──────────┴───────────┐
    │                      │
    ▼                      ▼
┌─────────┐           ┌─────────┐
│Supabase │           │ Soketi  │
│Postgres │           │(Railway)│
│         │           │         │
│ Users   │           │ Notify  │
│Complmts │           │ Users   │
│ Stats   │           │         │
└────┬────┘           └─────────┘
     │
     ▼
┌────────┐
│  Groq  │
│   AI   │
└────────┘
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
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
- **Moderation**: Next.js `after()` — inline, non-blocking, no separate queue needed
- **Real-time**: Soketi (self-hosted on Railway)
- **AI**: Groq API (llama-3.1-8b-instant)
- **Email**: Resend (optional)

---

## Inline Async Architecture

Moderation runs inside the same serverless invocation as the send route, using Next.js 16's built-in `after()` API. `after()` executes its callback after the HTTP response is committed — the sender gets an immediate `200 OK` while Groq runs in the background.

**Trade-offs vs. a queue:**
- ✅ ~1–2 second notification lag (vs. up to 1 min with cron polling)
- ✅ No pgmq setup, no cron-job.org account, no worker route
- ✅ Same number of Groq API calls
- ❌ Single attempt only — auto-approves on Groq failure (acceptable for a hobby project)

---

## Core Workflows

### Flow 1: Sending a Compliment

```
User → Send Form → POST /api/compliments/send
                         │
                         ├─ Validate input + rate limit check
                         ├─ Create compliment (status: pending)
                         ├─ Increment sender totalSent
                         └─ Return { success: true } to sender immediately ✅

                    after() runs in background (same invocation):
                         │
                         ├─ moderateWithGroq(message)
                         ├─ Update compliment status (approved/rejected)
                         └─ If approved:
                              ├─ Increment recipient totalReceived
                              └─ soketiServer.trigger() → real-time toast

                    On Groq failure (fallback):
                         ├─ Auto-approve compliment
                         └─ Increment recipient totalReceived
```

### Flow 2: Receiving & Revealing

```
User navigates to /dashboard
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
after() callback in POST /api/compliments/send:
                         │
                         ├─ moderateWithGroq(message)
                         └─ Update compliment status (approved/rejected) in DB

Supabase DB webhook (fires on status → "approved"):
                         │
                         └─ POST /api/webhooks/compliment-approved
                              │
                              ├─ Increment recipient totalReceived
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
Vercel Cron (midnight UTC) → POST /api/workers/daily-streak
                         │
                         └─ daily-streak worker
                              │
                              ├─ Query users who sent compliment in last 24h
                              ├─ Update currentStreak += 1 for active users
                              ├─ Reset streak to 0 for inactive users
                              └─ Send reward email to users who hit 7-day milestone
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
- Groq API filters: abuse, sexual, toxic, dangerous, hate
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
- Vercel Cron (daily): `daily-streak` on Vercel Hobby (1 cron per day)
- Moderation runs inline via `after()` — no separate cron or queue service needed
- Soketi on Railway: self-hosted, zero cost
- Expected load: 100-1000 users

### Phase 2 (Growth)
- Add Redis caching (Upstash) for trending wall
- Implement CDN for static assets
- Scale Soketi horizontally on Railway
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
- Vercel function logs: moderation results logged per `after()` callback invocation
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
┌──────────┐  ┌──────────┐
│Supabase  │  │  Soketi  │
│(Postgres)│  │(Railway) │
└──────────┘  └──────────┘
```

### CI/CD Pipeline
1. Push to GitHub `main` branch
2. Vercel auto-deploys to production
3. Database migrations run via `supabase db push` or `pnpm drizzle-kit push`
4. Worker routes deployed automatically with Vercel (no separate step)
5. Soketi running on Railway (no deployment needed)
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
3. Worker routes roll back automatically with Vercel deployment revert
4. Monitor error logs and metrics

### Incident Response
1. Monitor Vercel, Supabase, Soketi dashboards
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

### 1. Soketi vs. Pusher
**Chosen**: Soketi (self-hosted)
- ✅ Free (self-hosted on Railway)
- ✅ Pusher-compatible API (drop-in replacement)
- ✅ No cost scaling with users
- ❌ Requires managing deployment
- ❌ Need to monitor uptime

### 2. Supabase vs. Vercel Postgres
**Chosen**: Supabase
- ✅ More generous free tier (500 MB + unlimited compute)
- ✅ Built-in auth, realtime, storage
- ✅ Better scalability (read replicas, edge functions)
- ✅ Active community and ecosystem
- ❌ External service (not native Vercel integration)
- ❌ Requires separate deployment configuration

---

## Conclusion

Ripple's architecture is designed for:
1. **Fast iteration** - serverless, managed services
2. **Reliability** - event-driven with retries
3. **Scalability** - horizontal scaling via edge functions
4. **Developer experience** - TypeScript, great tooling
5. **Cost efficiency** - generous free tiers for MVP
