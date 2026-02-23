-- Table for Kurstermine
create table if not exists public.course_dates (
  id uuid primary key default gen_random_uuid(),
  code text,
  course_id uuid references public.courses(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  price_tier_id uuid references public.price_tiers(id) on delete set null,
  price_gross numeric,
  vat_rate numeric,
  price_net numeric,
  deposit numeric,
  saldo numeric,
  duration_hours numeric,
  start_date date,
  end_date date,
  time_from text,
  time_to text,
  status text check (status in ('offen','laufend','abgeschlossen','verschoben','abgesagt')) default 'offen',
  created_at timestamptz default now()
);

-- Historie für Kursverschiebungen
create table if not exists public.course_reschedules (
  id uuid primary key default gen_random_uuid(),
  course_date_id uuid not null references public.course_dates(id) on delete cascade,
  version int not null,
  old_start_date date,
  old_end_date date,
  new_start_date date,
  new_end_date date,
  old_time_from text,
  old_time_to text,
  new_time_from text,
  new_time_to text,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists course_reschedules_course_date_idx on public.course_reschedules(course_date_id);

-- Versionsnummer automatisch erhöhen
create or replace function public.course_reschedules_version_tf()
returns trigger as $$
declare
  v_next int;
begin
  select coalesce(max(version),0)+1 into v_next from public.course_reschedules where course_date_id = new.course_date_id;
  new.version := coalesce(new.version, v_next);
  return new;
end;
$$ language plpgsql;

drop trigger if exists course_reschedules_version_tr on public.course_reschedules;
create trigger course_reschedules_version_tr
  before insert on public.course_reschedules
  for each row execute function public.course_reschedules_version_tf();

alter table public.course_dates enable row level security;

-- Admin darf alles
drop policy if exists "course_dates admin all" on public.course_dates;
create policy "course_dates admin all" on public.course_dates
  for all using (auth.uid() in (select id from public.profiles where role='admin'));

-- Sichtbar für Dozenten/Studenten, wenn sie im Kurs sind
drop policy if exists "course_dates course members read" on public.course_dates;
create policy "course_dates course members read" on public.course_dates
  for select using (
    auth.uid() in (
      select user_id from public.course_members cm
      where cm.course_id = course_dates.course_id
    )
  );

-- RLS für Reschedules
alter table public.course_reschedules enable row level security;

drop policy if exists "course_reschedules admin all" on public.course_reschedules;
create policy "course_reschedules admin all" on public.course_reschedules
  for all using (auth.uid() in (select id from public.profiles where role='admin'));

drop policy if exists "course_reschedules members select" on public.course_reschedules;
create policy "course_reschedules members select" on public.course_reschedules
  for select using (
    auth.uid() in (
      select user_id from public.course_members cm
      join public.course_dates cd on cd.course_id = cm.course_id
      where cd.id = course_reschedules.course_date_id
    )
  );
