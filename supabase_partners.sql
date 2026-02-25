-- Tabelle partners (nur anlegen, falls noch nicht vorhanden)
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  status text check (status in ('active','inactive','lead')) default 'active',
  provider_id text,
  name text not null,
  street text,
  zip text,
  city text,
  country text,
  state text,
  phone text,
  email text,
  bank_name text,
  iban text,
  bic text,
  contact_person text,
  vat_number text,
  tax_number text,
  registry_number text,
  contract boolean default false,
  contract_date date,
  provision1 numeric,
  provision2 numeric,
  provision3 numeric,
  provision4 numeric,
  provision5 numeric,
  provision6plus numeric,
  rating_course int default 0,
  rating_teacher int default 0,
  rating_reliability int default 0,
  rating_engagement int default 0,
  logo_path text,
  hero1_path text,
  hero2_path text,
  gallery_paths text[],
  teacher_name text,
  teacher_image_path text,
  teacher_description text,
  website_slogan text,
  website_description text,
  website_tags text[],
  created_at timestamptz default now()
);

alter table public.partners enable row level security;
drop policy if exists "partners admin all" on public.partners;
create policy "partners admin all" on public.partners
  for all using (auth.uid() in (select id from public.profiles where role='admin'));

-- Medien-Felder nachträglich ergänzen (idempotent)
alter table public.partners add column if not exists logo_path text;
alter table public.partners add column if not exists hero1_path text;
alter table public.partners add column if not exists hero2_path text;
alter table public.partners add column if not exists gallery_paths text[];
alter table public.partners add column if not exists teacher_name text;
alter table public.partners add column if not exists teacher_image_path text;
alter table public.partners add column if not exists teacher_description text;
alter table public.partners add column if not exists website_slogan text;
alter table public.partners add column if not exists website_description text;
alter table public.partners add column if not exists website_tags text[];
