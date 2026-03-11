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

## Step 2: Database Setup (Vercel Postgres)

### 2.1 Add Vercel Postgres

1. Go to your project in Vercel dashboard
2. Click "Storage" tab
3. Click "Create Database"
4. Select "Postgres" (Neon)
5. Choose region (same as your app deployment)
6. Click "Create"

### 2.2 Get Connection Strings

Vercel will automatically add these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

**Note**: These are automatically injected into your app - no manual setup needed!

### 2.3 Run Database Migrations

```bash
# Install Vercel CLI locally
pnpm add -g vercel

# Login
vercel login

# Link to your project
vercel link

# Pull environment variables locally
vercel env pull .env.local

# Run migrations
pnpm drizzle-kit push
```

**Alternative: Use Vercel Console**

1. Go to "Storage" > Your Postgres database
2. Click "Query" tab
3. Paste SQL from `drizzle/migrations/*.sql`
4. Click "Run Query"

---

## Step 3: Inngest Setup

### 3.1 Create Inngest Account

1. Go to [inngest.com](https://www.inngest.com)
2. Sign up (free tier)
3. Create new app: "Ripple"

### 3.2 Get API Keys

1. In Inngest dashboard, go to "Settings" > "Keys"
2. Copy:
   - **Event Key** (for sending events)
   - **Signing Key** (for webhook verification)

### 3.3 Configure Inngest Webhook

1. In Inngest dashboard, go to "Apps" > "Ripple"
2. Click "Sync"
3. Enter webhook URL: `https://your-app.vercel.app/api/inngest`
4. Click "Save"

### 3.4 Add Environment Variables to Vercel

```bash
# In Vercel dashboard > Settings > Environment Variables
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=your_signing_key_here
```

### 3.5 Deploy Inngest Functions

```bash
# After deploying to Vercel, Inngest will auto-discover functions
# Check in Inngest dashboard > "Functions" to verify all are registered:
# - moderate-compliment
# - send-notification-email
# - send-pusher-notification
# - daily-streak-check
# - send-streak-reward
```

---

## Step 4: Pusher Setup

### 4.1 Create Pusher Account

1. Go to [pusher.com](https://pusher.com)
2. Sign up (free tier: 100 concurrent connections)
3. Create new app: "Ripple"

### 4.2 Get Credentials

In Pusher dashboard > "App Keys":
- **App ID**
- **Key** (public)
- **Secret** (private)
- **Cluster** (e.g., `us2`)

### 4.3 Configure CORS

In Pusher dashboard > "App Settings":
- Enable client events: **No**
- Authorized domains: `https://your-app.vercel.app`

### 4.4 Add Environment Variables to Vercel

```bash
NEXT_PUBLIC_PUSHER_KEY=your_public_key_here
PUSHER_APP_ID=your_app_id_here
PUSHER_SECRET=your_secret_here
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

---

## Step 5: Gemini API Setup

### 5.1 Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: "Ripple"
3. Enable **Generative Language API** (Gemini)

### 5.2 Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy API key
4. Restrict key:
   - **Application restrictions**: None (or HTTP referrers for `*.vercel.app`)
   - **API restrictions**: Generative Language API only

### 5.3 Add Environment Variable to Vercel

```bash
GEMINI_API_KEY=your_api_key_here
```

---

## Step 6: Resend Email Setup

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

## Step 7: BetterAuth Setup

### 7.1 Generate Secret Key

```bash
# Generate random 32-character secret
openssl rand -base64 32
```

### 7.2 Add Environment Variables to Vercel

```bash
BETTER_AUTH_SECRET=your_generated_secret_here
BETTER_AUTH_URL=https://your-app.vercel.app
```

**Important**: Update `BETTER_AUTH_URL` with your actual Vercel URL

---

## Step 8: Final Environment Variables

### Complete `.env.local` (for local development)

```bash
# Database (Vercel Postgres)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Auth (BetterAuth)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Pusher
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_APP_ID=
PUSHER_SECRET=
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Gemini AI
GEMINI_API_KEY=

# Resend Email
RESEND_API_KEY=

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Vercel Production Environment Variables

In Vercel dashboard > Settings > Environment Variables, add **all** of the above (update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to production URL).

**Environment scopes**:
- **Production**: All variables
- **Preview**: Same as production (for PR previews)
- **Development**: Not needed (use `.env.local`)

---

## Step 9: Deploy to Production

### 9.1 Redeploy

After adding all environment variables:

1. Go to Vercel dashboard > "Deployments"
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for build to complete (~2-3 minutes)

**Or via CLI:**
```bash
vercel --prod
```

### 9.2 Verify Deployment

1. **Homepage**: `https://your-app.vercel.app`
2. **API Health Check**: `https://your-app.vercel.app/api/health` (create this endpoint)
3. **Inngest Functions**: Check Inngest dashboard > "Functions" (should show 5 functions)
4. **Database**: Check Vercel dashboard > "Storage" > Query tab

---

## Step 10: Post-Deployment Verification

### 10.1 Test User Flow

1. **Sign up**: Create test account
2. **Send compliment**: Use wall link
3. **Check moderation**: Verify Inngest function ran (check dashboard)
4. **Check email**: Verify Resend email received
5. **Check real-time**: Verify Pusher notification appears
6. **Reveal compliment**: Click to reveal
7. **Check database**: Verify `isRead = true`

### 10.2 Test Error Scenarios

1. **Send toxic compliment**: Should be rejected by AI moderation
2. **Rate limiting**: Send 11 compliments in 1 day (should fail)
3. **Invalid recipient**: Send to non-existent username (should fail)

### 10.3 Monitor Logs

**Vercel Logs:**
- Go to "Deployments" > Click on deployment > "Logs" tab
- Filter by "Error" to see issues

**Inngest Logs:**
- Go to Inngest dashboard > "Runs"
- Check success rate (should be > 99%)

**Pusher Logs:**
- Go to Pusher dashboard > "Debug Console"
- Verify events being triggered

---

## Step 11: Performance Optimization

### 11.1 Enable Vercel Analytics

1. Go to Vercel dashboard > "Analytics" tab
2. Click "Enable Analytics"
3. Monitor:
   - Page load times
   - Core Web Vitals
   - User traffic

### 11.2 Lighthouse Score

Run Lighthouse audit:
```bash
npx lighthouse https://your-app.vercel.app --view
```

**Target scores:**
- Performance: > 85
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### 11.3 Database Indexes

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

## Step 12: Custom Domain (Optional)

### 12.1 Add Custom Domain

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

### 12.2 Update Environment Variables

```bash
BETTER_AUTH_URL=https://ripple.com
NEXT_PUBLIC_APP_URL=https://ripple.com
```

Redeploy after updating.

---

## Step 13: Monitoring & Alerts

### 13.1 Set Up Error Tracking (Sentry)

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

### 13.2 Set Up Uptime Monitoring

**Option 1: Vercel Monitoring**
- Go to Vercel dashboard > "Monitoring"
- Enable uptime checks

**Option 2: UptimeRobot** (free)
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create monitor for `https://your-app.vercel.app`
3. Alert contacts: Your email

---

## Step 14: Backup Strategy

### 14.1 Database Backups

Vercel Postgres includes:
- **Daily automated backups** (7-day retention)
- Point-in-time recovery

**Manual backup:**
```bash
# Export database to SQL file
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql
```

### 14.2 Code Backups

- GitHub repository (already versioned)
- Vercel keeps deployment history (unlimited)

---

## Step 15: CI/CD Pipeline

### 15.1 GitHub Actions (Optional)

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
- [ ] Inngest account created and webhook configured
- [ ] Pusher account created and CORS configured
- [ ] Gemini API key created and restricted
- [ ] Resend account created and domain verified
- [ ] BetterAuth secret generated
- [ ] All environment variables added to Vercel
- [ ] Production deployment successful
- [ ] Test user flow (signup → send → receive → reveal)
- [ ] Test AI moderation (toxic content rejected)
- [ ] Test email delivery (Resend)
- [ ] Test real-time notifications (Pusher)
- [ ] Inngest functions registered (5 total)
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

### Issue: Inngest Functions Not Registered

**Cause**: Inngest webhook not configured or signing key mismatch

**Solution**:
1. Check Inngest dashboard > "Apps" > "Ripple" > "Sync"
2. Verify webhook URL is correct: `https://your-app.vercel.app/api/inngest`
3. Verify `INNGEST_SIGNING_KEY` matches Inngest dashboard
4. Check Vercel logs for `POST /api/inngest` errors

### Issue: Pusher Notifications Not Received

**Cause**: Pusher credentials incorrect or CORS not configured

**Solution**:
1. Check Pusher dashboard > "App Keys" - verify credentials
2. Check Pusher dashboard > "App Settings" > Authorized domains
3. Open browser console, look for Pusher connection errors
4. Verify `NEXT_PUBLIC_PUSHER_KEY` is set (with `NEXT_PUBLIC_` prefix!)

### Issue: Emails Not Sent

**Cause**: Resend API key invalid or domain not verified

**Solution**:
1. Check Resend dashboard > "API Keys" - verify key is active
2. Check Resend dashboard > "Domains" - verify domain is verified
3. Check Inngest logs for `send-notification-email` function errors
4. Test email manually:
   ```bash
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"onboarding@resend.dev","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
   ```

### Issue: AI Moderation Failed

**Cause**: Gemini API key invalid or quota exceeded

**Solution**:
1. Check Google Cloud Console > "APIs & Services" > "Credentials"
2. Verify Generative Language API is enabled
3. Check API quota: "APIs & Services" > "Quotas"
4. Check Inngest logs for `moderate-compliment` function errors

---

## Scaling Considerations

### Free Tier Limits

- **Vercel**: 100 GB bandwidth/month, 100 GB-hours compute
- **Vercel Postgres**: 512 MB storage, 60 compute hours
- **Inngest**: 1M step runs/month
- **Pusher**: 100 concurrent connections, 200k messages/day
- **Resend**: 100 emails/day
- **Gemini**: 15 requests/minute (free tier)

### When to Upgrade

**Vercel Pro** ($20/month):
- 1 TB bandwidth
- 1000 GB-hours compute
- Upgrade when: > 10K monthly active users

**Vercel Postgres Pro**:
- 256 GB storage
- Unlimited compute hours
- Upgrade when: > 50K compliments stored

**Inngest Pro**:
- 10M step runs/month
- Upgrade when: > 100K events/month

**Pusher Growth** ($49/month):
- 500 concurrent connections
- Upgrade when: > 100 concurrent users

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
- Inngest Docs: https://www.inngest.com/docs
- Pusher Docs: https://pusher.com/docs
- Resend Docs: https://resend.com/docs
- Gemini API Docs: https://ai.google.dev/docs
