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

## 2. Schema + seed

From your machine, against the VPS database (temporarily expose 5432 or use an
SSH tunnel `ssh -L 5432:localhost:5432 root@vps`):

```bash
supabase db push --db-url "postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"
psql "postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres" -f supabase/seed.sql
```

`db push` applies everything in `supabase/migrations/` (tables, RLS, triggers,
realtime publication). The seed is optional in production — it creates the five
demo users (password `password123`) and 12 sample incidents.

## 3. App service

1. Dokploy → **Create Service → Application**, source = this Git repository,
   build type = **Dockerfile**.
2. **Build args** (baked into the client bundle at build time — rebuild if they change):

   | Arg | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://supabase.yourdomain.com` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon/publishable key |

3. **Environment** (runtime):

   | Var | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql://postgres:<POSTGRES_PASSWORD>@supabase-db:5432/postgres` |

   Use the internal Docker host for Postgres. If the app and Supabase live in
   different Dokploy projects, attach both to a shared Docker network first
   (Dokploy → Advanced → Network), or fall back to the VPS IP with 5432
   firewalled to localhost.

4. Assign the app domain (e.g. `icc.yourdomain.com`) with HTTPS and deploy.

## 4. Post-deploy checklist

- `https://icc.yourdomain.com` redirects to `/login`; sign in with a seed user.
- Two browsers: posting an update in one appears in the other (verifies realtime
  over WSS through Kong).
- Drag a card between columns; reload — the change persisted (verifies
  `DATABASE_URL`).
- `NEXT_PUBLIC_SUPABASE_URL` must be the public HTTPS URL, never an internal
  host: the browser uses it for auth cookies and the realtime socket.

## Local image smoke test

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321 \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<local publishable key> \
  -t icc-app .

docker run --rm -p 3002:3000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres \
  icc-app
```

Server-side rendering, sign-in and data all work against the local Supabase
stack. Browser-side realtime won't connect in this setup (the host browser can't
resolve `host.docker.internal`) — that path only works with a public URL.
