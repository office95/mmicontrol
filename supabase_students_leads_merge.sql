-- Leads & Students vereinheitlichen

-- 1) Spalten ergänzen
alter table public.students
  add column if not exists type text check (type in ('lead','student')) default 'lead',
  add column if not exists lead_quality text,
  add column if not exists lead_status text,
  add column if not exists source text,
  add column if not exists interest_courses text[],
  add column if not exists note text,
  add column if not exists birthdate date,
  add column if not exists converted_at timestamptz,
  add column if not exists converted_by uuid references auth.users;

-- 2) Bestehende Teilnehmer als student kennzeichnen
update public.students set type = 'student' where type is null;

-- 3) (Optional) Leads migrieren, falls Tabelle public.leads existiert
-- insert into public.students (id, name, email, phone, country, state, city, birthdate, lead_quality, lead_status, source, interest_courses, note, type, created_at)
-- select id, name, email, phone, country, state, city, birthdate, lead_quality, status, source, interest_courses, note, 'lead', created_at from public.leads;

