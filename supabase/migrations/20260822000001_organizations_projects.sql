create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  key_prefix text not null,
  color text not null default '#898989',
  next_number int not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (organization_id, key_prefix)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;

create policy "Members can read their organizations"
  on public.organizations for select to authenticated
  using (id in (
    select organization_id from public.organization_members
    where profile_id = (select auth.uid())
  ));

create policy "Members can read memberships of their organizations"
  on public.organization_members for select to authenticated
  using (organization_id in (
    select organization_id from public.organization_members
    where profile_id = (select auth.uid())
  ));

create policy "Members can read projects of their organizations"
  on public.projects for select to authenticated
  using (organization_id in (
    select organization_id from public.organization_members
    where profile_id = (select auth.uid())
  ));

alter table public.incidents
  add column project_id uuid references public.projects(id) on delete cascade,
  add column number int;

alter table public.incidents alter column key drop default;
drop sequence if exists public.incident_key_seq;

create or replace function public.handle_incident_key()
returns trigger
language plpgsql
security definer
as $$
declare
  assigned int;
  prefix text;
begin
  if new.key is not null and new.number is not null then
    return new;
  end if;
  update public.projects
  set next_number = next_number + 1
  where id = new.project_id
  returning next_number, key_prefix into assigned, prefix;
  new.number := assigned;
  new.key := prefix || '-' || assigned;
  return new;
end;
$$;

create trigger on_incident_key
  before insert on public.incidents
  for each row execute function public.handle_incident_key();

do $$
declare
  org_id uuid;
  core_id uuid;
begin
  insert into public.organizations (name, slug)
  values ('Incident Command', 'icc')
  returning id into org_id;

  insert into public.organization_members (organization_id, profile_id, role)
  select org_id, id, case when email = 'axl.santos@icc.dev' then 'admin' else 'member' end
  from public.profiles;

  insert into public.projects (organization_id, name, slug, key_prefix, color)
  values
    (org_id, 'Core Platform', 'core-platform', 'CORE', '#ff6b35'),
    (org_id, 'Payments', 'payments', 'PAY', '#38bdf8'),
    (org_id, 'Web App', 'web-app', 'WEB', '#a78bfa');

  select id into core_id from public.projects
  where organization_id = org_id and key_prefix = 'CORE';

  update public.incidents set project_id = core_id where project_id is null;

  with renumbered as (
    select
      i.id,
      row_number() over (partition by i.project_id order by i.created_at) as rn,
      p.key_prefix
    from public.incidents i
    join public.projects p on p.id = i.project_id
  )
  update public.incidents i
  set number = r.rn, key = r.key_prefix || '-' || r.rn
  from renumbered r
  where i.id = r.id;

  update public.projects p
  set next_number = coalesce(
    (select max(i.number) from public.incidents i where i.project_id = p.id),
    0
  );

  update public.notifications n
  set incident_key = i.key
  from public.incidents i
  where n.incident_id = i.id;
end;
$$;

alter table public.incidents
  alter column project_id set not null,
  alter column number set not null;

alter table public.incidents
  add constraint incidents_project_number_unique unique (project_id, number);

create index incidents_project_idx on public.incidents (project_id);
