-- Table for Kurstermine
create table if not exists public.course_dates (
  id uuid primary key default gen_random_uuid(),
  code text,
  course_id uuid references public.courses(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  start_date date,
  end_date date,
  time_from text,
  time_to text,
  status text check (status in ('offen','laufend','abgeschlossen','verschoben','abgesagt')) default 'offen',
  created_at timestamptz default now()
);

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
