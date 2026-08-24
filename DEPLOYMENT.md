# Deployment — Dokploy (Hostinger VPS)

The app ships as a single Docker image (Next.js standalone). Supabase runs on the
same VPS as a separate Dokploy service. Two services total:

```
┌─ Dokploy ──────────────────────────────────────────────┐
│  supabase (template)        icc-app (this repo)        │
│  kong :8000 ──► https://supabase.yourdomain.com        │
│  postgres :5432 ◄────────── DATABASE_URL (internal)    │
└────────────────────────────────────────────────────────┘
```

## 1. Supabase service

1. Dokploy → **Create Service → Template → Supabase**.
2. Assign a domain to the **Kong/API** service (e.g. `supabase.yourdomain.com`)
   with HTTPS. The browser talks to this URL directly (auth + realtime WSS), so
   it must be public.
3. Note from the template's environment:
   - `ANON_KEY` (or publishable key)
   - `POSTGRES_PASSWORD`
   - the internal Postgres host (the compose service name, usually `supabase-db`).

## 2. Schema + seed — automatic

The container applies `supabase/migrations/*.sql` on startup
(`scripts/migrate.mjs`, tracked in `public._app_migrations`, guarded by an
advisory lock so concurrent replicas don't race). If the database already has
the schema but no tracking table, existing migrations are baselined without
re-running.

When the incidents table is empty it also runs `supabase/seed.sql` (five demo
users with password `password123`, 12 sample incidents). Set `SEED_ON_EMPTY=0`
to disable seeding.

Locally the Supabase CLI stays the source of truth (`bun run db:reset`); the
runtime migrator is only for deployed environments.

## GitHub environment

The `deploy` job declares `environment: production`, so every run records a
deployment and GitHub shows the Deployments/Environments panel on the repo page
with its history. To make the entry link to the live site, add a repository
**variable** (not a secret — it is a public URL) under
*Settings → Secrets and variables → Actions → Variables*:

| Variable | Value |
|---|---|
| `APP_URL` | `https://icc.yourdomain.com` |

Without it the environment still appears, just without the clickable link.

## 3. App service

1. Dokploy → **Create Service → Application**, source = **Docker** image
   `ghcr.io/<owner>/incident-command-center:latest` (built by the GitHub
   Actions workflow), or the Git repository with build type **Dockerfile**.
2. **Environment** (all runtime — no build args, changing them only needs a
   restart; the server passes the public pair to the browser via
   `window.__ENV`):

   | Var | Value |
   |---|---|
   | `SUPABASE_URL` | `https://supabase.yourdomain.com` (public Kong URL) |
   | `SUPABASE_ANON_KEY` | the anon/publishable key |
   | `DATABASE_URL` | `postgresql://postgres:<POSTGRES_PASSWORD>@supabase-db:5432/postgres` |

   Use an internal Docker host for Postgres. The Supabase template keeps its
   database on the compose-private network; bridge it once with
   `docker network connect --alias supabase-db dokploy-network <db-container>`
   (re-run if the Supabase compose is ever redeployed), or add
   `dokploy-network` to the `db` service in the compose file.

3. Assign the app domain (e.g. `icc.yourdomain.com`) with HTTPS (container
   port 3000) and deploy.

## 4. Post-deploy checklist

- `https://icc.yourdomain.com` redirects to `/login`; sign in with a seed user.
- Two browsers: posting an update in one appears in the other (verifies realtime
  over WSS through Kong).
- Drag a card between columns; reload — the change persisted (verifies
  `DATABASE_URL`).
- `SUPABASE_URL` must be the public HTTPS URL, never an internal host: the
  browser uses it for auth cookies and the realtime socket.

## Local image smoke test

```bash
docker build -t icc-app .

docker run --rm -p 3002:3000 \
  -e SUPABASE_URL=http://host.docker.internal:54321 \
  -e SUPABASE_ANON_KEY=<local publishable key> \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres \
  icc-app
```

Server-side rendering, sign-in and data all work against the local Supabase
stack. Browser-side realtime won't connect in this setup (the host browser can't
resolve `host.docker.internal`) — that path only works with a public URL.
