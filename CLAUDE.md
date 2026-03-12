# CLAUDE.md

This file provides guidance to Claude Code when working with the Ripple codebase.

## Project Overview

**Ripple** is an anonymous compliment platform where users can send and receive kind messages.

**Status**: MVP implemented and deployed
**Goal**: Hobby project optimized for $0/month hosting (100-1000 users)

## Tech Stack (Free-Tier Optimized)

### Frontend
- **Framework**: Next.js 16 (App Router) + TypeScript strict
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
- No account required to send — `senderId` stored as `null` for anonymous senders
- Groq AI moderation filters toxic content before delivery
- Real-time notifications via Soketi when compliments arrive
- Blur-to-reveal animation for compliment viewing (framer-motion)
- Public compliments feed on wall pages (`/wall/[username]`) — shows approved opt-in compliments
- Clue system: "Someone who follows you on LinkedIn said..."
- PKCE email confirmation flow via `/api/auth/confirm`

## Project Structure

```
docs/                        # Architecture documentation
app/
├── (auth)/signin|signup     # Auth pages
├── inbox/                   # Protected inbox page
├── wall/[username]/         # Public wall page with compliment feed
└── api/
    ├── auth/                # signup, signin, signout, session, confirm (PKCE)
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
├── compliment/              # ComplimentCard, RevealAnimation, SendForm, CategorySelector, ClueSelector
├── inbox/                   # InboxList, InboxFilter
├── shared/                  # Navbar, SoketiProvider, CopyButton, ThemeProvider
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

Deployed to Vercel (`https://ripple-black.vercel.app`). Supabase at `lcycnjtlwegbsbqxzrbg.supabase.co`. Soketi on Railway.

pgmq queues are set up and working. Groq moderation is live. See `docs/DEPLOYMENT.md` for full setup details.

## Environment Variables

Key non-obvious variables (see `docs/ENVIRONMENT.md` for full list):
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only, must be the **legacy JWT** (`eyJ...`) format, not the new `sb_secret_*` format — the Supabase JS SDK does not support the new key format for admin/RPC calls
- `DATABASE_URL` — Pooled connection (for Drizzle queries)
- `DIRECT_URL` — Direct connection (for drizzle-kit migrations)
- `NEXT_PUBLIC_APP_URL` — Canonical URL (`http://localhost:3000` dev, `https://ripple-black.vercel.app` prod)
- `GROQ_API_KEY` — Groq moderation
- `SOKETI_*` — App ID, key, secret, host
- `WORKER_SECRET` — Shared secret for cron worker routes

## Constraints & Guidelines

### Security
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Use RLS policies for all database access
- Validate all inputs with Zod
- Rate limit: 10 compliments/day for authenticated senders; anonymous senders are unlimited
- `senderId` is nullable — anonymous sends store `null`, never reject unauthenticated compliment POSTs

### Code Style
- TypeScript strict mode
- Prefer server components over client components
- Use Drizzle for all DB queries
- Follow Next.js App Router conventions

### Performance
- Target Lighthouse score > 85
- API response time < 300ms (p95)

## Version Control & Commit Workflow

### Committing Changes
When asked to "update changelog and commit":
1. Update `CHANGELOG.md` with the changes
2. Run `git add .` to stage all changes
3. Create a commit with a clear message (use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`)
4. Run `git push` to push to `origin/main`

**Commit message format:**
```
<type>: <description>

<optional body describing why, not what>

Co-Authored-By: Faizan H <faizanh53@gmail.com>
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Branch Strategy
- Work on `main` directly (hobby project, no staging environment)
- Keep commits atomic and focused
- Use descriptive commit messages that explain the "why"

### Changelog Entries
Update `CHANGELOG.md` proactively before asking for a commit:
- **Added** — new features, new test suites, new endpoints
- **Fixed** — bug fixes, correctness improvements
- **Changed** — refactoring, architectural changes, behavior updates
- **Removed** — deprecated code, deleted features
- **Documentation** — doc updates, README changes

### Tags & Releases
- Not yet implemented; will use semantic versioning (MAJOR.MINOR.PATCH)
- Tag releases when moving to production stages

## Documentation

- `docs/ARCHITECTURE.md` — System design, event flows
- `docs/DATABASE-SCHEMA.md` — Drizzle schema reference
- `docs/API-ROUTES.md` — All endpoints with examples
- `docs/QUEUE-FUNCTIONS.md` — Worker/queue event flows
- `docs/DEPLOYMENT.md` — Step-by-step deployment guide
- `docs/ENVIRONMENT.md` — Environment variables reference
- `docs/COSTS.md` — Cost analysis
- `docs/TODO.md` — Implementation checklist
