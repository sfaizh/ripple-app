# Ripple - Cost Analysis & Optimization

## Overview

This document analyzes costs for running Ripple as a hobby project with 100-1000 users using our **free-tier optimized stack**.

**Architecture**: Vercel + Supabase + Soketi + Groq

---

## Cost Forecast by Service

### 1. Vercel (Hosting)

**Free Tier Limits:**
- 100 GB bandwidth/month
- 100 GB-hours compute/month
- 6000 build minutes/month
- Unlimited deployments

**Usage Estimates:**

| Users | Page Views/Month | Bandwidth | Compute Hours | Cost |
|-------|-----------------|-----------|---------------|------|
| 100   | ~10,000         | ~5 GB     | ~10 hours     | **$0** |
| 500   | ~50,000         | ~25 GB    | ~40 hours     | **$0** |
| 1000  | ~100,000        | ~50 GB    | ~80 hours     | **$0** |

**Assumptions:**
- Average page size: 500 KB (with images)
- Each user visits 2x/week, views 5 pages/session
- API routes add ~0.5s compute time per request

**Verdict**: ✅ **FREE** for up to 1000 users (well within limits)

---

### 2. Supabase (Database + Auth)

**Free Tier Limits:**
- 500 MB database storage
- Unlimited compute hours
- 50,000 monthly active users (auth)
- 2 GB egress/month
- 2 million Realtime messages/month
- Daily backups (7-day retention)

**Usage Estimates:**

| Users | Compliments | Storage Used | Auth Users | Cost |
|-------|-------------|--------------|------------|------|
| 100   | ~1,000      | ~1 MB        | 100        | **$0** |
| 500   | ~10,000     | ~10 MB       | 500        | **$0** |
| 1000  | ~50,000     | ~50 MB       | 1,000      | **$0** |

**Assumptions:**
- Each compliment: ~1 KB (message + metadata)
- Each user: ~500 bytes (profile data)
- Average 50 compliments sent/received per user over lifetime
- Unlimited compute hours (no query time restrictions)

**Verdict**: ✅ **FREE** for up to 1000 users (storage: 50 MB of 500 MB, well within limits)

**Why Better Than Vercel Postgres:**
- ✅ Unlimited compute hours (vs 60 hours/month)
- ✅ Built-in auth (saves BetterAuth setup)
- ✅ Larger storage (500 MB vs 512 MB)
- ✅ Built-in realtime capabilities
- ✅ Better dashboard and tooling

---

### 3. Soketi (Real-time Notifications)

**Free Tier Limits:**
- Unlimited concurrent connections (self-hosted)
- Unlimited messages
- No usage caps

**Hosting on fly.io Free Tier:**
- 3 shared CPU VMs (160 GB outbound/month)
- Perfect for Soketi deployment

**Usage Estimates:**

| Users | Peak Concurrent | Messages/Day | Cost |
|-------|-----------------|--------------|------|
| 100   | ~10-20          | ~500         | **$0** |
| 500   | ~50-75          | ~2,500       | **$0** |
| 1000  | ~100-150        | ~5,000       | **$0** |

**Assumptions:**
- 10% of users online at peak time
- Each compliment = 1 WebSocket message
- Average 5 compliments sent per user per day

**Verdict**: ✅ **FREE** for unlimited users (self-hosted on fly.io)

**Why Better Than Pusher:**
- ✅ No concurrent connection limits
- ✅ No message volume limits
- ✅ Pusher-compatible API (easy migration)
- ✅ One-time 5-minute setup
- ✅ Saves $49/month at scale

---

### 4. Async Moderation (Inline via `after()`)

**No external service needed.** Moderation runs inside the same Vercel serverless invocation as `POST /api/compliments/send` using Next.js `after()`. Groq is called once per compliment — same call count as the old queue approach, just triggered immediately instead of up to a minute later.

**Usage Estimates:**

| Users | Compliments/Month | `after()` Invocations | Cost |
|-------|-------------------|-----------------------|------|
| 100   | ~500              | ~500                  | **$0** |
| 500   | ~2,500            | ~2,500                | **$0** |
| 1000  | ~5,000            | ~5,000                | **$0** |

**Note**: `after()` runs within the same 100 GB-hours Vercel compute budget. Each invocation adds <2 seconds of tail compute, well within free tier limits.

**Verdict**: ✅ **FREE** — no separate queue service, no cron-job.org account needed

---

### 5. Groq API (AI Moderation)

**Free Tier Limits:**
- Generous daily token limits (varies by model)
- llama-3.1-8b-instant: fast and very affordable

