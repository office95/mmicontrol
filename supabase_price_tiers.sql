-- Price tiers for courses (e.g., PKL1, PKL2)
create table if not exists public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  description text,
  position int default 1,
  created_at timestamptz default now()
);

-- Prices per course and tier
create table if not exists public.course_price_tiers (
  course_id uuid references public.courses(id) on delete cascade,
  price_tier_id uuid references public.price_tiers(id) on delete cascade,
  price_gross numeric,
  vat_rate numeric,
  price_net numeric,
  deposit numeric,
  saldo numeric,
  duration_hours numeric,
  created_at timestamptz default now(),
  primary key (course_id, price_tier_id)
);

create index if not exists idx_course_price_tiers_course on public.course_price_tiers(course_id);
create index if not exists idx_course_price_tiers_tier on public.course_price_tiers(price_tier_id);

-- Row Level Security
alter table if exists public.price_tiers enable row level security;
alter table if exists public.course_price_tiers enable row level security;

drop policy if exists price_tiers_admin_all on public.price_tiers;
create policy price_tiers_admin_all on public.price_tiers
  for all using (auth.uid() in (select id from public.profiles where role='admin'));

drop policy if exists course_price_tiers_admin_all on public.course_price_tiers;
create policy course_price_tiers_admin_all on public.course_price_tiers
  for all using (auth.uid() in (select id from public.profiles where role='admin'));
