create sequence public.incident_key_seq;

alter table public.incidents add column key text;

with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.incidents
)
update public.incidents i
set key = 'ICC-' || n.rn
from numbered n
where i.id = n.id;

select setval(
  'public.incident_key_seq',
  coalesce((select count(*) from public.incidents), 0) + 1,
  false
);

alter table public.incidents
  alter column key set not null,
  alter column key set default 'ICC-' || nextval('public.incident_key_seq');

alter table public.incidents add constraint incidents_key_unique unique (key);

alter sequence public.incident_key_seq owned by public.incidents.key;
