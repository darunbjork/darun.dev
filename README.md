# darun.dev

[![CI](https://github.com/darunbjork/darun.dev/actions/workflows/ci.yml/badge.svg)](https://github.com/darunbjork/darun.dev/actions/workflows/ci.yml)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Production AI portfolio platform — a full-stack TypeScript monorepo featuring a public portfolio site, an admin dashboard, and an AI-powered backend with GitHub integration, job watching, RAG chat, and analytics.

---

## Table of Contents

- [darun.dev](#darundev)
  - [Table of Contents](#table-of-contents)
  - [Live Demo](#live-demo)
    - [Run the demo locally in one command](#run-the-demo-locally-in-one-command)
  - [Screenshots](#screenshots)
    - [1. Projects — Admin Dashboard (`/admin/projects`)](#1-projects--admin-dashboard-adminprojects)
    - [2. Feedback Moderation (`/admin/feedback`)](#2-feedback-moderation-adminfeedback)
      - [2a. Pending queue](#2a-pending-queue)
      - [2b. Approved comments](#2b-approved-comments)
      - [2c. All feedback](#2c-all-feedback)
    - [3. Job Watchers (`/admin/job-watchers`)](#3-job-watchers-adminjob-watchers)
    - [4. Job Search (`/admin/jobs`)](#4-job-search-adminjobs)
      - [4a. Search form](#4a-search-form)
      - [4b. Results — 96 matches](#4b-results--96-matches)
      - [4c. Match detail — fit summary, pitch \& cover letter](#4c-match-detail--fit-summary-pitch--cover-letter)
    - [5. Chat Sessions (`/admin/chat`)](#5-chat-sessions-adminchat)
    - [6. Analytics (`/admin/analytics`)](#6-analytics-adminanalytics)
  - [Overview](#overview)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Environment Variables](#environment-variables)
    - [Database Setup](#database-setup)
    - [Running Locally](#running-locally)
  - [API Overview](#api-overview)
  - [Frontend Overview](#frontend-overview)
  - [Testing](#testing)
  - [Deployment](#deployment)
    - [Cloudflare Pages (Frontend)](#cloudflare-pages-frontend)
    - [API (Docker)](#api-docker)
  - [CI/CD](#cicd)
  - [Project Structure](#project-structure)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)
  - [License](#license)
  - [📁 Screenshot File Checklist](#-screenshot-file-checklist)

---

## Live Demo

| Environment | URL | Notes |
|-------------|-----|-------|
| 🌐 **Production** | [https://darun-dev.pages.dev](https://darun-dev.pages.dev) | Public portfolio site |
| 🛠️ **Admin dashboard** | [https://darun-dev.pages.dev/admin](https://darun-dev.pages.dev/admin) | Requires login — credentials below |
| ⚡ **API health** | [https://api.darun.dev/health](https://api.darun.dev/health) | Uptime check |
| 🚀 **Preview deployments** | Cloudflare Pages | Auto-generated per pull request |

**Demo admin login:**

```
Email:    demo@darun.dev
Password: demo-password-not-for-production
```

> ⚠️ The demo account is **read-only** and reset nightly. Do not enter real data.

### Run the demo locally in one command

```bash
git clone https://github.com/darunbjork/darun.dev.git
cd darun.dev
pnpm install
cp .env.example .env   # fill in the values listed below
docker compose up -d postgres redis
pnpm --filter @darun/api exec prisma migrate dev
pnpm --filter @darun/api seed:admin
pnpm dev
```

Then open:

- Web → [http://localhost:5173](http://localhost:5173)
- API → [http://localhost:3000/health](http://localhost:3000/health)

---

## Screenshots

### 1. Projects — Admin Dashboard (`/admin/projects`)

Manage published and draft projects, import from GitHub, and jump to Analytics, Chat, Feedback, Job watchers, and Jobs.

![Projects admin dashboard](docs/projects.png)

### 2. Feedback Moderation (`/admin/feedback`)

Approve or reject visitor feedback before it appears publicly. Filter by **pending**, **approved**, or **all**.

#### 2a. Pending queue

![Feedback pending](docs/feedback-pending.png)

#### 2b. Approved comments

![Feedback approved](docs/feedback-approved.png)

#### 2c. All feedback

![Feedback all](docs/feedback-all.png)

### 3. Job Watchers (`/admin/job-watchers`)

Register ATS boards (Greenhouse, Lever, Ashby) to pull jobs from during search. Enable, disable, or delete watchers.

![Job watchers](docs/job-watchers.png)

### 4. Job Search (`/admin/jobs`)

Aggregate job search across **Adzuna** and ATS providers, filter by keyword, location, and country, then score each result against your CV.

#### 4a. Search form

![Jobs search form](docs/jobs-search.png)

#### 4b. Results — 96 matches

![Jobs results](docs/jobs-results.png)

#### 4c. Match detail — fit summary, pitch & cover letter

Clicking **Pitch** opens the match detail. Each match shows a **fit summary**, **matched skills**, **growth areas**, and AI-generated **pitch text** and **cover letter** ready to send.

**Collapsed view:**

![Job match collapsed](docs/job-match.png)

**Expanded view — full pitch and cover letter:**

![Job match expanded](docs/job-match-expanded.png)

### 5. Chat Sessions (`/admin/chat`)

Review AI chat transcripts, filter by visitor type (Recruiter, Developer, Client, Other), and inspect message counts and sentiment.

![Chat sessions](docs/chat-sessions.png)

### 6. Analytics (`/admin/analytics`)

Visitors, views, feedback, chats, recruiter traffic, and sentiment distribution — plus top projects and sessions by user type.

![Analytics dashboard](docs/analytics.png)

---

## Overview

**darun.dev** is a production AI portfolio platform. It serves as both a personal portfolio site and a feature-rich admin dashboard, backed by a Fastify API with Prisma/PostgreSQL, Redis caching, Google Gemini AI, GitHub integration, and job aggregation from multiple ATS providers.

The repository is a **pnpm workspace monorepo** managed with **Turborepo**, containing three packages:

- **`@darun/api`** — Fastify backend with Prisma, Redis, AI chat, GitHub, jobs, media, analytics, and more.
- **`@darun/web`** — React 19 + Vite frontend with Tailwind CSS v4, Radix UI, TanStack Query, and GSAP.
- **`@darun/shared-types`** — Shared TypeScript types used across the monorepo.

---

## Features

- 🔐 **Authentication** — Argon2id password hashing, JWT sessions, password reset via email (Resend).
- 🛠️ **Admin Dashboard** — Manage projects, feedback, job watchers, and analytics.
- 🐙 **GitHub Integration** — Import repos, badges, and webhook handling with Redis caching.
- 💼 **Job Watching** — Aggregate jobs from Adzuna, Greenhouse, Lever, and Ashby; match against CV using AI scoring.
- 🤖 **AI Chat (RAG)** — Google Gemini-powered chat with retrieval-augmented generation over a pgvector store.
- 📊 **Analytics** — Visitor tracking, project views, feedback, and sentiment analysis.
- 🖼️ **Media Uploads** — Cloudinary integration for project images.
- ⚡ **Redis Caching** — Rate-limit protection and fast responses for external API calls.
- ☁️ **Cloudflare Pages** — Automatic preview and production deployments for the frontend.
- ✅ **CI Pipeline** — Lint → Type-check → Test → Build on every push.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm 9 + Turborepo 2 |
| Runtime | Node.js ≥ 22 |
| Backend | Fastify 5, TypeScript |
| Database | PostgreSQL + Prisma 7 (driver adapter) |
| Cache | Redis (ioredis) |
| AI | Google Gemini (`@google/genai`) |
| GitHub | Octokit (`@octokit/webhooks`) |
| Media | Cloudinary |
| Email | Resend |
| Frontend | React 19, Vite 8, TypeScript |
| Styling | Tailwind CSS v4, Radix UI, CVA |
| State / Data | TanStack Query, React Hook Form, Zod |
| Animation | GSAP (`@gsap/react`) |
| Charts | Recharts |
| Testing | Vitest, Supertest |
| CI | GitHub Actions |
| Hosting | Cloudflare Pages (web), Docker (api) |

---

## Architecture

```
.
├── .github/workflows/        # GitHub Actions CI
├── docs/                     # README screenshots
├── packages/
│   ├── api/                  # @darun/api — Fastify backend
│   │   ├── prisma/           # Prisma schema & migrations
│   │   ├── scripts/          # Seed & ingest scripts
│   │   └── src/
│   │       ├── middleware/   # Auth guards, error handling, correlation ID
│   │       ├── modules/      # Feature modules (auth, chat, github, jobs, …)
│   │       ├── plugins/      # Fastify plugins (prisma, redis, raw-body)
│   │       ├── utils/        # Cache, errors, hash, kill-switch, token-budget
│   │       └── app.ts        # Server entrypoint
│   ├── shared-types/         # @darun/shared-types — shared TS types
│   └── web/                  # @darun/web — React frontend
│       ├── public/           # Static assets (_redirects, robots.txt, CV PDFs)
│       └── src/
│           ├── components/   # UI components (chat, ui, panels, modals)
│           ├── hooks/        # Custom React hooks
│           ├── lib/          # API clients & utilities
│           └── pages/        # Route pages (admin, analytics, login, …)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 9
- **PostgreSQL** (with `pgvector` extension for RAG features)
- **Redis** (local or Docker)
- **Git**

### Installation

```bash
git clone https://github.com/darunbjork/darun.dev.git
cd darun.dev
pnpm install
```

### Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

The following variables are required (see `.env.example` for the full list):

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/darun` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for signing JWTs (≥ 32 chars) | `a-long-random-string` |
| `JWT_EXPIRES_IN` | JWT expiry | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `...` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `...` |
| `GEMINI_API_KEY` | Google Gemini API key | `...` |
| `RESEND_API_KEY` | Resend API key | `...` |
| `RESEND_FROM` | Sender email address | `noreply@yourdomain.com` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `ADMIN_EMAIL` | Seed admin email | `admin@example.com` |
| `ADMIN_PASSWORD` | Seed admin password | `...` |
| `ADZUNA_APP_ID` | Adzuna API app ID | `...` |
| `ADZUNA_APP_KEY` | Adzuna API key | `...` |

> Never commit real secrets. `.env` is git-ignored.

### Database Setup

Start PostgreSQL and enable the `pgvector` extension (required for RAG embeddings):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run Prisma migrations:

```bash
pnpm --filter @darun/api exec prisma migrate dev
```

Seed the admin user and CV data:

```bash
pnpm --filter @darun/api seed:admin
pnpm --filter @darun/api seed:cv
```

### Running Locally

Start Redis (if not already running):

```bash
docker run -p 6379:6379 redis:7
```

Run the full development environment (API + Web in parallel via Turborepo):

```bash
pnpm dev
```

Or run packages individually:

```bash
# API (tsx watch)
pnpm --filter @darun/api dev

# Web (Vite)
pnpm --filter @darun/web dev
```

The API will be available at `http://localhost:3000`, and the web app at `http://localhost:5173` (Vite default).

---

## API Overview

The API is built with **Fastify 5** and organised into feature modules under `packages/api/src/modules/`:

| Module | Description |
|--------|-------------|
| `auth` | Login, JWT sessions, password reset |
| `analytics` | Visitor tracking, project views, stats |
| `chat` | AI chat with Gemini (RAG), cost limits, sentiment |
| `feedback` | Project feedback (public + admin moderation) |
| `github` | GitHub API client, webhooks, repo import |
| `health` | Health check endpoint |
| `jobs` | Job aggregation (Adzuna, Greenhouse, Lever, Ashby), watchers, matching |
| `media` | Cloudinary image uploads |
| `pitch` | AI-generated pitch content |
| `projects` | Project CRUD (public + admin) |
| `rag` | RAG ingest pipeline: chunk, embed, retrieve |

**Key API plugins:**

- `prisma.plugin.ts` — Prisma client with PostgreSQL driver adapter.
- `redis.plugin.ts` — Redis connection via ioredis.
- `raw-body.ts` — Raw body parsing (required for GitHub webhook signature verification).

**Middleware:**

- `auth.guard.ts` — JWT authentication guard.
- `admin-guards.ts` — Admin role guard.
- `error.handler.ts` — Global error handler.
- `correlation-id.ts` — Request correlation ID for tracing.

**Utilities:**

- `cache.ts` — Redis caching helpers.
- `errors.ts` — Typed error classes.
- `kill-switch.ts` — Feature kill switches.
- `token-budget.ts` — AI token budget management.
- `magic-bytes.ts` — File type validation by magic bytes.

---

## Frontend Overview

The web app is a **React 19 + Vite 8** SPA with the following key areas:

- **Public pages** — Hero, project grid, stats, testimonials, CV download, feedback modal.
- **Admin pages** — Project CRUD, feedback moderation, job watchers, analytics dashboard, chat dashboard.
- **Chat** — Floating chat button, panel, message components, and provider.
- **UI components** — Built with Radix UI primitives and Tailwind CSS v4 (badge, button, confirm dialog, glass card, etc.).

**Key libraries:**

- **TanStack Query** for server state management.
- **React Hook Form + Zod** for form validation.
- **GSAP** for animations.
- **Recharts** for analytics charts.
- **Sonner** for toast notifications.

**API clients** live in `packages/web/src/lib/` (e.g., `auth-api.ts`, `github-api.ts`, `jobs-api.ts`, `feedback-api.ts`).

---

## Testing

The API uses **Vitest** with **Supertest** for integration tests.

```bash
# Run all tests across the monorepo
pnpm test

# API tests only
pnpm --filter @darun/api test

# Watch mode
pnpm --filter @darun/api test:watch

# With coverage
pnpm --filter @darun/api exec vitest run --coverage
```

Test files are co-located with modules (e.g., `auth.guard.test.ts`, `chat.test.ts`) and in `src/__tests__/` for health checks and shared helpers.

---

## Deployment

### Cloudflare Pages (Frontend)

1. Connect the repository to Cloudflare Pages.
2. Set the **build command** to:
   ```bash
   pnpm build --filter @darun/web
   ```
3. Set the **output directory** to `packages/web/dist`.
4. Add the required environment variables in the Cloudflare dashboard:
   - `VITE_API_URL` — the deployed API base URL.
5. Every push to `main` triggers a production deployment; PRs get preview deployments.

**Troubleshooting stuck deployments:**

- Check the Git integration webhook in Cloudflare.
- Manually trigger a deployment from the Cloudflare dashboard.
- Disconnect and reconnect the Git integration to fix the webhook permanently.
- Verify the deployed commit SHA matches `main`.

### API (Docker)

The API includes a `Dockerfile` in `packages/api/`. Build and run:

```bash
docker build -t darun-api -f packages/api/Dockerfile .
docker run -p 3000:3000 --env-file .env darun-api
```

Ensure the following environment variables are set at runtime:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `CLOUDINARY_*`
- `RESEND_*`
- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY`
- `FRONTEND_URL`

Run migrations on deploy:

```bash
pnpm --filter @darun/api exec prisma migrate deploy
```

---

## CI/CD

GitHub Actions runs on every push and pull request. The workflow is defined in `.github/workflows/ci.yml`.

**Pipeline stages:**

1. **Lint** — ESLint across all packages.
2. **Type-check** — `tsc --noEmit`.
3. **Test** — Vitest.
4. **Build** — Turborepo build (API TypeScript compile, Web Vite build).

The CI workflow also creates a `.env` file from secrets, including `ADMIN_EMAIL` and `ADMIN_PASSWORD` for seeding.

---

## Project Structure

See the [Architecture](#architecture) section above for a high-level tree. For a full listing, refer to the repository’s `packages/` directory.

**Key entry points:**

- API server: `packages/api/src/app.ts`
- Web app: `packages/web/src/main.tsx`
- Prisma schema: `packages/api/prisma/schema.prisma`
- Shared types: `packages/shared-types/src/index.ts`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cloudflare Pages stuck on old commit | Manually deploy from dashboard; check/reconnect Git webhook |
| `/login` returns 200 but page is blank | SPA fallback returns 200 for any path — test the actual route in incognito |
| Redis connection refused | Ensure Redis is running and `REDIS_URL` is correct |
| Prisma migration fails on `vector` type | Enable the `pgvector` extension: `CREATE EXTENSION IF NOT EXISTS vector;` |
| GitHub API rate limit exceeded | Verify `GITHUB_TOKEN` and Redis caching is active |
| Adzuna returns 0 results for Sweden | Adzuna does not cover Sweden — use JobTech Dev for Swedish listings |
| CI fails on type-check | Run `pnpm type-check` locally and fix errors before pushing |
| Gemini API quota errors | Check `GEMINI_API_KEY` and token budget / kill-switch settings |

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Commit your changes: `git commit -m "feat: add your feature"`.
4. Push to the branch: `git push origin feat/your-feature`.
5. Open a pull request.

Please ensure the following pass before submitting:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

---

## License

[MIT](LICENSE) © darunbjork

---

## 📁 Screenshot File Checklist

Save the screenshots into the `docs/` folder at the repo root with these exact filenames so all image links resolve:

| Filename | Screenshot |
|----------|------------|
| `docs/projects.png` | Projects admin page |
| `docs/feedback-pending.png` | Feedback — pending |
| `docs/feedback-approved.png` | Feedback — approved |
| `docs/feedback-all.png` | Feedback — all |
| `docs/job-watchers.png` | Job watchers |
| `docs/jobs-search.png` | Jobs search form (empty) |
| `docs/jobs-results.png` | Jobs results (96 found) |
| `docs/job-match.png` | Job detail modal — collapsed |
| `docs/job-match-expanded.png` | Job detail modal — expanded (pitch & cover letter) |
| `docs/chat-sessions.png` | Chat sessions |
| `docs/analytics.png` | Analytics dashboard |

