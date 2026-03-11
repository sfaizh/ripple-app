# CLAUDE.md

This file provides guidance to Claude Code when working with the Ripple codebase.

## Project Overview

**Ripple** is an anonymous compliment platform where users can send and receive kind messages. Think "secret admirer" meets positive workplace culture.

**Status**: Architecture phase - ready for implementation
**Goal**: Hobby project optimized for $0/month hosting (100-1000 users)

## Tech Stack (Free-Tier Optimized)

### Frontend
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: framer-motion

### Backend
- **Hosting**: Vercel (free tier)
- **Database**: Supabase PostgreSQL (free tier: 500 MB, unlimited compute)
- **Auth**: Supabase Auth (built-in, no separate service needed)
- **Real-time**: Soketi on fly.io (self-hosted, Pusher-compatible)
- **Events**: Inngest (async processing, free tier: 1M runs/month)
- **AI**: Gemini API (moderation, free tier: 1,500 requests/day)
- **Email**: Resend (optional, skip for free tier)

### Tools
- **Package Manager**: pnpm
- **ORM**: Drizzle ORM
- **Validation**: Zod

## Key Architecture Decisions

1. **Supabase over Vercel Postgres**: Unlimited compute hours, built-in auth, better free tier
2. **Soketi over Pusher**: Self-hosted = $0/month vs $49/month, no connection limits
3. **Skip email notifications**: Use real-time + in-app notifications to stay free
4. **Event-driven with Inngest**: AI moderation runs async, doesn't block user requests
5. **Anonymous by default**: Compliments can be sent without revealing sender identity

## Core Features

- Send anonymous compliments by category (professional, creative, personal growth, just because)
- AI moderation (Gemini) filters toxic content before delivery
- Real-time notifications when compliments arrive
- Blur-to-reveal animation for compliment viewing
- Public trending wall (opt-in)
- User wall pages: `/wall/[username]`
- Clue system: "Someone who follows you on LinkedIn said..."

## Important Assumptions

### Cost Optimization
- Target: $0/month for up to 1000 users
- Email notifications are **optional** (skip to stay free)
- Daily backups only (no point-in-time recovery on free tier)
- Soketi runs on fly.io free tier (3 shared CPU VMs)

### Database
- Compliments: ~1 KB each, expecting ~50 per user lifetime
- Storage: 50 MB at 1000 users (well under 500 MB limit)
- Unlimited queries (Supabase has no compute hour limit)

### Privacy
- Row Level Security (RLS) policies enforce data access
- Sender identity optional (nullable `senderId`)
- Public trending wall shows no user identifiers
- Supabase anon key safe to expose (respects RLS)

### Moderation
- All compliments start as `pending`
- AI moderates within ~2 seconds
- Only `approved` compliments delivered to recipient
- Rejected compliments logged for review

## Project Structure

```
docs/               # Comprehensive architecture documentation
├── ARCHITECTURE.md # System design, event flows, diagrams
├── DATABASE-SCHEMA.md # Drizzle schema, queries, indexes
├── API-ROUTES.md   # All endpoints with examples
├── INNGEST-FUNCTIONS.md # Event workflows
├── COMPONENT-STRUCTURE.md # UI components
├── DEPLOYMENT.md   # Step-by-step deployment guide
├── ENVIRONMENT.md  # Environment variables reference
├── COSTS.md        # Cost analysis & optimization
└── TODO.md         # Implementation checklist

app/                # Next.js app (not yet created)
lib/                # Utilities, DB, API clients (not yet created)
components/         # React components (not yet created)
```

## Development Workflow

### Setup
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in: Supabase, Inngest, Soketi, Gemini keys

# Run database migrations
pnpm drizzle-kit push

# Start dev server
pnpm dev
```

### Key Commands
- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript checks
- `pnpm drizzle-kit generate` - Generate migrations
- `pnpm drizzle-kit push` - Apply migrations to DB

## Deployment Checklist

See `docs/DEPLOYMENT.md` for full guide. Quick summary:

1. **Supabase**: Create project, get URL + keys
2. **Soketi**: Deploy to fly.io (5 min setup)
3. **Inngest**: Create app, get event + signing keys
4. **Vercel**: Connect GitHub repo, add env vars, deploy
5. **Gemini**: Enable Generative Language API, get key

Total setup time: ~30 minutes

## Documentation

All architecture decisions documented in `/docs`:
- Read `ARCHITECTURE.md` for system design
- Read `COSTS.md` for free-tier strategy
- Read `TODO.md` for implementation tasks
- Read `DEPLOYMENT.md` before deploying

## Constraints & Guidelines

### Performance
- Target Lighthouse score > 85
- API response time < 300ms (p95)
- Inngest functions < 3s execution

### Security
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Use RLS policies for all database access
- Validate all inputs with Zod
- Rate limit: 10 compliments/user/day

### Code Style
- Use TypeScript strict mode
- Prefer server components over client
- Use Drizzle for all DB queries
- Follow Next.js App Router conventions

## Need Help?

- **Architecture questions**: See `docs/ARCHITECTURE.md`
- **Database schema**: See `docs/DATABASE-SCHEMA.md`
- **API endpoints**: See `docs/API-ROUTES.md`
- **Cost concerns**: See `docs/COSTS.md`
- **Deployment issues**: See `docs/DEPLOYMENT.md`

## Current Phase

**Phase**: Planning complete, ready for implementation
**Next step**: Initialize Next.js project and install dependencies
**Priority**: Day 1 MVP features (see `docs/TODO.md`)
