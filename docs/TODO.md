# Ripple - Feature Implementation Checklist

## Immediate needs

### Authentication (Supabase Auth)
- [ ] Set up Supabase Auth with email/password
- [ ] Create user registration flow
- [ ] Implement sign-in page
- [ ] Add protected route middleware
- [ ] Generate unique username/slug on signup
- [ ] Create user profile model (username, email, createdAt)

### Send/Receive Compliments - Core Flow
- [ ] Database schema for compliments table
- [ ] API route: POST /api/compliments/send
- [ ] API route: GET /api/compliments/inbox
- [ ] Compliment send form (category selection, message input)
- [ ] Compliment inbox view (list of received compliments)
- [ ] User wall page: /wall/[username] (public compliment sending)

### Basic Reveal Animation
- [ ] Create blur overlay component
- [ ] Implement click-to-reveal interaction
- [ ] Add fade-in animation with framer-motion or CSS
- [ ] Mark compliment as "read" after reveal
- [ ] Update database: isRead field

---

## Additional features

### Clue System
- [ ] Database: add clueType field (linkedin, company, recent, generic)
- [ ] Clue generation logic based on sender context
- [ ] Display clue on compliment card: "Someone who follows you on LinkedIn said..."
- [ ] API: allow sender to select clue type (optional)

### Real-time Notifications (Soketi)
- [ ] Set up Soketi server client
- [ ] Set up Soketi client SDK
- [ ] Create notification channel per user: private-user-{userId}
- [ ] Trigger event on new compliment: "new-compliment"
- [ ] Frontend: Subscribe to user channel
- [ ] Show toast notification: "You have a secret compliment waiting"

### Email Notifications (Resend) - *Skip this for the current project*
- [ ] Set up Resend API key
- [ ] Email template: "You have a new compliment"
- [ ] Inngest function: send-notification-email
- [ ] Trigger: after compliment approved by moderation
- [ ] Email content: teaser + link to reveal
- [ ] User preference: email notification on/off

### AI Moderation (Gemini)
- [ ] Set up Gemini API client
- [ ] Create moderation prompt template (filter: abuse, sexual, toxic, dangerous, hate)
- [ ] Inngest function: moderate-compliment
- [ ] Moderation flow: queue on send → moderate → approve/reject
- [ ] Store moderation status in database (pending, approved, rejected)
- [ ] Only show approved compliments to recipient

### Trending Wall
- [ ] Public feed page: /trending
- [ ] API route: GET /api/compliments/trending
- [ ] Query: public compliments, no names, sorted by recent
- [ ] Display: category badge, compliment text, "X minutes ago"
- [ ] Infinite scroll or pagination
- [ ] Toggle: opt-in/opt-out for public display

### Themes (3 Options)
- [ ] Define 3 theme presets (colors, gradients)
- [ ] Store user theme preference in database
- [ ] Apply theme to user wall page
- [ ] Theme selector UI in settings
- [ ] CSS variables for theme colors

### Response Threads
- [ ] Database: add parentId field for threading
- [ ] API: POST /api/compliments/reply
- [ ] UI: Reply button on compliment cards
- [ ] Thread view: show conversation chain
- [ ] Anonymous "Thank you" quick reply

### Team Mode
- [ ] Team model: company name, SSO config, members
- [ ] Team auth: integrate SSO (OAuth)
- [ ] Team wall: shared compliment feed
- [ ] Team admin dashboard
- [ ] Event mode: wedding/conference walls

### Analytics
- [ ] Track: compliments sent, received, read
- [ ] Shareable stats page: "You've made 23 people smile this month"
- [ ] OG image generation for stats
- [ ] Insights: most active day, favorite category

### Viral Mechanics
- [ ] "Get 5, Give 1": nudge system after receiving 5
- [ ] Compliment streaks: track daily sends
- [ ] Streak reward: unlock custom theme after 7 days
- [ ] Database: user stats table (sentCount, receivedCount, streak)

---

## Technical Debt & Optimization

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
- [ ] E2E tests for user flows
- [ ] Load testing for database queries
- [ ] Gemini API mock for testing

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor Inngest function success rates
- [ ] Track Soketi notification delivery
- [ ] Monitor email delivery rates
- [ ] Database query performance monitoring

---

## Success Metrics - *Skip this for the current project*

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
  - Inngest function success rate > 99%
  - Real-time notification delivery rate > 98%
  - Email delivery rate > 98%
