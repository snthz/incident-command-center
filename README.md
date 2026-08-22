# Incident Command Center

A real-time incident command center for operations teams: sign in, watch active incidents across projects, drill into an incident's activity, post updates, and see everything change live — no refresh needed.

Built for a senior frontend technical assessment. The architecture decisions behind it (rendering strategy, streaming, realtime, caching, hydration) are documented in [ARCHITECTURE.md](ARCHITECTURE.md); production deployment lives in [DEPLOYMENT.md](DEPLOYMENT.md).

## Features

- **Auth** — email/password via Supabase, SSR session cookies, optimistic redirect gate in `proxy.ts` plus real per-request verification in the data-access layer. No flash of protected content.
- **Dashboard** — board (drag-and-drop by status) and table views, URL-driven filters (status, severity, debounced search), severity stats streamed independently, recently-resolved window.
- **Organizations & projects** — Jira/Linear-style shell: sidebar with projects, per-project boards, team page, per-project incident keys (`CORE-7`, `PAY-1`) generated atomically by a Postgres trigger.
- **Incident detail** — server-rendered metadata, streamed activity feed, inline title/description editing (optimistic with automatic revert), assignee picker with people search, editable due date with a custom calendar, watchers, Comments/History tabs with a full audit log.
- **Real-time** — live feed updates, status/assignee changes, typing indicators, and per-user notifications (bell + badge) over Supabase Realtime with RLS-scoped subscriptions. Toasts confirm only your own actions; other people's activity arrives silently as badges and live regions.
- **Accessibility** — full keyboard support (APG patterns for menus, comboboxes, dialogs), visible focus, `aria-live` announcements, semantic landmarks, color-independent status badges.
- **Performance instrumentation** — Core Web Vitals (LCP, CLS, INP, FCP, TTFB) reported through Next's native `useReportWebVitals` hook as structured `console.debug` entries; the reporter callback is the single point where a RUM backend (Datadog, Sentry) would plug in.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3 (App Router, RSC, Server Actions) |
| UI | React 19, Tailwind CSS 4, custom component kit (no UI library) |
| Backend-as-a-service | Supabase — Auth, Postgres, Realtime, RLS |
| Data access | Prisma 7 (`@prisma/adapter-pg`) for server reads/writes |
| Validation | Zod 4 (shared schemas: client pre-validation + server actions) |
| Tests | Vitest + Testing Library |
| Runtime / PM | Bun |

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.x
- [Docker](https://www.docker.com/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/local-development)

### Setup

```bash
bun install

# 1. Start local Supabase (Postgres, Auth, Realtime on Docker)
bun run db:start

# 2. Environment
cp .env.example .env
# paste the anon/publishable key printed by `supabase status` into SUPABASE_ANON_KEY

# 3. Apply migrations + seed demo data
bun run db:reset

# 4. Run
bun dev
```

Open http://localhost:3000 and sign in with any demo user.

### Demo users

All seeded with password `password123`:

| Email | Role |
|---|---|
| `axl.santos@icc.dev` | Admin |
| `mario.pon@icc.dev` | Member |
| `christian.rivera@icc.dev` | Member |
| `eduard.chinchilla@icc.dev` | Member |
| `gadi.orellana@icc.dev` | Member |

Tip: open two browsers with different users to see realtime notifications, live feed updates, and typing indicators working across sessions.

### Environment variables

| Variable | Where it runs | Description |
|---|---|---|
| `SUPABASE_URL` | Server (forwarded to the browser via `window.__ENV`) | Supabase API URL. Local: `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | Server (forwarded to the browser via `window.__ENV`) | Anon/publishable key — safe to expose; RLS enforces access |
| `DATABASE_URL` | Server only | Direct Postgres connection for Prisma and the startup migrator |

No service-role or secret keys are used anywhere in the app. See [.env.example](.env.example).

### Scripts

| Script | What it does |
|---|---|
| `bun dev` | Dev server |
| `bun run build` / `bun start` | Production build / serve |
| `bun run test` | Vitest suite (unit + component) |
| `bun run test:watch` | Vitest in watch mode |
| `bun run lint` | ESLint |
| `bun run db:start` | Start local Supabase |
| `bun run db:reset` | Recreate schema from `supabase/migrations` + seed |

## Tests

```bash
bun run test
```

Two Vitest projects:

- **`tests/unit`** (Node) — auth gate redirects in `proxy.ts` (redirect targets, `redirectTo` preservation, public routes), Zod schemas (filter parsing that drops invalid URL params, incident creation, the noon-UTC due-date normalization), and timezone-stable date formatting.
- **`tests/ui`** (jsdom) — inline editing (client-side validation, optimistic value while saving, automatic revert on server rejection), the filters bar (collapsed search, debounced URL replace, custom selects, clear-all), and route-level error/loading/not-found states.

## Project structure

```
app/                  Routes: (app) authenticated group, login, about-severities
  (app)/dashboard     All-projects board/table
  (app)/projects      Per-project boards
  (app)/incidents     Incident detail (streamed feed, tabs)
  (app)/team          Organization members
components/ui/        Custom kit: Select, DatePicker, Sheet-style dialogs, Toaster…
features/             Feature modules: auth, incidents, notifications, navigation
  */schema.ts         Zod schemas shared by forms and server actions
  */actions.ts        Server actions (mutations)
  */queries.ts        Server-only data access (Prisma)
lib/                  DAL (auth), Prisma client, Supabase clients, dates
prisma/               Prisma schema (client generated to lib/generated)
supabase/             Migrations, seed, local config
tests/                Vitest suites (unit + ui)
proxy.ts              Optimistic auth gate (Next.js proxy)
```

## Deployment

Ships as a single Docker image (Next.js standalone) with migrations applied automatically on boot; Supabase runs self-hosted alongside it. GitHub Actions builds and pushes the image, Dokploy deploys it. Full guide: [DEPLOYMENT.md](DEPLOYMENT.md).
