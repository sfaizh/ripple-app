# E2E Tests

End-to-end tests for Ripple using [Playwright](https://playwright.dev).

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run in UI mode (interactive)
pnpm test:e2e:ui

# Debug mode (browser opens, step through tests)
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e e2e/user-flow.spec.ts

# Run tests matching a pattern
pnpm test:e2e --grep "signup"
```

## Test Suites

### `user-flow.spec.ts`
Tests the core user journey:
- Landing page loads
- Sign-up with email verification (shows "Check your email" toast)
- Anonymous compliment sending (no auth required)
- Inbox stats display (Received, Sent, Streak)
- Reveal animation on compliments

**Prerequisites:** Running dev server with valid Supabase and auth configuration.

### `moderation-worker.spec.ts`
Tests the AI moderation pipeline:
- Clean messages are approved and increment `totalReceived`
- Toxic messages are rejected and do NOT increment `totalReceived`
- Notifications are enqueued after approval
- Worker authorization (Bearer token validation)
- Empty queue is handled gracefully

**Prerequisites:**
- Running dev server
- `WORKER_SECRET` env var set
- pgmq queue configured OR dev auto-approve fallback enabled
- Valid Groq API key (`GROQ_API_KEY`)

## Test Data

Tests use isolated email addresses generated at runtime:
- `test.${timestamp}.${random}@ripple-test.local`

This prevents collisions and allows parallel test execution.

## CI/CD Integration

In CI environments (e.g., GitHub Actions), tests run with:
- Single worker (no parallelization)
- Retries enabled (default: 2)
- Screenshots on failure
- Full HTML report at `playwright-report/`

## Debugging

If a test fails:

1. **Check the HTML report:**
   ```bash
   pnpm test:e2e
   # Then open playwright-report/index.html
   ```

2. **Run in debug mode:**
   ```bash
   pnpm test:e2e:debug
   ```

3. **Enable tracing (saves video/trace of failure):**
   Edit `playwright.config.ts` and change:
   ```ts
   trace: 'on',  // Capture every test
   ```

4. **View full output:**
   ```bash
   pnpm test:e2e --verbose
   ```

## Known Limitations

- Tests don't yet directly verify database state (e.g., compliment moderation_status)
- Email verification in `user-flow.spec.ts` only checks for the toast; actual email receipt is not verified
- Some tests assume specific test data exists (noted in test comments)

These will be addressed in Stage 3 when we integrate a test database and seeding utilities.

## Next Steps

- [ ] Add test database seeding (factories for users, compliments)
- [ ] Add authenticated user context via session cookies
- [ ] Test pagination in inbox/wall
- [ ] Test real-time notifications via Soketi
- [ ] Test error handling (network failures, rate limits)
- [ ] Add performance benchmarks
