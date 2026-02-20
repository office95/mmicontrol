-- Firmen-Angebote (Benefits) für Dozenten & Kursteilnehmer
-- Voraussetzung: Postgres-Erweiterung pgcrypto/gen_random_uuid()

-- Tabellen
create table if not exists public.benefit_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  logo_path text,
  contact_name text,
  phone text,
  email text,
  website text,
  street text,
  postal_code text,
  city text,
  state text,
  country text check (country in ('AT','DE')),
  action_title text,
  description text,
  discount_type text check (discount_type in ('percent','fixed','perk')),
  discount_value numeric(10,2),
  code text,
  members_card_required boolean default true,
  target text check (target in ('teachers','students','both')) default 'both',
  valid_from date,
  valid_to date,
  max_redemptions_per_user int,
  visibility text check (visibility in ('public','teachers','students','both')) default 'both',
  status text check (status in ('active','inactive','archived')) default 'active',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.benefit_redemptions (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references public.benefit_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text check (role in ('teacher','student')),
  members_card_id text,
  redeemed_at timestamptz default now(),
  channel text,
  note text
);

create index if not exists benefit_redemptions_benefit_idx on public.benefit_redemptions(benefit_id);
create index if not exists benefit_redemptions_user_idx on public.benefit_redemptions(user_id);

-- RLS
alter table if exists public.benefit_companies enable row level security;
alter table if exists public.benefit_redemptions enable row level security;

-- Helper: Rolle und Partner stehen bereits in profiles; hier brauchen wir nur Rolle

-- Policies benefit_companies
drop policy if exists benefit_companies_admin_all on public.benefit_companies;
create policy benefit_companies_admin_all on public.benefit_companies
  for all using (auth.uid() in (select id from public.v_admin));

drop policy if exists benefit_companies_select_active on public.benefit_companies;
create policy benefit_companies_select_active on public.benefit_companies
  for select using (
    status = 'active'
    and (valid_from is null or valid_from <= now()::date)
    and (valid_to   is null or valid_to   >= now()::date)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          (p.role = 'teacher' and (target in ('teachers','both') or target is null))
          or (p.role = 'student' and (target in ('students','both') or target is null))
          or p.role = 'admin'
        )
    )
  );

-- Policies benefit_redemptions
drop policy if exists benefit_redemptions_admin_all on public.benefit_redemptions;
create policy benefit_redemptions_admin_all on public.benefit_redemptions
  for all using (auth.uid() in (select id from public.v_admin));

drop policy if exists benefit_redemptions_own_select on public.benefit_redemptions;
create policy benefit_redemptions_own_select on public.benefit_redemptions
  for select using (user_id = auth.uid());

drop policy if exists benefit_redemptions_insert_self on public.benefit_redemptions;
create policy benefit_redemptions_insert_self on public.benefit_redemptions
  for insert with check (user_id = auth.uid());

-- Hinweis: Logos/Bilder bitte in eigenem Storage-Bucket z.B. \"benefit-logos\" verwalten
-- und Zugriffs-Policies dort entsprechend setzen (ähnlich materials).
