-- Kosten-Tracking Tabellen

-- Kategorien
create table if not exists public.cost_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Kosten
create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  cost_date date not null,
  amount_gross numeric not null,
  vat_rate numeric default 0,
  amount_net numeric not null,
  vat_amount numeric not null,
  vendor text,
  description text,
  attachment_url text,
  category_id uuid references public.cost_categories(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS aktivieren
alter table if exists public.cost_categories enable row level security;
alter table if exists public.costs enable row level security;

-- Policies: nur Admin
drop policy if exists cost_categories_admin_all on public.cost_categories;
create policy cost_categories_admin_all on public.cost_categories
  for all using (auth.uid() in (select id from public.v_admin));

drop policy if exists costs_admin_all on public.costs;
create policy costs_admin_all on public.costs
  for all using (auth.uid() in (select id from public.v_admin));

-- Trigger für updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_costs_updated_at on public.costs;
create trigger trg_costs_updated_at
before update on public.costs
for each row execute function public.set_updated_at();

-- Hinweis: Für Beleg-Uploads optional privaten Storage-Bucket 'costs' anlegen:
-- select storage.create_bucket('costs', public:=false);
