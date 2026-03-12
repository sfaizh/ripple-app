# Ripple - Feature Implementation Checklist

## Stage 1 - Immediate needs

### Authentication (Supabase Auth)
- [x] Set up Supabase Auth with email/password
- [x] Create user registration flow
- [x] Implement sign-in page
- [x] Add protected route middleware
- [x] Generate unique username/slug on signup
- [x] Create user profile model (username, email, createdAt)

### Send/Receive Compliments - Core Flow
- [x] Database schema for compliments table
- [x] API route: POST /api/compliments/send
- [x] API route: GET /api/compliments/inbox
- [x] Compliment send form (category selection, message input)
- [x] Compliment inbox view (list of received compliments)
- [x] User wall page: /wall/[username] (public compliment sending)

### Basic Reveal Animation
- [x] Create blur overlay component
- [x] Implement click-to-reveal interaction
- [x] Add fade-in animation with framer-motion or CSS
- [x] Mark compliment as "read" after reveal
- [x] Update database: isRead field

---

## Stage 2 - Additional features

### Send Compliment from Inbox
- [x] "Send a Compliment" button on inbox page opens a modal
- [x] Two-step flow: username entry → compliment form (reuses WallSendForm/SendForm)
- [x] Modal closes and resets after successful send

### Clue System
- [ ] Database: add clueType field (linkedin, company, recent, generic)
- [ ] Clue generation logic based on sender context
- [ ] Display clue on compliment card: "Someone who follows you on LinkedIn said..."
- [ ] API: allow sender to select clue type (optional)

### Real-time Notifications (Soketi)
- [x] Set up Soketi server client
- [x] Set up Soketi client SDK
- [x] Create notification channel per user: private-user-{userId}
- [x] Trigger event on new compliment: "new-compliment"
- [x] Frontend: Subscribe to user channel
- [x] Show toast notification: "You have a secret compliment waiting"

### Email Notifications (Resend) - *Skip this for the current project*
- [ ] Set up Resend API key
- [ ] Email template: "You have a new compliment"
- [ ] Queue worker: notifications worker (enqueue after moderation approval)
- [ ] Trigger: after compliment approved by moderation
- [ ] Email content: teaser + link to reveal
- [ ] User preference: email notification on/off

### AI Moderation (Groq)
- [x] Set up Groq API key in Vercel env vars
- [x] Create moderation prompt template (filter: abuse, sexual, toxic, dangerous, hate)
- [x] Queue worker: moderation worker (`/api/workers/moderation`)
- [x] Moderation flow: enqueue on send → worker moderates → approve/reject
- [x] Store moderation status in database (pending, approved, rejected)
- [x] Only show approved compliments to recipient
- [x] Configure cron-job.org to POST `/api/workers/moderation` every minute with `Authorization: Bearer <WORKER_SECRET>` header (Vercel Hobby throttles per-minute crons)

### Trending Wall *Skip this for the current project*
- [ ] Public feed page: /trending
- [ ] API route: GET /api/compliments/trending
- [ ] Query: public compliments, no names, sorted by recent
- [ ] Display: category badge, compliment text, "X minutes ago"
- [ ] Infinite scroll or pagination
- [ ] Toggle: opt-in/opt-out for public display

### Themes (3 Options) *Skip this for the current project*
- [ ] Define 3 theme presets (colors, gradients)
- [ ] Store user theme preference in database
- [ ] Apply theme to user wall page
- [ ] Theme selector UI in settings
- [ ] CSS variables for theme colors

### Response Threads *Skip this for the current project*
- [ ] Database: add parentId field for threading
- [ ] API: POST /api/compliments/reply
- [ ] UI: Reply button on compliment cards
- [ ] Thread view: show conversation chain
- [ ] Anonymous "Thank you" quick reply

### Team Mode *Skip this for the current project*
- [ ] Team model: company name, SSO config, members
- [ ] Team auth: integrate SSO (OAuth)
- [ ] Team wall: shared compliment feed
- [ ] Team admin dashboard
- [ ] Event mode: wedding/conference walls

### Analytics
- [x] Track: compliments sent, received, read
- [x] Shareable stats page: "You've made 23 people smile this month"
- [ ] OG image generation for stats
- [ ] Insights: most active day, favorite category

### Viral Mechanics
- [ ] "Get 5, Give 1": nudge system after receiving 5
- [x] Compliment streaks: track daily sends
- [ ] Streak reward: unlock custom theme after 7 days
- [x] Database: user stats table (sentCount, receivedCount, streak)

---

## Stage 3 - Technical Debt & Optimization

### Performance
- [ ] Add database indexes (recipientId, createdAt, moderationStatus)
- [ ] Implement Redis caching for trending wall
- [ ] Optimize images with next/image
- [ ] Use ISR for public pages
- [ ] Monitor slow query log

### Security
- [ ] Rate limiting: max 10 compliments per user per day
- [ ] CSRF protection on forms
- [ ] Input sanitization (XSS prevention)
- [ ] Secure session management
- [ ] API authentication middleware

### Testing
- [ ] Unit tests for moderation logic
- [ ] Integration tests for API routes
- [x] E2E tests for user flows
- [ ] Load testing for database queries
- [ ] Groq API mock for testing

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor worker queue depth and job success rates
- [ ] Track Soketi notification delivery
- [ ] Monitor email delivery rates
- [ ] Database query performance monitoring

---

## Stage 4 - Success Metrics - *Skip this for the current project*

### MVP Success Criteria
- ✅ User can create account in < 30 seconds
- ✅ User can send compliment to another user's wall
- ✅ AI moderation blocks 100% of toxic test content
- ✅ Recipient receives real-time notification within 2 seconds
- ✅ Compliment reveals with smooth animation
- ✅ No critical errors in Vercel logs
- ✅ Lighthouse performance score > 85

### Additional Feature Success Criteria
- ✅ Trending wall shows 20+ public compliments
- ✅ Email notifications delivered within 30 seconds
- ✅ Users can switch themes and see changes immediately
- ✅ Clues display contextual information correctly
- ✅ All API routes respond in < 300ms (p95)

### Additional Metrics to Track
- Activation: % of users who send first compliment within 5 minutes
- Engagement: Daily active senders / total users
- Retention: 7-day retention rate (target: > 40%)
- Viral coefficient: Avg new signups per user sharing their wall
- Compliment quality: % of compliments marked as approved by AI
- Technical health:
  - API error rate < 0.5%
  - Worker queue success rate > 99%
  - Real-time notification delivery rate > 98%
  - Email delivery rate > 98%
