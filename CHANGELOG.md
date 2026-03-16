# Changelog

## [1.2.0] - 2026-03-16

### Documentation
- Updated `docs/API-ROUTES.md`: Fixed Next.js version (15 → 16), added optional `username` field to `POST /api/auth/signup` and `PATCH /api/users/me/settings`, added `GET /api/users/check-username` endpoint docs, added `POST /api/webhooks/compliment-approved` webhook docs, removed unimplemented Phase 2 routes (`POST /api/compliments/[id]/reply`, `POST /api/ai/generate-response`), removed aspirational CORS/Security Headers/Rate Limit sections
- Updated `docs/ARCHITECTURE.md`: Fixed Next.js version (15 → 16), changed all Soketi references from fly.io → Railway, updated Flow 2 (`/inbox` → `/dashboard`), updated Flow 3 to show Supabase webhook + Soketi push chain
- Updated `docs/DEPLOYMENT.md`: Fixed Step 13.1 (Vercel Postgres → Supabase backups), removed stale `/api/workers/notifications` reference from troubleshooting, removed email delivery test from checklist, updated Step 9.1 to reference `/dashboard`, removed pgmq docs link
- Updated `docs/ENVIRONMENT.md`: Renamed all env vars (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_API_KEY` → `SUPABASE_SERVICE_ROLE_KEY`), updated Soketi host examples (fly.dev → railway.app), removed cron-job.org references, updated Zod schemas and TypeScript types
- Updated `docs/TODO.md`: Marked custom username, username edit, and `/inbox` → `/dashboard` rename as complete; added note about deleted moderation worker test
- Updated `docs/COSTS.md`: Changed all Soketi references from fly.io → Railway, removed "Implementation: Soketi on fly.io" section with CLI commands, removed pgmq mention from Phase 1

## [1.1.0] - 2026-03-13

### Added
- **Custom username at signup**: Optional username field on the signup form with 400ms debounced availability check — inline ✓/✗/spinner feedback; auto-generates if left blank
- **Username edit on dashboard**: Pencil icon in the wall link card opens an inline edit row with live availability check, Save/Cancel buttons, and auto-refreshes the page on success
- **`GET /api/users/check-username`**: Public endpoint for username availability — validates format (`^[a-z][a-z0-9_]{2,19}$`), blocks reserved words, returns `{ available: bool }`

### Changed
- **`/inbox` → `/dashboard`**: Route renamed; `app/inbox/` directory removed; `app/dashboard/` created with `page.tsx` + `UsernameEdit.tsx`
- Dashboard page heading changed from "Your inbox" to "Dashboard"
- Navbar "Inbox" link → "Dashboard" (`href="/dashboard"`)
- All internal redirects updated: `app/page.tsx`, `app/(auth)/signin/page.tsx`, `app/api/auth/confirm/route.ts`, `lib/supabase/middleware.ts`
- `PATCH /api/users/me/settings` now accepts an optional `username` field — validates format and uniqueness (allows keeping own current username)
- `POST /api/auth/signup` now accepts an optional `username` — validates and checks uniqueness before insert; falls back to auto-generate if omitted

### Documentation
- Updated `docs/TODO.md`: marked custom username and inbox→dashboard rename as complete

## [1.0.0] - 2026-03-13

### Added
- **Supabase webhook for real-time notifications** (`app/api/webhooks/compliment-approved/route.ts`): Supabase DB webhook fires immediately when `moderation_status` changes to `approved`, triggering the Soketi push directly — eliminates the ~1 minute polling lag from the old notifications queue
- **Vitest unit test suite** (`pnpm test`): 25 unit tests across two files covering the webhook endpoint (auth, payload guards, happy path, error handling) and moderation worker (approval/rejection flow, idempotency, dead-letter, queue errors)

### Changed
- Moderation worker no longer enqueues to the `notifications` queue after approval — Supabase webhook handles delivery instead
- E2E moderation spec updated: replaced outdated "enqueue notifications" test with two webhook endpoint tests (auth rejection, skip non-approval events)

### Removed
- `app/api/workers/notifications/route.ts` — notifications queue worker is obsolete; cancel the corresponding cron on cron-job.org

### Documentation
- Updated `docs/TODO.md`: marked webhook notification, unit tests, and Groq mock as complete; updated email notification trigger note to point at the webhook handler

## [0.9.0] - 2026-03-12

### Fixed
- Home page redirect for authenticated users: `redirect('/inbox')` was inside a `try/catch` block, causing Next.js's internal `RedirectError` to be swallowed — logged-in users saw the landing page with the wrong Navbar state; moved redirect outside the try block via a `shouldRedirect` flag
- Navbar showed "Sign in / Get started" for authenticated users on the home page (consequence of the redirect bug above)

### Changed
- Removed "Create account" and "Sign in" links from the bottom of the hero section — the Navbar already surfaces these actions

## [0.8.0] - 2026-03-12

### Added
- **AI compliment generation**: New `POST /api/compliments/generate` endpoint uses Groq (`llama-3.1-8b-instant`) to generate heartfelt, category-aware compliment suggestions
- **"Generate with AI" button in SendForm**: Pill-shaped gradient button inline with the message label — one click fills the textarea with a Groq-generated compliment; shows loading spinner while generating
- **Animated hero section** (`components/home/HeroSection.tsx`): Fully reworked landing page with framer-motion entrance animations, mouse-parallax floating orbs (primary / teal / warm), and a subtle grid overlay

### Changed
- **Home page CTA**: Replaced "View my inbox" + feature pill grid with a direct `@username` input + "Send a compliment" button; routing goes straight to `/wall/[username]` — no sign-up required to send
- **Home page layout**: Removed the three AI-generated feature-pill cards; page is now a clean, full-screen animated hero

### Documentation
- Marked all Stage 2 real-time notification items as complete in `docs/TODO.md`

## [0.7.0] - 2026-03-12

### Changed
- Wall page "Public compliments" / "Private compliments" section headings now only shown when viewing your own wall; visitors (logged-out or another user) see a plain unsectioned list

### Documentation
- Added public pgmq wrapper SQL functions required for PostgREST RPC access to `docs/DEPLOYMENT.md`
- Noted that `SUPABASE_SERVICE_ROLE_KEY` must use legacy JWT format (`eyJ...`) not the new `sb_secret_*` format
- Marked completed features in `docs/TODO.md`

## [0.6.0] - 2026-03-12

### Added
- Authenticated user landing redirect: logged-in users visiting `/` now redirect immediately to `/inbox`
- "Send a Compliment" modal on inbox page enables sending compliments to any username without navigating away
  - Two-step flow: username entry → compliment form (reuses existing `WallSendForm`)
  - Modal closes and resets after successful send
- Added `onSent` optional callback prop to `WallSendForm` component for modal integration

## [0.5.0] - 2026-03-12

### Added
- Foundational E2E test suite using Playwright
  - `e2e/user-flow.spec.ts` — 5 tests for sign-up, inbox stats, anonymous compliment sending, reveal animation
  - `e2e/moderation-worker.spec.ts` — 5 tests for AI moderation approval/rejection, worker authorization, notification enqueueing
  - `e2e/README.md` — Instructions for running tests, known limitations, debugging guide
- Test scripts: `pnpm test:e2e`, `pnpm test:e2e:ui`, `pnpm test:e2e:debug`
- Playwright configuration with Chromium and HTML reporting

### Documentation
- Updated `README.md` with AI moderation details and flow diagrams
- Added E2E testing section to project docs with Playwright integration

## [0.4.0] - 2026-03-12

### Fixed
- Sign-up confirmation email now uses the correct production URL even without `NEXT_PUBLIC_APP_URL` set in Vercel — origin is derived from the incoming request as a fallback
- Sign-up page now shows a "Check your email" toast instead of immediately redirecting to `/inbox`; user stays on the page until they click the confirmation link

### Changed
- Updated `CLAUDE.md` to reflect current project state: Next.js 16, anonymous sending behaviour, new routes, production URL, and env var notes

## [0.3.0] - 2026-03-12

### Added
- PKCE email confirmation handler at `GET /api/auth/confirm` — exchanges Supabase confirmation code for a session and redirects to `/inbox` on success or `/signin?error=confirmation_failed` on failure
- Public compliments feed on wall pages (`/wall/[username]`) — shows the user's approved, opt-in compliments below the send form; cards render fully revealed since senders opted into public display
- `NEXT_PUBLIC_APP_URL` environment variable for canonical redirect URL configuration

### Fixed
- Sign-up confirmation email now redirects to the correct production URL instead of `localhost:3000` — `emailRedirectTo` now passed to `supabase.auth.signUp` using `NEXT_PUBLIC_APP_URL`
- Anonymous compliment sending no longer returns 401 Unauthorized — authentication is now optional on `POST /api/compliments/send`; unauthenticated senders are stored with `senderId = null`
- Auto-approve fallback (dev mode, no pgmq) was not incrementing `totalReceived` for the recipient — now mirrors the moderation worker and increments on approval
- Inbox "Received" stat now queries a live count of approved compliments from the `compliments` table instead of relying on the stale denormalized `users.total_received` value

### Changed
- Rate limiting (10/day) and `totalSent` increment on compliment send are now scoped to authenticated senders only; anonymous senders bypass the rate limit

## [0.2.0] - 2026-03-11

### Changed
- Replace Vercel Cron per-minute jobs with cron-job.org for `moderation` and `notifications` workers — Vercel Hobby plan throttles crons to once per day; cron-job.org supports 1-minute intervals for free
- `vercel.json` now only contains the `daily-streak` cron (midnight UTC)

### Documentation
- `docs/DEPLOYMENT.md`: Added Step 3.5 with cron-job.org setup instructions; updated deployment checklist and free-tier limits
- `docs/QUEUE-FUNCTIONS.md`: Updated overview, worker trigger descriptions, event flow diagram, vercel.json example, retry section, and summary table
- `docs/ARCHITECTURE.md`: Updated tech stack, Flow 1 diagram, and scalability strategy
- `docs/API-ROUTES.md`: Updated trigger notes for moderation and notifications worker routes
- `docs/COSTS.md`: Updated queue processing section to reference cron-job.org
- `docs/ENVIRONMENT.md`: Updated `WORKER_SECRET` description to document usage in both Vercel Cron and cron-job.org
- `docs/TODO.md`: Added cron-job.org setup note under AI Moderation checklist

## [0.1.0] - 2026-03-11

Initial MVP release of Ripple — an anonymous compliments platform optimized for $0/month hosting.

### Added

#### Infrastructure
- `drizzle.config.ts` with `dotenv` support for `.env.local` in CLI context
- `middleware.ts` for route protection (unauthenticated users redirected to `/signin`)
- `vercel.json` with cron job: daily-streak at midnight (moderation + notifications triggered via cron-job.org)
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