**Usage Estimates:**

| Users | Compliments/Day | API Calls/Day | Cost |
|-------|-----------------|---------------|------|
| 100   | ~15             | ~15           | **$0** |
| 500   | ~80             | ~80           | **$0** |
| 1000  | ~160            | ~160          | **$0** |

**Assumptions:**
- Each compliment = 1 Groq API call
- Average user sends 1 compliment every 2 days

**Verdict**:
- ✅ **FREE** for up to 1000 users on free tier
- Scale cost: Very low pay-as-you-go pricing if limits exceeded

---

### 6. Resend (Email Notifications) - OPTIONAL

**Free Tier Limits:**
- 100 emails/day
- 3,000 emails/month
- 1 domain

**Usage Estimates:**

| Users | Compliments/Day | Emails/Day (if enabled) | Cost |
|-------|-----------------|-------------------------|------|
| 100   | ~15             | ~15                     | **$0** |
| 500   | ~80             | ~80                     | ⚠️ **$20/month** |
| 1000  | ~160            | ~160                    | ⚠️ **$20/month** |

**Recommendation**: ❌ **Skip email notifications for free tier**

Use instead:
- ✅ Soketi real-time notifications (free)
- ✅ In-app notification badges (free)
- ✅ Browser push notifications via Web Push API (free)

**Upgrade Cost**: Pro: $20/month (50,000 emails/month)

**Verdict**: Skip emails to stay free, or use daily digest to stay under 100/day

---

## Total Monthly Cost Summary

### Recommended Stack (100% Free)

| Service | Cost |
|---------|------|
| Vercel Hosting | $0 |
| Supabase (Database + Auth) | $0 |
| Soketi (Real-time on Railway) | $0 |
| Moderation (`after()` inline) | $0 (no extra service) |
| Groq API | $0 |
| Resend | $0 (skip emails) |
| **TOTAL** | **$0/month** ✅ |

**Supports**: Up to 1000 users with all core features

---

### Optional: With Email Notifications

| Service | Cost |
|---------|------|
| Vercel Hosting | $0 |
| Supabase | $0 |
| Soketi | $0 |
| Moderation (`after()` inline) | $0 |
| Groq API | $0 |
| Resend | **$20** (if >100 emails/day) |
| **TOTAL** | **$20/month** ⚠️ |

**Supports**: 500+ users with email notifications

---

### New Stack (FREE at 1000 users)

| Service | Cost at 1000 users |
|---------|-------------------|
| Vercel Hosting | $0 |
| Supabase | $0 (unlimited compute) |
| Soketi | $0 (self-hosted) |
| Moderation (`after()` inline) | $0 |
| Groq API | $0 |
| Resend | $0 (skip emails) |
| **TOTAL** | **$0/month** ✅ |

**Savings: $89/month → $0/month**

---

## Key Optimizations

### 1. Supabase Instead of Vercel Postgres
**Saves**: $20/month at scale

**Benefits:**
- Unlimited compute hours (no 60-hour limit)
- Built-in auth (no BetterAuth needed)
- Better free tier (500 MB storage)
- Built-in realtime (bonus feature)
- Better tooling and dashboard
- Daily backups included

### 2. Soketi Instead of Pusher
**Saves**: $49/month at scale

**Benefits:**
- No concurrent connection limits
- No message volume limits
- Pusher-compatible API (drop-in replacement)
- Self-hosted on fly.io free tier
- One-time setup, runs forever

**Setup Time**: 5 minutes

### 3. Skip Email Notifications
**Saves**: $20/month at scale

**Alternatives:**
- Soketi real-time notifications (instant, free)
- In-app notification badges (persistent, free)
- Browser push notifications (works offline, free)
- Daily digest emails (stay under 100/day, free)

---

## Implementation: Soketi on fly.io

### One-Time Setup (5 minutes)

```bash
# Install fly CLI
curl -L https://fly.io/install.sh | sh

# Login to fly.io
fly auth login

# Create soketi app
fly launch --image 'quay.io/soketi/soketi:latest-16-alpine' --name ripple-soketi

# Set environment variables
fly secrets set \
  SOKETI_DEFAULT_APP_ID=app-id-123 \
  SOKETI_DEFAULT_APP_KEY=app-key-123456 \
  SOKETI_DEFAULT_APP_SECRET=secret-key-123456

# Deploy
fly deploy
```

### Add to Your App

