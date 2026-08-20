-- Enums
create type public.incident_severity as enum ('critical', 'high', 'medium', 'low');
create type public.incident_status as enum ('investigating', 'identified', 'monitoring', 'resolved');

-- Profiles (mirror of auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity public.incident_severity not null,
  status public.incident_status not null default 'investigating',
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create index incident_updates_incident_id_created_at_idx
  on public.incident_updates (incident_id, created_at);
create index incidents_status_idx on public.incidents (status);
create index incidents_severity_idx on public.incidents (severity);

-- Auto-create a profile when an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh and manage resolved_at on status transitions
create or replace function public.handle_incident_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at = now();
  elsif new.status <> 'resolved' then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

create trigger on_incident_updated
  before update on public.incidents
  for each row execute function public.handle_incident_touch();

-- Posting an update touches the parent incident
create or replace function public.handle_update_posted()
returns trigger
language plpgsql
as $$
begin
  update public.incidents set updated_at = now() where id = new.incident_id;
  return new;
end;
$$;

create trigger on_update_posted
  after insert on public.incident_updates
  for each row execute function public.handle_update_posted();

-- RLS: reads for any authenticated user; client-side writes limited to own updates.
-- Server mutations go through Prisma (privileged role) after session checks.
alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_updates enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "incidents are readable by authenticated users"
  on public.incidents for select to authenticated using (true);

create policy "updates are readable by authenticated users"
  on public.incident_updates for select to authenticated using (true);

create policy "users can post updates as themselves"
  on public.incident_updates for insert to authenticated
  with check (author_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.incident_updates;
