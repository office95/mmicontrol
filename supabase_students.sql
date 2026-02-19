-- Kursteilnehmer
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text,
  salutation text check (salutation in ('Herr','Frau','Firma')),
  name text not null,
  street text,
  zip text,
  city text,
  country text check (country in ('Österreich','Deutschland')),
  state text,
  company text,
  vat_number text,
  birthdate date,
  phone text,
  email text,
  bank_name text,
  iban text,
  bic text,
  status text check (status in ('active','inactive')) default 'active',
  is_problem boolean default false,
  problem_note text,
  created_at timestamptz default now()
);

alter table public.students enable row level security;

-- Admin darf alles
drop policy if exists "students admin all" on public.students;
create policy "students admin all" on public.students
  for all using (auth.uid() in (select id from public.profiles where role='admin'));

-- Lesen: Admin oder eigener Datensatz per E-Mail
drop policy if exists "students read own email" on public.students;
create policy "students read own email" on public.students
  for select using (
    auth.uid() in (select id from public.profiles where role='admin')
    or email = auth.email()
  );
