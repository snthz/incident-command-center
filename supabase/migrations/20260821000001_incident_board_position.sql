-- Manual board ordering: incidents carry an explicit position within their column.
-- Fractional (double precision) so a reorder only rewrites the moved row.
alter table public.incidents
  add column position double precision not null default 0;

with numbered as (
  select
    id,
    row_number() over (
      partition by status
      order by coalesce(resolved_at, updated_at) desc
    ) as rn
  from public.incidents
)
update public.incidents i
set position = n.rn
from numbered n
where i.id = n.id;

create index incidents_status_position_idx
  on public.incidents (status, position);

-- Reordering must not look like activity: only bump updated_at when a
-- meaningful field changes, so dragging a card keeps its "updated" timestamp.
create or replace function public.handle_incident_touch()
returns trigger
language plpgsql
as $$
begin
  if (new.title, new.description, new.severity, new.status, new.owner_id, new.key)
     is distinct from
     (old.title, old.description, old.severity, old.status, old.owner_id, old.key)
  then
    new.updated_at = now();
  end if;

  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at = now();
  elsif new.status <> 'resolved' then
    new.resolved_at = null;
  end if;

  return new;
end;
$$;
