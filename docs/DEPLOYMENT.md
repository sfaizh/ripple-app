# Ripple - Deployment Guide

## Overview

This guide covers deploying Ripple to production using Vercel and configuring all external services.

---

## Prerequisites

Before deploying, ensure you have:
- [x] GitHub repository created
- [x] Vercel account (free tier)
- [x] All code committed to `main` branch

---

## Step 1: Vercel Setup

### 1.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository (`ripple`)
4. Select "Next.js" as framework preset
5. Click "Deploy"

**Initial deployment will fail** - this is expected (missing env vars)

### 1.2 Configure Build Settings

In Vercel dashboard:

**Framework Preset**: Next.js
**Build Command**: `pnpm build`
**Output Directory**: `.next`
**Install Command**: `pnpm install`
**Node Version**: 20.x

---

## Step 2: Database Setup (Supabase)

### 2.1 Create a Supabase Project

- Go to the Supabase dashboard.
- Click "New Project".
- Select or create an Organization.
- Enter a Project Name.
- Set a Database Password (store this securely).
- Choose a Region closest to your application deployment.
- Click "Create Project" and wait for provisioning to complete.

### 2.2 Get the Database Connection Strings

- Open your project in the Supabase dashboard.
- Go to Settings → Database.
- Scroll to Connection Pooling.
- Copy the Pooled Connection String.

Example: `postgresql://postgres:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`

#### Environment Variables

Add the following variables to your app:

