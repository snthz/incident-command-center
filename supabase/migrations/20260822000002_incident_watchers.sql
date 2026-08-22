create table public.incident_watchers (
  incident_id uuid not null references public.incidents(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (incident_id, profile_id)
);

create index incident_watchers_profile_idx
  on public.incident_watchers (profile_id);

alter table public.incident_watchers enable row level security;

create policy "Authenticated users can read watchers"
  on public.incident_watchers for select
  to authenticated
  using (true);

insert into public.incident_watchers (incident_id, profile_id)
select distinct u.incident_id, u.author_id
from public.incident_updates u
where u.author_id is not null
on conflict do nothing;

insert into public.incident_watchers (incident_id, profile_id)
select i.id, i.owner_id
from public.incidents i
where i.owner_id is not null
on conflict do nothing;
