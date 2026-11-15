-- Eetclub De Flipper: leden met eigen pincode, zodat ieder lid alleen
-- zijn eigen stemmen kan invoeren, aanpassen en verwijderen.

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  name_key text generated always as (lower(trim(name))) stored unique,
  -- scrypt-hash van de pincode ("salt:hash"); leeg = lid heeft nog geen pincode gekozen.
  pin_hash text,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.member_sessions (
  -- sha256 van de sessietoken in de cookie; de token zelf wordt niet opgeslagen.
  token_hash text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;
alter table public.member_sessions enable row level security;

-- Bestaande leden: iedereen die al gestemd heeft, plus Jelmer uit de Excel.
insert into public.members (name)
select distinct on (lid_key) trim(lid) from public.votes order by lid_key, created_at
on conflict (name_key) do nothing;
insert into public.members (name) values ('Jelmer') on conflict (name_key) do nothing;

-- Stemmen koppelen aan een lid.
alter table public.votes add column if not exists member_id uuid references public.members(id) on delete cascade;
update public.votes v set member_id = m.id from public.members m where m.name_key = v.lid_key and v.member_id is null;
alter table public.votes alter column member_id set not null;
create index if not exists votes_member_id_idx on public.votes (member_id);
