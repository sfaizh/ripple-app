# CLAUDE.md

This file provides guidance to Claude Code when working with the Ripple codebase.

## Project Overview

**Ripple** is an anonymous compliment platform where users can send and receive kind messages.

**Status**: MVP implemented and deployed
**Goal**: Hobby project optimized for $0/month hosting (100-1000 users)

## Tech Stack (Free-Tier Optimized)

### Frontend
- **Framework**: Next.js 15 (App Router) + TypeScript strict
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: framer-motion

### Backend
- **Hosting**: Vercel (free tier)
- **Database**: Supabase PostgreSQL (free tier)
- **Auth**: Supabase Auth via `@supabase/ssr`
- **Real-time**: Soketi on Railway (self-hosted, Pusher-compatible)
- **Events**: pgmq (Supabase native queues) — graceful fallback to auto-approve if not configured
- **AI**: Groq SDK (`llama-3.1-8b-instant`) for content moderation
- **Email**: Resend (optional, skipped for free tier)

### Tools
- **Package Manager**: pnpm
- **ORM**: Drizzle ORM
- **Validation**: Zod + React Hook Form
- **Data fetching**: SWR

## Key Architecture Decisions

1. **Supabase over Vercel Postgres**: Unlimited compute hours, built-in auth
2. **Soketi over Pusher**: Self-hosted = $0/month, no connection limits
3. **Groq over Gemini**: Free tier, fast inference, no billing setup
4. **Skip email**: Use real-time + in-app notifications to stay free
5. **pgmq queues with fallback**: Async moderation; auto-approves in dev if queue not set up
6. **Anonymous by default**: Compliments can be sent without revealing sender identity

## Core Features

- Send anonymous compliments by category (professional, creative, personal growth, just because)
- Groq AI moderation filters toxic content before delivery
- Real-time notifications via Soketi when compliments arrive
- Blur-to-reveal animation for compliment viewing (framer-motion)
- Public trending wall (opt-in), user wall pages at `/wall/[username]`
- Clue system: "Someone who follows you on LinkedIn said..."

## Project Structure

```
docs/                        # Architecture documentation
app/
├── (auth)/signin|signup     # Auth pages
├── inbox/                   # Protected inbox page
├── wall/[username]/         # Public wall page
└── api/
    ├── auth/                # signup, signin, signout, session
    ├── compliments/         # send, inbox, [id], [id]/read, trending
    ├── workers/             # moderation, notifications, daily-streak
    ├── soketi/auth/         # Private channel auth
    ├── users/               # [username], me/stats, me/settings
    └── health/
lib/
├── db/schema.ts             # Drizzle schema (users, compliments, enums)
├── db/client.ts             # Drizzle + postgres client
├── supabase/                # client.ts, server.ts, middleware.ts
├── queue/client.ts          # pgmq enqueue/dequeue/ack/nack
├── ai/moderation.ts         # Groq moderation (moderateWithGroq)
├── soketi/server.ts         # Server-side Pusher client
└── utils.ts                 # cn() utility
components/
├── compliment/              # ComplimentCard, RevealAnimation, SendForm, CategorySelector
├── inbox/                   # InboxList, InboxFilter
├── shared/                  # Navbar, SoketiProvider, CopyButton
└── wall/                    # WallSendForm
```

## Development Workflow

```bash
pnpm install
cp .env.example .env.local   # Fill in Supabase, Soketi, Groq keys
pnpm db:push                 # Apply schema to Supabase
pnpm dev
```

### Key Commands
- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm type-check` — TypeScript check
- `pnpm db:push` — Apply schema (uses DIRECT_URL from .env.local)
- `pnpm db:generate` — Generate migrations
- `pnpm db:studio` — Open Drizzle Studio

## Deployment

Deployed to Vercel. Supabase project at `lcycnjtlwegbsbqxzrbg.supabase.co`. Soketi on Railway.

Remaining steps (see `docs/DEPLOYMENT.md`):
- Step 3: Enable pgmq/pg_cron in Supabase SQL editor
- Step 5: Add `GROQ_API_KEY` to Vercel env vars
- Generate `WORKER_SECRET` (`openssl rand -base64 32`) and add to Vercel

## Environment Variables

Key non-obvious variables (see `docs/ENVIRONMENT.md` for full list):
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only, never expose to client
- `DATABASE_URL` — Pooled connection (for Drizzle queries)
- `DIRECT_URL` — Direct connection (for drizzle-kit migrations)
- `GROQ_API_KEY` — Groq moderation
- `SOKETI_*` — App ID, key, secret, host
- `WORKER_SECRET` — Shared secret for cron worker routes

## Constraints & Guidelines

### Security
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Use RLS policies for all database access
- Validate all inputs with Zod
- Rate limit: 10 compliments/user/day

### Code Style
- TypeScript strict mode
- Prefer server components over client components
- Use Drizzle for all DB queries
- Follow Next.js App Router conventions

### Performance
- Target Lighthouse score > 85
- API response time < 300ms (p95)

## Documentation

- `docs/ARCHITECTURE.md` — System design, event flows
- `docs/DATABASE-SCHEMA.md` — Drizzle schema reference
- `docs/API-ROUTES.md` — All endpoints with examples
- `docs/QUEUE-FUNCTIONS.md` — Worker/queue event flows
- `docs/DEPLOYMENT.md` — Step-by-step deployment guide
- `docs/ENVIRONMENT.md` — Environment variables reference
- `docs/COSTS.md` — Cost analysis
- `docs/TODO.md` — Implementation checklist
