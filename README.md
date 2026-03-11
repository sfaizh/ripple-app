<div align="center" id="readme-top">

<h1>ripple ✨</h1>
<p>An anonymous compliment platform. Send kind words. Make someone's day.</p>
<p><em>AI-moderated · Real-time · Free to host · No account needed to send</em></p>

<p>
  <a href="https://github.com/sfaizh/ripple-app/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/sfaizh/ripple-app.svg?style=for-the-badge" alt="Contributors" />
  </a>
  <a href="https://github.com/sfaizh/ripple-app/network/members">
    <img src="https://img.shields.io/github/forks/sfaizh/ripple-app.svg?style=for-the-badge" alt="Forks" />
  </a>
  <a href="https://github.com/sfaizh/ripple-app/stargazers">
    <img src="https://img.shields.io/github/stars/sfaizh/ripple-app.svg?style=for-the-badge" alt="Stars" />
  </a>
  <a href="https://github.com/sfaizh/ripple-app/issues">
    <img src="https://img.shields.io/github/issues/sfaizh/ripple-app.svg?style=for-the-badge" alt="Issues" />
  </a>
</p>

<p>
  <a href="https://ripple-black.vercel.app">View Demo</a>
  ·
  <a href="https://github.com/sfaizh/ripple-app/issues/new">Report Bug</a>
  ·
  <a href="https://github.com/sfaizh/ripple-app/issues/new">Request Feature</a>
</p>

</div>

---

## Table of Contents

- [About](#about)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Architecture](#architecture)
- [Roadmap](#roadmap)
- [License](#license)

---

## About

Ripple lets anyone send anonymous compliments to people they appreciate — no account needed to send. Recipients get a blur-to-reveal moment when they open each message, making it feel like unwrapping a gift.

Every message passes through an **LLM-based content moderation pipeline** powered by Groq's `llama-3.1-8b-instant` before it reaches the recipient's inbox, keeping the platform kind by default.

**Key characteristics:**
- **Truly anonymous** — senders need no account; sender identity is never stored or revealed
- **AI-moderated** — every compliment is screened by an LLM for toxic or harmful content before delivery; messages that fail moderation are silently rejected
- **$0/month infrastructure** — entire stack runs on free tiers (Vercel, Supabase, Railway, Groq, cron-job.org)
- **Real-time** — Soketi (self-hosted Pusher-compatible server) pushes a notification the moment a compliment is approved and delivered
- **Async job queue** — moderation runs off the critical path via pgmq (Supabase-native message queue) with a graceful auto-approve fallback for local development

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Built With

[![Next.js][Next.js-badge]][Next.js-url]
[![TypeScript][TypeScript-badge]][TypeScript-url]
[![Tailwind CSS][Tailwind-badge]][Tailwind-url]
[![Supabase][Supabase-badge]][Supabase-url]
[![Drizzle][Drizzle-badge]][Drizzle-url]
[![Vercel][Vercel-badge]][Vercel-url]
[![Groq][Groq-badge]][Groq-url]

[Next.js-badge]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next.js-url]: https://nextjs.org
[TypeScript-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org
[Tailwind-badge]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com
[Supabase-badge]: https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com
[Drizzle-badge]: https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black
[Drizzle-url]: https://orm.drizzle.team
[Vercel-badge]: https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white
[Vercel-url]: https://vercel.com
[Groq-badge]: https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white
[Groq-url]: https://groq.com

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [pnpm](https://pnpm.io) v9+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (free)
- A [Soketi](https://docs.soketi.app) instance (self-hosted on [Railway](https://railway.app) recommended)

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/sfaizh/ripple-app.git
   cd ripple-app
   ```

2. Install dependencies
   ```sh
   pnpm install
   ```

3. Copy the environment template and fill in your values
   ```sh
   cp .env.example .env.local
   ```

4. Push the database schema
   ```sh
   pnpm db:push
   ```

5. Start the dev server
   ```sh
   pnpm dev
   ```

### Environment Variables

> See `docs/ENVIRONMENT.md` for the full reference.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Usage

**Share your wall link** — after signing up, copy your `/wall/[username]` link and share it anywhere.

**Send a compliment** — anyone with your link can send you a message anonymously. No account required to send.

**Reveal compliments** — tap a blurred card in your inbox to reveal the message with an animation.

**Clue system** — senders can attach a contextual hint ("Someone who follows you on LinkedIn", "A colleague from your company", etc.) without revealing who they are.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Architecture

Ripple is designed to run entirely on free tiers for hobby-scale usage (100–1000 users).

| Concern | Solution | Why |
|---|---|---|
| Hosting | Vercel | Free serverless, CI/CD built-in |
| Database + Auth | Supabase | Unlimited compute hours, built-in auth, pgmq queues |
| Real-time | Soketi on Railway | Self-hosted Pusher-compatible, $0/month |
| AI Moderation | Groq (`llama-3.1-8b-instant`) | Fast free-tier LLM inference, no billing setup |
| Async jobs | pgmq + cron-job.org | Native Supabase queues triggered by external cron, no extra infra |

**Compliment delivery flow:**

```
Visitor → /wall/[username]
        → POST /api/compliments/send  (no auth required)
        → enqueue to pgmq moderation queue
        → cron-job.org triggers POST /api/workers/moderation
        → Groq LLM scores message for toxicity
        → approved → increment totalReceived
                   → enqueue notifications job
                   → Soketi pushes to recipient's private channel
                   → compliment appears in /inbox
        → rejected → silently dropped
```

**AI moderation detail:** The moderation worker calls `moderateWithGroq()` in `lib/ai/moderation.ts`, which prompts `llama-3.1-8b-instant` to score the message across multiple toxicity categories. Messages scoring above the threshold are rejected and never delivered. In local development without pgmq configured, compliments are auto-approved so the queue is not a hard dependency.

> See `docs/ARCHITECTURE.md` for full event flow diagrams.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roadmap

- [x] Anonymous compliment sending (no account required)
- [x] Blur-to-reveal inbox with read tracking
- [x] Public wall pages with compliment feed
- [x] AI content moderation via Groq
- [x] Real-time notifications via Soketi
- [x] Email confirmation flow
- [ ] Reply to compliments (threading)
- [ ] Custom wall themes
- [ ] Reactions on wall compliments
- [ ] Mobile app

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

Distributed under the MIT License.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
