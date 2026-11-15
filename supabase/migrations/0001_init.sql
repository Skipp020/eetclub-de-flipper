-- Eetclub De Flipper: één rij per stem (lid x restaurant).

create extension if not exists pgcrypto;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  restaurant text not null check (length(trim(restaurant)) > 0),
  datum date not null,
  lid text not null check (length(trim(lid)) > 0),
  eten numeric(3,1) not null check (eten between 1 and 10),
  service numeric(3,1) not null check (service between 1 and 10),
  sfeer numeric(3,1) not null check (sfeer between 1 and 10),
  prijs numeric(3,1) not null check (prijs between 1 and 10),
  hygiene numeric(3,1) not null check (hygiene between 1 and 10),
  beste_gerecht text,
  wat_kon_beter text,
  eindreactie text,
  restaurant_key text generated always as (lower(trim(restaurant))) stored,
  lid_key text generated always as (lower(trim(lid))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ieder lid heeft één stem per restaurant.
  constraint votes_one_per_member unique (restaurant_key, lid_key)
);

-- Alleen de server (service role) leest en schrijft. RLS aan zonder
-- policies betekent: de publieke anon key kan niets.
alter table public.votes enable row level security;

-- Bestaande stemmen uit de Excel (Weinlokal Stern, 28-09-2026).
-- Jelmer had geen cijfers ingevuld en is daarom niet overgenomen.
insert into public.votes
  (restaurant, datum, lid, eten, service, sfeer, prijs, hygiene, beste_gerecht, wat_kon_beter, eindreactie)
values
  ('Weinlokal Stern', '2026-09-28', 'Aron', 7.8, 8, 7, 8, 9, 'Schweinehaxe', 'Iets snellere service', 'Zeer goede avond'),
  ('Weinlokal Stern', '2026-09-28', 'Joost', 8.5, 7.5, 7, 9, 7.5, 'Schnitzel', 'Tafels minder dicht op elkaar, service kon iets sneller. Die dikke man hielp wel goed', 'Heerlijk eten, niet allerdaags. Top avond'),
  ('Weinlokal Stern', '2026-09-28', 'Kees', 7.5, 7, 7.5, 8, 8, 'Zwijnsknie', 'kortdekken op de tafels, drank duurde lang', '3,75 Flippets'),
  ('Weinlokal Stern', '2026-09-28', 'Boris', 7.5, 8, 7.5, 8, 8, 'Schweinehaxe', 'Schnapps (heeft me de rest v/d avond achtervolgd)', 'flippieflappie, lekker happie')
on conflict (restaurant_key, lid_key) do nothing;
