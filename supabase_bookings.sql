-- Buchungen
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text,
  booking_date date,
  amount numeric,
  status text check (status in ('offen','Anzahlung erhalten','abgeschlossen','Zahlungserinnerung','1. Mahnung','2. Mahnung','Inkasso','Storno','Archiv')) default 'offen',
  student_id uuid references public.students(id) on delete cascade,
  course_date_id uuid references public.course_dates(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  course_title text,
  course_start date,
  partner_name text,
  student_name text,
  student_email text,
  created_at timestamptz default now()
);

alter table public.bookings enable row level security;

-- Admin darf alles
drop policy if exists "bookings admin all" on public.bookings;
create policy "bookings admin all" on public.bookings
  for all using (auth.uid() in (select id from public.profiles where role='admin'));

-- Lesen: eigener Datensatz (direkt über student_email oder über student_id->students.email)
drop policy if exists "bookings read own" on public.bookings;
create policy "bookings read own" on public.bookings
  for select using (
    auth.uid() in (select id from public.profiles where role='admin')
    or lower(coalesce(bookings.student_email,'')) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
    or exists (
      select 1
      from public.students s
      where s.id = bookings.student_id
        and lower(s.email) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
    )
  );
