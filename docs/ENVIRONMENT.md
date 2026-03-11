# Ripple - Environment Variables Guide

## Overview

This document describes all environment variables used in the Ripple application.

---

## Environment Files

### `.env.local` (Local Development)

Create this file in the project root. **Never commit to Git** (already in `.gitignore`).

```bash
# Copy from .env.example
cp .env.example .env.local
```

### `.env.example` (Template)

Committed to Git as a template for developers.

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Soketi (Real-time)
NEXT_PUBLIC_SOKETI_KEY=
NEXT_PUBLIC_SOKETI_HOST=
NEXT_PUBLIC_SOKETI_PORT=6001
SOKETI_APP_ID=
SOKETI_SECRET=

# Gemini AI
GEMINI_API_KEY=

# Resend Email (Optional)
RESEND_API_KEY=

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Variable Descriptions

### Database (Supabase)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Description**: Your Supabase project URL
- **Example**: `https://abcdefghij.supabase.co`
- **Used by**: Supabase client (browser + server)
- **Required**: ✅ Yes
- **Public**: ✅ Yes (exposed to browser)

**Where to get**:
1. [app.supabase.com](https://app.supabase.com) > Your project
2. Settings > API > Project URL

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Description**: Supabase anonymous/public API key
- **Used by**: Supabase client (browser + server)
- **Required**: ✅ Yes
- **Public**: ✅ Yes (safe to expose - respects RLS policies)

**Where to get**:
1. Supabase dashboard > Settings > API > anon/public key

**Note**: This key is safe to use in the browser because it respects Row Level Security (RLS) policies.

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Description**: Supabase service role key (bypasses RLS)
- **Used by**: Server-side operations that need to bypass RLS
- **Required**: ✅ Yes (for admin operations)
- **Public**: ❌ No (keep secret! Has full database access)

**Where to get**:
1. Supabase dashboard > Settings > API > service_role key

**Security Warning**: Never expose this key to the browser! Only use in API routes and server components.

---

### Event System (Inngest)

#### `INNGEST_EVENT_KEY`
- **Description**: API key for sending events to Inngest
- **Example**: `inngest_evt_1234567890abcdef`
- **Used by**: Inngest client (`inngest.send()`)
- **Required**: ✅ Yes
- **Public**: ❌ No

#### `INNGEST_SIGNING_KEY`
- **Description**: Key for verifying webhook signatures from Inngest
- **Example**: `inngest_sign_1234567890abcdef`
- **Used by**: `/api/inngest` webhook endpoint
- **Required**: ✅ Yes
- **Public**: ❌ No

**Where to get**:
1. [inngest.com](https://www.inngest.com) > "Settings" > "Keys"
2. Event Key: For sending events
3. Signing Key: For webhook verification

---

### Real-time (Soketi)

#### `NEXT_PUBLIC_SOKETI_KEY`
- **Description**: Soketi app key (client-side)
- **Example**: `app-key-123456`
- **Used by**: Soketi client SDK (browser)
- **Required**: ✅ Yes
- **Public**: ✅ Yes (exposed to browser)

**Note**: Must have `NEXT_PUBLIC_` prefix to be accessible in client components!

#### `NEXT_PUBLIC_SOKETI_HOST`
- **Description**: Soketi WebSocket server host
- **Example**: `your-app.fly.dev` or `localhost`
- **Used by**: Soketi client SDK
- **Required**: ✅ Yes
- **Public**: ✅ Yes

#### `NEXT_PUBLIC_SOKETI_PORT`
- **Description**: Soketi WebSocket server port
- **Example**: `6001` (default)
- **Used by**: Soketi client SDK
- **Required**: ⚠️ Optional (defaults to 6001)
- **Public**: ✅ Yes

#### `SOKETI_APP_ID`
- **Description**: Soketi application ID
- **Example**: `app-id-123`
- **Used by**: Soketi server client
- **Required**: ✅ Yes
- **Public**: ❌ No

#### `SOKETI_SECRET`
- **Description**: Soketi secret key (server-side only)
- **Example**: `secret-key-123456`
- **Used by**: Soketi server client (triggering events)
- **Required**: ✅ Yes
- **Public**: ❌ No (keep secret!)

**Where to get**:
- Self-hosted Soketi: You set these values in your Soketi deployment config
- See deployment guide for Soketi setup on fly.io

**Soketi Config Example** (on fly.io):
```bash
# fly.toml or environment variables
SOKETI_DEFAULT_APP_ID=app-id-123
SOKETI_DEFAULT_APP_KEY=app-key-123456
SOKETI_DEFAULT_APP_SECRET=secret-key-123456
```

---

### AI (Gemini)

#### `GEMINI_API_KEY`
- **Description**: Google Gemini API key for AI moderation
- **Used by**: `lib/ai/gemini.ts` and moderation functions
- **Required**: ✅ Yes
- **Public**: ❌ No (keep secret!)

**Where to get**:
1. [console.cloud.google.com](https://console.cloud.google.com)
2. Enable "Generative Language API"
3. "APIs & Services" > "Credentials" > "Create Credentials" > "API Key"

**Security Best Practices**:
- Restrict API key to Generative Language API only
- Set application restrictions (HTTP referrers or IP addresses)
- Rotate key every 90 days

---

### Email (Resend) - Optional

#### `RESEND_API_KEY`
- **Description**: Resend API key for sending emails
- **Used by**: `lib/email/resend.ts` and email functions
- **Required**: ⚠️ Optional (only if using email notifications)
- **Public**: ❌ No (keep secret!)

**Where to get**:
1. [resend.com](https://resend.com) > "API Keys"
2. Create new key with "Sending access" permission

**Rate Limits**:
- Free tier: 100 emails/day
- Pro tier: 50K emails/month

**Note**: Email notifications are optional. Skip this if staying on free tier (see COSTS.md).

---

### App Configuration

#### `NEXT_PUBLIC_APP_URL`
- **Description**: Base URL of your application (used for links in emails, OG images, etc.)
- **Example (dev)**: `http://localhost:3000`
- **Example (prod)**: `https://ripple.com`
- **Used by**: Email templates, wall links, redirects
- **Required**: ✅ Yes
- **Public**: ✅ Yes

#### `NODE_ENV`
- **Description**: Node.js environment
- **Example**: `development`, `production`, `test`
- **Used by**: Conditional logic (logging, error handling, etc.)
- **Required**: ✅ Yes (auto-set by Next.js)
- **Public**: ✅ Yes

**Note**: Automatically set by Next.js:
- `next dev` → `development`
- `next build` + `next start` → `production`
- `jest` → `test`

---

## Variable Scopes

### Server-side Only
These variables are **only** accessible in server components, API routes, and server actions:

- `SUPABASE_SERVICE_ROLE_KEY`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `SOKETI_APP_ID`
- `SOKETI_SECRET`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`

### Client-side Accessible
These variables are **exposed to the browser** (must have `NEXT_PUBLIC_` prefix):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SOKETI_KEY`
- `NEXT_PUBLIC_SOKETI_HOST`
- `NEXT_PUBLIC_SOKETI_PORT`
- `NEXT_PUBLIC_APP_URL`

**Security Warning**: Never put secrets in `NEXT_PUBLIC_` variables!

---

## Environment-Specific Values

### Development (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

INNGEST_EVENT_KEY=your_dev_event_key
INNGEST_SIGNING_KEY=your_dev_signing_key

NEXT_PUBLIC_SOKETI_KEY=app-key-dev
NEXT_PUBLIC_SOKETI_HOST=localhost
NEXT_PUBLIC_SOKETI_PORT=6001
SOKETI_APP_ID=app-id-dev
SOKETI_SECRET=secret-dev

GEMINI_API_KEY=your_gemini_key
RESEND_API_KEY=your_resend_test_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Production (Vercel)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

INNGEST_EVENT_KEY=your_prod_event_key
INNGEST_SIGNING_KEY=your_prod_signing_key

NEXT_PUBLIC_SOKETI_KEY=app-key-prod
NEXT_PUBLIC_SOKETI_HOST=your-soketi.fly.dev
NEXT_PUBLIC_SOKETI_PORT=6001
SOKETI_APP_ID=app-id-prod
SOKETI_SECRET=secret-prod

GEMINI_API_KEY=your_gemini_key
RESEND_API_KEY=your_resend_prod_key

NEXT_PUBLIC_APP_URL=https://ripple.com
NODE_ENV=production
```

---

## Vercel Environment Variable Scopes

When adding variables in Vercel dashboard, set scopes:

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| Supabase | ✅ | ✅ | ❌ (use local) |
| Inngest | ✅ | ✅ | ❌ |
| Soketi | ✅ | ✅ | ❌ |
| Gemini | ✅ | ✅ | ❌ |
| Resend | ✅ | ⚠️ (use test key) | ❌ |
| App URLs | ✅ | ✅ (auto-set) | ❌ |

**Development scope**: Not needed (Vercel CLI uses `.env.local`)

---

## Security Best Practices

### 1. Never Commit Secrets
```bash
# .gitignore (already included)
.env.local
.env.*.local
```

### 2. Rotate Keys Regularly
- Database keys: Every 90 days
- API keys: Every 90 days
- Soketi secrets: Every 6 months

### 3. Use Different Keys Per Environment
- Production: Production API keys
- Preview: Test/sandbox API keys (where available)
- Development: Test/sandbox API keys

### 4. Restrict API Keys
**Gemini API**:
- Restrict to Generative Language API only
- Set HTTP referrer restrictions

**Resend API**:
- Create separate keys for prod/dev
- Use test domain (`onboarding@resend.dev`) for development

**Supabase**:
- Enable Row Level Security (RLS) policies
- Never use service role key in client code
- Use anon key for all client operations

### 5. Monitor Usage
- Check Vercel logs for leaked secrets
- Set up alerts for API quota exceeded
- Monitor Inngest for failed auth attempts

---

## Validation

### Runtime Validation (Recommended)

Create `lib/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Inngest
  INNGEST_EVENT_KEY: z.string().startsWith('inngest_evt_'),
  INNGEST_SIGNING_KEY: z.string().startsWith('inngest_sign_'),

  // Soketi
  NEXT_PUBLIC_SOKETI_KEY: z.string(),
  NEXT_PUBLIC_SOKETI_HOST: z.string(),
  NEXT_PUBLIC_SOKETI_PORT: z.string().default('6001'),
  SOKETI_APP_ID: z.string(),
  SOKETI_SECRET: z.string(),

  // Gemini
  GEMINI_API_KEY: z.string().startsWith('AIza'),

  // Resend (optional)
  RESEND_API_KEY: z.string().startsWith('re_').optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

// Validate on app startup
export const env = envSchema.parse(process.env);

// Usage:
// import { env } from '@/lib/env';
// const apiKey = env.GEMINI_API_KEY;
```

### Type Safety

Create `env.d.ts`:

```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // Inngest
    INNGEST_EVENT_KEY: string;
    INNGEST_SIGNING_KEY: string;

    // Soketi
    NEXT_PUBLIC_SOKETI_KEY: string;
    NEXT_PUBLIC_SOKETI_HOST: string;
    NEXT_PUBLIC_SOKETI_PORT: string;
    SOKETI_APP_ID: string;
    SOKETI_SECRET: string;

    // Gemini
    GEMINI_API_KEY: string;

    // Resend
    RESEND_API_KEY?: string;

    // App
    NEXT_PUBLIC_APP_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
```

---

## Troubleshooting

### Issue: `NEXT_PUBLIC_` variable not accessible in client

**Cause**: Variable not prefixed with `NEXT_PUBLIC_`

**Solution**: Rename variable to include prefix:
```bash
# ❌ Wrong
SOKETI_KEY=abc123

# ✅ Correct
NEXT_PUBLIC_SOKETI_KEY=abc123
```

**Note**: Must restart dev server after renaming!

### Issue: Environment variable undefined in production

**Cause**: Variable not added to Vercel dashboard

**Solution**:
1. Go to Vercel dashboard > "Settings" > "Environment Variables"
2. Add missing variable
3. Select "Production" scope
4. Redeploy

### Issue: Database connection failed

**Cause**: Supabase URL or keys incorrect

**Solution**:
1. Check Supabase dashboard > Settings > API
2. Copy URL and keys exactly
3. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anon/public key
4. Test connection:
   ```bash
   curl https://your-project.supabase.co/rest/v1/ \
     -H "apikey: your_anon_key"
   ```

### Issue: Soketi connection failed

**Cause**: Soketi not running or incorrect host/port

**Solution**:
1. Verify Soketi is running: `curl https://your-soketi.fly.dev/health`
2. Check `NEXT_PUBLIC_SOKETI_HOST` matches your deployment
3. Verify port is `6001` (default)
4. Check browser console for WebSocket errors

### Issue: Inngest functions not registered

**Cause**: `INNGEST_SIGNING_KEY` incorrect

**Solution**:
1. Go to Inngest dashboard > "Settings" > "Keys"
2. Copy **Signing Key** (not Event Key!)
3. Update Vercel environment variable
4. Redeploy

---

## Quick Reference

### Minimum Required Variables (MVP)

```bash
# Supabase (3 vars)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Inngest (2 vars)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Soketi (5 vars)
NEXT_PUBLIC_SOKETI_KEY=
NEXT_PUBLIC_SOKETI_HOST=
NEXT_PUBLIC_SOKETI_PORT=6001
SOKETI_APP_ID=
SOKETI_SECRET=

# Gemini (1 var)
GEMINI_API_KEY=

# App (1 var)
NEXT_PUBLIC_APP_URL=

# Optional: Resend
RESEND_API_KEY=
```

**Total: 13 required variables** (14 including auto-set `NODE_ENV`, 15 with optional Resend)

---

## Comparison: Old vs New Stack

| Service | Old | New | Why Change |
|---------|-----|-----|------------|
| Database | Vercel Postgres | Supabase | More generous free tier, built-in auth |
| Real-time | Pusher | Soketi | Free self-hosted, no usage limits |
| Auth | BetterAuth | Supabase Auth | Integrated with database, RLS policies |

**Cost Savings**: $89/month → $0/month (see COSTS.md)

---

## Conclusion

This environment setup provides:
1. **Security**: Server-only secrets, RLS policies
2. **Flexibility**: Different values per environment
3. **Type safety**: Zod validation + TypeScript types
4. **Developer experience**: Clear documentation, easy setup
5. **Cost efficiency**: Free tier for up to 500-1000 users

**Next steps**:
1. Copy `.env.example` to `.env.local`
2. Fill in all values from service dashboards
3. Run `pnpm dev` to test locally
4. Add variables to Vercel dashboard for production