```typescript
// lib/soketi/server.ts
import Pusher from 'pusher'; // Soketi is Pusher-compatible!

export const soketiServer = new Pusher({
  appId: process.env.SOKETI_APP_ID!,
  key: process.env.NEXT_PUBLIC_SOKETI_KEY!,
  secret: process.env.SOKETI_SECRET!,
  host: process.env.NEXT_PUBLIC_SOKETI_HOST!, // ripple-soketi.fly.dev
  port: 6001,
  useTLS: true,
});
```

**That's it!** Works exactly like Pusher, costs $0/month.

---

## Scaling Plan

### Phase 1: MVP (0-500 users) - $0/month
- Supabase free tier (includes pgmq queues)
- Soketi on fly.io free tier
- Skip email notifications
- All core features working

### Phase 2: Growth (500-2000 users) - $0/month
- Still on free tiers!
- Add Redis caching (Upstash free tier)
- Optimize database queries
- Maybe add daily digest emails (stay under 100/day)

### Phase 3: Scale (2000-10K users) - $25-30/month
- Upgrade to Supabase Pro ($25/month):
  - 8 GB database
  - 100 GB egress
  - 7-day point-in-time recovery
- Soketi still free (scale horizontally on fly.io)
- Still skip per-compliment emails (use in-app)

### Phase 4: Heavy Scale (10K+ users) - $50-100/month
- Supabase Pro: $25/month
- Soketi: Still free or upgrade fly.io ($5-10/month for dedicated)
- Optional: Resend Pro if adding emails ($20/month)
- Optional: Groq pay-as-you-go if free tier exceeded

**Note**: At 10K users, you can afford to monetize ($3/month subscription × 100 paying users = $300/month revenue)

---

## Cost Monitoring Checklist

Set up alerts to avoid surprise bills:

- [ ] Vercel: Set bandwidth alert at 80 GB (dashboard)
- [ ] Supabase: Monitor storage (dashboard > Database > Usage)
- [ ] Soketi: Monitor Railway usage in dashboard
- [ ] Groq: Monitor usage in Groq console dashboard
- [ ] Resend: Count emails sent/day if using (stay under 90)

**Tools:**
- Vercel dashboard: Usage tab
- Supabase dashboard: Usage tab + SQL editor for queue depth
- Vercel dashboard: Functions tab for send route invocation counts and `after()` logs

---

## Break-Even Analysis

**If you wanted to monetize** (just for reference):

Current cost at 1000 users: **$0/month**

If you added all paid features:
- Supabase Pro: $25/month
- Resend Pro: $20/month
- Total: $45/month

To break even:
- $45/month ÷ 1000 users = $0.045 per user/month
- Or: 15 paying users at $3/month subscription
- Or: 9 paying users at $5/month subscription

**But for a hobby project**: Stay on free tier! 🎉

---

## Comparison: Free Tier Limits

| Resource | Supabase | Vercel Postgres | Winner |
|----------|----------|-----------------|--------|
| Storage | 500 MB | 512 MB | ~Tie |
| Compute | Unlimited | 60 hours/month | ✅ Supabase |
| Connections | Unlimited | Limited by compute | ✅ Supabase |
| Auth | ✅ Built-in | ❌ Need BetterAuth | ✅ Supabase |
| Realtime | ✅ Built-in | ❌ None | ✅ Supabase |
| Backups | ✅ Daily (7 days) | ✅ Daily (7 days) | Tie |
| Dashboard | ✅ Excellent | ✅ Good | ✅ Supabase |
| CLI Tools | ✅ Excellent | ⚠️ Limited | ✅ Supabase |

**Winner: Supabase** (more features, better limits, same price: $0)

---

## Conclusion

**For a hobby project with 100-1000 users:**

✅ **Total Cost: $0/month**

**What You Get (Free):**
- Full Next.js app on Vercel
- PostgreSQL database (500 MB)
- User authentication
- Real-time notifications
- AI moderation
- Event processing
- Daily backups
- All core features working

**What You're NOT Getting:**
- ❌ Email notifications (use in-app + browser push instead)
- ❌ Point-in-time recovery (daily backups only)

**Trade-offs Worth It?** Absolutely! 🎉

You save **$89/month** by:
1. Using Supabase instead of Vercel Postgres (saves $20)
2. Using Soketi instead of Pusher (saves $49)
3. Skipping email notifications (saves $20)

**Next Steps:**
1. Follow DEPLOYMENT.md to set up Supabase + Soketi
2. Deploy to Vercel
3. Start building!

**When to Upgrade:**
- Supabase Pro ($25/month): When you need >500 MB database or PITR
- Resend ($20/month): When you REALLY want email notifications
- But for a hobby project? Stay free! 🚀