```
DATABASE_URL=postgresql://postgres:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres

DIRECT_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

#### Explanation

DATABASE_URL → uses the Supabase pooler (PgBouncer) and should be used by your application.

DIRECT_URL → connects directly to Postgres and should be used for migrations.

This setup prevents connection limits when running serverless apps on platforms like Vercel.

### 2.3 Add Environment Variables to Vercel

1. Open your project in the Vercel dashboard.
2. Go to Settings → Environment Variables.
3. Add the following

```
DATABASE_URL=<supabase pooled connection string>
DIRECT_URL=<supabase direct connection string>
```
4. Redeploy your project.

### 2.4 Run Database Migrations

- Run migrations locally using your ORM: `pnpm drizzle-kit push`
- Your migration tool will use:
`DIRECT_URL for schema changes`
`DATABASE_URL for application queries`

**Alternative: Use Supabase SQL Editor**
- Open your project in the Supabase dashboard.
- Go to SQL Editor.
- Open your migration file:
`drizzle/migrations/*.sql`
- Paste the SQL into the editor.
- Click Run

---

## Step 3: Queue & Workers Setup

### 3.1 Enable pgmq and pg_cron in Supabase

1. Go to your Supabase project dashboard
2. Open **SQL Editor**
3. Run the following:

```sql
create extension if not exists pgmq;
create extension if not exists pg_cron;

select pgmq.create('moderation');
select pgmq.create('notifications');
```

4. Then create **public wrapper functions** so PostgREST can call pgmq via RPC. The queue client calls these via `supabase.rpc(...)`:

```sql
CREATE OR REPLACE FUNCTION public.pgmq_send(queue_name text, msg jsonb, delay integer DEFAULT 0)
RETURNS SETOF bigint
LANGUAGE sql
AS 'SELECT pgmq.send($1, $2, $3)';

CREATE OR REPLACE FUNCTION public.pgmq_read(queue_name text, vt integer, qty integer)
RETURNS SETOF pgmq.message_record
LANGUAGE sql
AS 'SELECT pgmq.read($1, $2, $3)';

CREATE OR REPLACE FUNCTION public.pgmq_archive(queue_name text, msg_id bigint)
RETURNS boolean
LANGUAGE sql
AS 'SELECT pgmq.archive($1, $2)';

CREATE OR REPLACE FUNCTION public.pgmq_set_vt(queue_name text, msg_id bigint, vt integer)
RETURNS SETOF pgmq.message_record
LANGUAGE sql
AS 'SELECT pgmq.set_vt($1, $2, $3)';

NOTIFY pgrst, 'reload schema';
```

> **Why**: pgmq functions live in the `pgmq` schema which isn't exposed by PostgREST by default. These public wrappers proxy the calls through the `public` schema.

> **Important**: `SUPABASE_SERVICE_ROLE_KEY` must be the **legacy `service_role` JWT** (the long `eyJ...` token from Supabase → Settings → API). Supabase now shows a new `sb_secret_*` format key but the `@supabase/supabase-js` SDK does not support it for admin/RPC calls — use the legacy key.

### 3.2 Generate Worker Secret

```bash
# Generate a random secret to protect worker routes
openssl rand -base64 32
```

### 3.3 Add Environment Variable to Vercel

```bash
# In Vercel dashboard > Settings > Environment Variables
WORKER_SECRET=your_generated_secret_here
```

### 3.4 Configure Vercel Cron

`vercel.json` only includes the daily cron (Hobby plan allows 1 cron per day frequency):

```json
{
  "crons": [
    { "path": "/api/workers/daily-streak", "schedule": "0 0 * * *" }
  ]
}
```

The `moderation` and `notifications` workers run every minute via cron-job.org instead (see Step 3.5).

### 3.5 Configure cron-job.org (replaces Vercel crons for moderation/notifications)

Vercel Hobby plan throttles per-minute crons. Use [cron-job.org](https://cron-job.org) (free, supports 1-minute intervals) to trigger these workers:

1. Create a free account at [cron-job.org](https://cron-job.org)
2. Create two cron jobs, both set to run **every minute**:
   - URL: `https://<your-vercel-url>/api/workers/moderation` — Method: **POST**
   - URL: `https://<your-vercel-url>/api/workers/notifications` — Method: **POST**
3. For each job, add a request header:
   - `Authorization: Bearer <WORKER_SECRET>`
4. `daily-streak` remains on Vercel cron (midnight UTC) — no change needed.

> **Note:** `WORKER_SECRET` must be set both in Vercel environment variables (for the daily-streak cron) and as the `Authorization` header value in each cron-job.org job.

---

## Step 4: Soketi Setup

### 4.1 Deploy Soketi to Railway

1. Go to [railway.app](https://railway.app)
2. Create new project > "Deploy from repo"
3. Fork or use the [Soketi GitHub repo](https://github.com/soketi/soketi)
4. Connect your GitHub account and select the repo
5. Deploy and Railway will auto-generate environment variables
6. Once deployed, note the public URL from the Soketi dashboard (e.g., `soketi-xyz.up.railway.app`)

### 4.2 Get Soketi Credentials

Copy these values from your Soketi dashboard:
- **SOKETI_DEFAULT_APP_ID**: Your app ID (default: `app-id`)
- **SOKETI_DEFAULT_APP_KEY**: Your app key (public, used in browser)
- **SOKETI_DEFAULT_APP_SECRET**: Your app secret (private, used on server)
- **SOKETI_PUBLIC_HOST**: Your Soketi public hostname
- **SOKETI_PUBLIC_PORT**: Your Soketi public port (usually `443`)

### 4.3 Add Environment Variables to Vercel

Map Soketi values to your app:

```bash
NEXT_PUBLIC_SOKETI_KEY=<SOKETI_DEFAULT_APP_KEY>
NEXT_PUBLIC_SOKETI_HOST=<SOKETI_PUBLIC_HOST>
NEXT_PUBLIC_SOKETI_PORT=<SOKETI_PUBLIC_PORT>
NEXT_PUBLIC_SOKETI_ENCRYPTED=true
SOKETI_SECRET=<SOKETI_DEFAULT_APP_SECRET>
```

---

## Step 5: Groq API Setup

### 5.1 Create Groq Account

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free tier, no credit card required)

### 5.2 Create API Key

1. Go to "API Keys" in the Groq console
2. Click "Create API Key"
3. Name it "Ripple" and copy the key

### 5.3 Add Environment Variable to Vercel

```bash
GROQ_API_KEY=your_api_key_here
```

---

## Step 6: Resend Email Setup - *Skip this for current state*

### 6.1 Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 100 emails/day)
3. Verify email address

### 6.2 Add and Verify Domain

**Option 1: Use Resend's test domain** (for testing only)
- Emails sent from `onboarding@resend.dev`
- No verification needed

**Option 2: Use your own domain** (recommended for production)

1. In Resend dashboard, click "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `ripple.com`)
4. Add DNS records to your domain provider:

```
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]

Type: MX
Name: @
Value: feedback-smtp.resend.com
Priority: 10
```

5. Wait for verification (5-10 minutes)

### 6.3 Get API Key

1. Go to "API Keys" in Resend dashboard
2. Click "Create API Key"
3. Name: "Ripple Production"
4. Copy API key

### 6.4 Add Environment Variable to Vercel

```bash
RESEND_API_KEY=your_api_key_here
```

---

## Step 7: Final Environment Variables

### Complete `.env.local` (for local development)

```bash
# Database (Supabase)
DATABASE_URL=
DIRECT_URL=

# Auth (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Worker Auth
WORKER_SECRET=

# Soketi (Real-time)
NEXT_PUBLIC_SOKETI_KEY=
NEXT_PUBLIC_SOKETI_HOST=
NEXT_PUBLIC_SOKETI_PORT=443
NEXT_PUBLIC_SOKETI_ENCRYPTED=true
SOKETI_SECRET=

# Groq AI
GROQ_API_KEY=

# Resend Email
RESEND_API_KEY=

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Vercel Production Environment Variables

In Vercel dashboard > Settings > Environment Variables, add **all** of the above (update `NEXT_PUBLIC_APP_URL` to production URL).

**Environment scopes**:
- **Production**: All variables
- **Preview**: Same as production (for PR previews)
- **Development**: Not needed (use `.env.local`)

---

## Step 8: Deploy to Production

### 8.1 Redeploy

After adding all environment variables:

1. Go to Vercel dashboard > "Deployments"
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for build to complete (~2-3 minutes)

**Or via CLI:**
```bash
vercel --prod
```

### 8.2 Verify Deployment

1. **Homepage**: `https://your-app.vercel.app`
2. **API Health Check**: `https://your-app.vercel.app/api/health` (create this endpoint)
3. **Worker routes**: `curl -X POST https://your-app.vercel.app/api/workers/moderation -H "Authorization: Bearer $WORKER_SECRET"` (should return `{"processed":0,...}`)
4. **Database**: Check Supabase SQL editor — `select count(*) from pgmq.q_moderation;`

---

## Step 9: Post-Deployment Verification

### 9.1 Test User Flow

1. **Sign up**: Create test account
2. **Send compliment**: Use wall link
3. **Check moderation**: Verify moderation worker ran (check Vercel function logs)
4. **Check email**: Verify Resend email received
5. **Check real-time**: Verify Pusher notification appears
6. **Reveal compliment**: Click to reveal
7. **Check database**: Verify `isRead = true`

### 9.2 Test Error Scenarios

1. **Send toxic compliment**: Should be rejected by AI moderation
2. **Rate limiting**: Send 11 compliments in 1 day (should fail)
3. **Invalid recipient**: Send to non-existent username (should fail)

### 9.3 Monitor Logs

**Vercel Logs:**
- Go to "Deployments" > Click on deployment > "Logs" tab
- Filter by "Error" to see issues

**Worker Logs:**
- Go to Vercel dashboard > "Deployments" > "Functions" tab
- Filter by `/api/workers/*` to see invocation logs

**Soketi Logs:**
- Go to Railway dashboard > Select your Soketi project > "Logs" tab
- Monitor WebSocket connections and events

---

## Step 10: Performance Optimization

### 10.1 Enable Vercel Analytics

1. Go to Vercel dashboard > "Analytics" tab
2. Click "Enable Analytics"
3. Monitor:
   - Page load times
   - Core Web Vitals
   - User traffic

### 10.2 Lighthouse Score

Run Lighthouse audit:
```bash
npx lighthouse https://your-app.vercel.app --view
```

**Target scores:**
- Performance: > 85
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### 10.3 Database Indexes

Verify indexes are created:
```sql
-- Check existing indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

Expected indexes:
- `compliments_recipient_id_idx`
- `compliments_created_at_idx`
- `compliments_moderation_status_idx`
- `compliments_is_public_idx`

---

## Step 11: Custom Domain (Optional)

### 11.1 Add Custom Domain

1. Go to Vercel dashboard > "Settings" > "Domains"
2. Click "Add"
3. Enter your domain (e.g., `ripple.com`)
4. Add DNS records to your domain provider:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

5. Wait for DNS propagation (5-10 minutes)
6. SSL certificate auto-generated by Vercel

### 11.2 Update Environment Variables

```bash
NEXT_PUBLIC_APP_URL=https://ripple.com
```

Redeploy after updating.

---

## Step 12: Monitoring & Alerts

### 12.1 Set Up Error Tracking (Sentry)

```bash
pnpm add @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

Add to Vercel env vars:
```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

### 12.2 Set Up Uptime Monitoring

**Option 1: Vercel Monitoring**
- Go to Vercel dashboard > "Monitoring"
- Enable uptime checks

**Option 2: UptimeRobot** (free)
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create monitor for `https://your-app.vercel.app`
3. Alert contacts: Your email

---

## Step 13: Backup Strategy

### 13.1 Database Backups

Vercel Postgres includes:
- **Daily automated backups** (7-day retention)
- Point-in-time recovery

**Manual backup:**
```bash
# Export database to SQL file
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql
```

### 13.2 Code Backups

- GitHub repository (already versioned)
- Vercel keeps deployment history (unlimited)

---

## Step 14: CI/CD Pipeline

### 14.1 GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

---

## Deployment Checklist

- [ ] Vercel project created and connected to GitHub
- [ ] Vercel Postgres database created
- [ ] Database migrations run (`pnpm drizzle-kit push`)
- [ ] pgmq and pg_cron extensions enabled in Supabase
- [ ] Moderation and notifications queues created
- [ ] WORKER_SECRET generated and added to Vercel
- [ ] vercel.json cron configured (daily-streak only)
- [ ] cron-job.org: moderation worker job created (POST every minute, Authorization header set)
- [ ] cron-job.org: notifications worker job created (POST every minute, Authorization header set)
- [ ] Soketi deployed to Railway and credentials configured
- [ ] Groq API key created and added to Vercel
- [ ] Resend account created and domain verified
- [ ] All environment variables added to Vercel
- [ ] Production deployment successful
- [ ] Test user flow (signup → send → receive → reveal)
- [ ] Test AI moderation (toxic content rejected)
- [ ] Test email delivery (Resend)
- [ ] Test real-time notifications (Soketi)
- [ ] Worker routes responding (test with curl + WORKER_SECRET)
- [ ] Lighthouse score > 85 (performance)
- [ ] Error tracking enabled (Sentry)
- [ ] Uptime monitoring enabled
- [ ] Database backups verified
- [ ] Custom domain configured (optional)

---

## Troubleshooting

### Issue: Database Connection Failed

**Cause**: Postgres connection string not set or incorrect

**Solution**:
1. Check Vercel dashboard > "Storage" > Your database
2. Verify `POSTGRES_URL` is set in environment variables
3. Redeploy

### Issue: Worker Routes Return 401

**Cause**: `WORKER_SECRET` not set or mismatch between Vercel env var and `vercel.json`

**Solution**:
1. Verify `WORKER_SECRET` is set in Vercel dashboard > "Settings" > "Environment Variables"
2. Test locally: `curl -X POST http://localhost:3000/api/workers/moderation -H "Authorization: Bearer your-secret"`
3. Check Vercel logs for `POST /api/workers/*` errors
4. Redeploy after updating env var

### Issue: Soketi Notifications Not Received

**Cause**: Soketi credentials incorrect or URL not accessible

**Solution**:
1. Verify Soketi is running on Railway: check Railway dashboard status
2. Test connection: `curl https://your-soketi-url.up.railway.app`
3. Verify env vars are set: `NEXT_PUBLIC_SOKETI_HOST`, `NEXT_PUBLIC_SOKETI_KEY`
4. Open browser console, look for Soketi WebSocket connection errors

### Issue: Emails Not Sent

**Cause**: Resend API key invalid or domain not verified

**Solution**:
1. Check Resend dashboard > "API Keys" - verify key is active
2. Check Resend dashboard > "Domains" - verify domain is verified
3. Check Vercel logs for `/api/workers/notifications` errors
4. Test email manually:
   ```bash
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"onboarding@resend.dev","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
   ```

### Issue: AI Moderation Failed

**Cause**: Groq API key invalid or quota exceeded

**Solution**:
1. Check [console.groq.com](https://console.groq.com) > "API Keys" — verify key is active
2. Check Groq usage/quota in the dashboard
3. Check Vercel logs for `/api/workers/moderation` errors

---

## Scaling Considerations

### Free Tier Limits

- **Vercel**: 100 GB bandwidth/month, 100 GB-hours compute
- **Supabase Postgres**: 512 MB storage
- **Vercel Cron**: 1 cron job on free tier (Hobby plan) — used for `daily-streak` only
- **cron-job.org**: Free tier, supports 1-minute intervals for `moderation` and `notifications` workers
- **Railway Soketi**: Shared CPU, limited to 2 concurrent connections (free tier)
- **Resend**: 100 emails/day
- **Groq**: Generous free tier (varies by model)

### When to Upgrade

**Vercel Pro** ($20/month):
- Unlimited cron jobs
- Upgrade when: you need more than 2 cron schedules

**Railway Standard** ($5/month):
- More compute for Soketi
- Upgrade when: > 2 concurrent WebSocket connections

**Resend Pro** ($20/month):
- 50K emails/month
- Upgrade when: > 100 emails/day

---

## Conclusion

Your Ripple app is now live in production! 🎉

**Next steps:**
1. Share your wall link: `https://your-app.vercel.app/wall/your-username`
2. Monitor analytics and error logs
3. Iterate based on user feedback
4. Scale infrastructure as needed

**Support Resources:**
- Vercel Docs: https://vercel.com/docs
- Vercel Cron Docs: https://vercel.com/docs/cron-jobs
- Supabase pgmq Docs: https://supabase.com/docs/guides/database/extensions/pgmq
- Soketi Docs: https://docs.soketi.app
- Railway Docs: https://docs.railway.app
- Resend Docs: https://resend.com/docs
- Groq Docs: https://console.groq.com/docs
