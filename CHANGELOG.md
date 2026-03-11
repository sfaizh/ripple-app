# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-11

Initial MVP release of Ripple — an anonymous compliments platform optimized for $0/month hosting.

### Added

#### Infrastructure
- `drizzle.config.ts` with `dotenv` support for `.env.local` in CLI context
- `middleware.ts` for route protection (unauthenticated users redirected to `/signin`)
- `vercel.json` with cron jobs: moderation + notifications every minute, daily-streak at midnight
- `db:push`, `db:generate`, `db:studio`, and `type-check` npm scripts

#### Library Layer
- **Database**: Drizzle schema (`users`, `compliments`) with enums (`theme`, `category`, `clueType`, `moderationStatus`) and indexes
- **Drizzle client**: PgBouncer-compatible (`prepare: false`), pooled + direct URL support
- **Supabase SSR**: `client.ts`, `server.ts`, `middleware.ts` using `@supabase/ssr`
- **Queue**: pgmq `enqueue`/`dequeue`/`ack`/`nack` wrappers via Supabase RPC
- **AI moderation**: Groq SDK (`llama-3.1-8b-instant`) with category-based toxicity scoring
- **Soketi**: Server-side Pusher client for real-time notifications
- **Utils**: `cn()` helper (clsx + tailwind-merge)

#### API Routes (15 endpoints)
- `POST /api/auth/signup` — Creates Supabase auth user + unique username (nanoid)
- `POST /api/auth/signin`, `POST /api/auth/signout`, `GET /api/auth/session`
- `POST /api/compliments/send` — Rate-limited (10/day), enqueues moderation, auto-approves if queue unavailable
- `GET /api/compliments/inbox` — Paginated, filterable by status and read state
- `GET /api/compliments/[id]`, `PATCH /api/compliments/[id]/read`
- `GET /api/compliments/trending` — Public feed with no sender identifiers
- `GET /api/users/[username]` — Public wall data
- `GET /api/users/me/stats`, `PATCH /api/users/me/settings`
- `POST /api/workers/moderation` — Dequeues jobs, runs Groq, updates status, enqueues notifications
- `POST /api/workers/notifications` — Soketi real-time push
- `POST /api/workers/daily-streak` — Streak increment/reset logic
- `POST /api/soketi/auth` — Private channel auth (`private-user-{userId}`)
- `GET /api/health`

#### UI Components
- **ComplimentCard** + **RevealAnimation** — framer-motion blur-to-clear reveal, marks as read on open
- **SendForm** + **CategorySelector** — React Hook Form + Zod, clue selector, char counter, public toggle
- **InboxList** + **InboxFilter** — SWR-powered list, all/unread tabs, skeleton loading states
- **Navbar** — Sticky, auth-aware links and sign-out
- **SoketiProvider** — Dynamic Pusher import, no-op if env vars not set
- **CopyButton** — Clipboard copy for wall link
- **WallSendForm** — Wraps SendForm with post-send success state
- **Base UI**: button, card, input, textarea, badge, skeleton, toast (ToastProvider with context)

#### Pages
- `/` — Landing page with hero section, CTAs, and feature grid
- `/signin` + `/signup` — Auth forms with Zod validation and post-auth redirect
- `/inbox` — Protected: stats row, wall link with copy button, inbox list
- `/wall/[username]` — Public: themed gradient header, send form (or "own wall" message)

#### Documentation
- Replaced Inngest with Supabase pgmq queue functions (`docs/QUEUE-FUNCTIONS.md`)
- Updated all docs to reflect Groq replacing Gemini/Google AI
- Updated `CLAUDE.md` to reflect MVP-complete status and actual project structure
