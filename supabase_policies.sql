-- RLS & Policies Sammlung für Learnspace
-- Vor Ausführung: Prüfen, dass alle Tabellen existieren.

-- 0) RLS aktivieren
alter table if exists public.profiles enable row level security;
alter table if exists public.courses enable row level security;
alter table if exists public.modules enable row level security;
alter table if exists public.course_members enable row level security;
alter table if exists public.materials enable row level security;
alter table if exists public.quizzes enable row level security;
alter table if exists public.quiz_questions enable row level security;
alter table if exists public.quiz_attempts enable row level security;
alter table if exists public.course_dates enable row level security;
alter table if exists public.bookings enable row level security;
alter table if exists public.price_tiers enable row level security;
alter table if exists public.course_price_tiers enable row level security;
-- Zusatzfelder für Preisklassen
alter table if exists public.courses add column if not exists default_price_tier_id uuid references public.price_tiers(id) on delete set null;
alter table if exists public.course_dates add column if not exists price_tier_id uuid references public.price_tiers(id) on delete set null;
alter table if exists public.course_dates add column if not exists price_gross numeric;
alter table if exists public.course_dates add column if not exists vat_rate numeric;
alter table if exists public.course_dates add column if not exists price_net numeric;
alter table if exists public.course_dates add column if not exists deposit numeric;
alter table if exists public.course_dates add column if not exists saldo numeric;
alter table if exists public.course_dates add column if not exists duration_hours numeric;
-- Rechnungsnummer (manuell aus Zoho), optional
alter table if exists public.bookings add column if not exists invoice_number text;
alter table if exists public.students enable row level security;
alter table if exists public.leads enable row level security;
-- Zusatzfelder für Buchungen
alter table if exists public.bookings add column if not exists invoice_number text;
alter table if exists public.bookings add column if not exists due_date date;

-- Hilfs-View auf Rolle
create or replace view public.v_admin as
select id from public.profiles where role='admin';

-- Sicherstellen: keine automatische Standard-Rolle bei Neuregistrierung
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
      and column_default is not null
  ) then
    execute 'alter table public.profiles alter column role drop default';
  end if;
end$$;

-- Rollen für nicht freigeschaltete Nutzer entfernen (falls fälschlich auf student gesetzt)
update public.profiles
set role = null
where coalesce(approved, false) = false
  and role = 'student';

-- 1) profiles
drop policy if exists profiles_admin_all on profiles;
drop policy if exists profiles_self_read on profiles;
create policy profiles_admin_all on profiles
  for all using (auth.uid() in (select id from v_admin));
create policy profiles_self_read on profiles
  for select using (auth.uid() = id);

-- 2) courses
drop policy if exists courses_admin_all on courses;
drop policy if exists courses_teacher_read on courses;
drop policy if exists courses_student_read on courses;
create policy courses_admin_all on courses for all using (auth.uid() in (select id from v_admin));
create policy courses_teacher_read on courses for select using (
  auth.uid() in (
    select user_id from course_members cm where cm.course_id = courses.id and cm.role='teacher'
  )
);
create policy courses_student_read on courses for select using (
  auth.uid() in (
    select user_id from course_members cm where cm.course_id = courses.id and cm.role='student'
  )
);

-- 3) modules
drop policy if exists modules_admin_all on modules;
drop policy if exists modules_members_read on modules;
create policy modules_admin_all on modules for all using (auth.uid() in (select id from v_admin));
create policy modules_members_read on modules for select using (
  auth.uid() in (
    select user_id from course_members cm where cm.course_id = modules.course_id
  )
);

-- 4) course_members
drop policy if exists cm_admin_all on course_members;
drop policy if exists cm_teacher_read_owncourses on course_members;
drop policy if exists cm_self_read on course_members;
create policy cm_admin_all on course_members for all using (auth.uid() in (select id from v_admin));
-- Lehrende/Studierende dürfen ihre eigenen Mitgliedschaften sehen (vermeidet Rekursion)
create policy cm_self_read on course_members for select using (course_members.user_id = auth.uid());

-- 5) materials
drop policy if exists materials_admin_all on materials;
drop policy if exists materials_teacher_view on materials;
drop policy if exists materials_student_view on materials;
create policy materials_admin_all on materials for all using (auth.uid() in (select id from v_admin));
create policy materials_teacher_view on materials for select using (
  auth.uid() in (
    select user_id from course_members cm where cm.course_id = materials.course_id and cm.role='teacher'
  )
  and materials.visibility in ('teachers','both')
);
create policy materials_student_view on materials for select using (
  auth.uid() in (
    select user_id from course_members cm where cm.course_id = materials.course_id and cm.role='student'
  )
  and materials.visibility in ('students','both')
);

-- 6) quizzes
drop policy if exists quizzes_admin_all on quizzes;
drop policy if exists quizzes_member_select on quizzes;
create policy quizzes_admin_all on quizzes for all using (auth.uid() in (select id from v_admin));
create policy quizzes_member_select on quizzes for select using (
  auth.uid() in (
    select user_id from course_members cm where cm.course_id = quizzes.course_id
  )
);

-- 7) quiz_questions
drop policy if exists quizq_admin_all on quiz_questions;
drop policy if exists quizq_member_select on quiz_questions;
create policy quizq_admin_all on quiz_questions for all using (auth.uid() in (select id from v_admin));
create policy quizq_member_select on quiz_questions for select using (
  exists (
    select 1 from quizzes q
    join course_members cm on cm.course_id = q.course_id
    where q.id = quiz_questions.quiz_id and cm.user_id = auth.uid()
  )
);

-- 8) quiz_attempts
drop policy if exists qa_admin_all on quiz_attempts;
drop policy if exists qa_insert_student on quiz_attempts;
drop policy if exists qa_insert_teacher on quiz_attempts;
drop policy if exists qa_read_own on quiz_attempts;
drop policy if exists qa_read_teacher on quiz_attempts;
create policy qa_admin_all on quiz_attempts for all using (auth.uid() in (select id from v_admin));
create policy qa_insert_student on quiz_attempts for insert with check (
  auth.uid() = user_id
  and auth.uid() in (
    select cm.user_id from quizzes q join course_members cm on cm.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id and cm.role = 'student'
  )
);

create policy qa_insert_teacher on quiz_attempts for insert with check (
  auth.uid() = user_id
  and auth.uid() in (
    select cm.user_id from quizzes q join course_members cm on cm.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id and cm.role = 'teacher'
  )
);
create policy qa_read_own on quiz_attempts for select using (user_id = auth.uid());
create policy qa_read_teacher on quiz_attempts for select using (
  auth.uid() in (select id from v_admin)
  or exists (
    select 1 from quizzes q
    join course_members cm on cm.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id and cm.user_id = auth.uid() and cm.role='teacher'
  )
);

-- 9) course_dates
drop policy if exists cd_admin_all on course_dates;
drop policy if exists cd_teacher_student_select on course_dates;
create policy cd_admin_all on course_dates for all using (auth.uid() in (select id from v_admin));
create policy cd_teacher_student_select on course_dates for select using (
  auth.uid() in (
    select user_id from course_members cm where cm.course_id = course_dates.course_id
  )
);

-- 10) bookings
drop policy if exists bookings_admin_all on bookings;
drop policy if exists bookings_teacher_view on bookings;
drop policy if exists bookings_student_view on bookings;
drop policy if exists bookings_partner_teacher_view on bookings;
create policy bookings_admin_all on bookings for all using (auth.uid() in (select id from v_admin));
create policy bookings_teacher_view on bookings for select using (
  auth.uid() in (
    select cm.user_id
    from course_members cm
    join course_dates cd on cd.course_id = cm.course_id
    where cm.role='teacher' and bookings.course_date_id = cd.id
  )
);
create policy bookings_student_view on bookings for select using (
  lower(bookings.student_email) = lower(auth.email())
  or bookings.student_id = auth.uid()
);
-- Lehrer dürfen Buchungen sehen, wenn ihr Partner mit booking.partner_id übereinstimmt
create policy bookings_partner_teacher_view on bookings for select using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.partner_id is not null
      and p.partner_id = bookings.partner_id
      and p.role = 'teacher'
  )
);

-- price_tiers & course_price_tiers (nur Admin)
drop policy if exists price_tiers_admin_all on price_tiers;
create policy price_tiers_admin_all on price_tiers
  for all using (auth.uid() in (select id from v_admin));

drop policy if exists course_price_tiers_admin_all on course_price_tiers;
create policy course_price_tiers_admin_all on course_price_tiers
  for all using (auth.uid() in (select id from v_admin));

-- 11) storage.objects (materials bucket upload nur Admin)
-- Hinweis: Policy nur anwenden, wenn Bucket 'materials' existiert und privat ist.
-- Beispiel:
-- drop policy if exists "materials upload admin" on storage.objects;
-- create policy "materials upload admin" on storage.objects
--   for insert to authenticated
--   with check (
--     bucket_id = 'materials'
--     and auth.uid() in (select id from v_admin)
--   );

-- 12) leads (Partner-Leads für Teacher sichtbar)
alter table if exists public.leads enable row level security;
-- Zusatzfeld Kunde (bool) falls noch nicht vorhanden
alter table if exists public.leads add column if not exists is_customer boolean default false;
drop policy if exists leads_admin_all on leads;
drop policy if exists leads_partner_teacher_view on leads;
create policy leads_admin_all on leads
  for all using (auth.uid() in (select id from v_admin));
create policy leads_partner_teacher_view on leads
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.partner_id is not null
        and p.partner_id = leads.partner_id
        and p.role = 'teacher'
    )
  );

-- 13) benefit_companies & benefit_redemptions (Rabatt-Partner)
alter table if exists public.benefit_companies enable row level security;
alter table if exists public.benefit_redemptions enable row level security;

drop policy if exists benefit_companies_admin_all on public.benefit_companies;
create policy benefit_companies_admin_all on public.benefit_companies
  for all using (auth.uid() in (select id from v_admin));

drop policy if exists benefit_companies_select_active on public.benefit_companies;
create policy benefit_companies_select_active on public.benefit_companies
  for select using (
    status = 'active'
    and (valid_from is null or valid_from <= now()::date)
    and (valid_to   is null or valid_to   >= now()::date)
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (
          (p.role = 'teacher' and (target in ('teachers','both') or target is null))
          or (p.role = 'student' and (target in ('students','both') or target is null))
          or p.role = 'admin'
        )
    )
  );

drop policy if exists benefit_redemptions_admin_all on public.benefit_redemptions;
create policy benefit_redemptions_admin_all on public.benefit_redemptions
  for all using (auth.uid() in (select id from v_admin));

drop policy if exists benefit_redemptions_own_select on public.benefit_redemptions;
create policy benefit_redemptions_own_select on public.benefit_redemptions
  for select using (user_id = auth.uid());

drop policy if exists benefit_redemptions_insert_self on public.benefit_redemptions;
create policy benefit_redemptions_insert_self on public.benefit_redemptions
  for insert with check (user_id = auth.uid());

-- 14) Support Tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  role text check (role in ('student','teacher','admin')),
  subject text not null,
  message text not null,
  status text check (status in ('open','in_progress','closed')) default 'open',
  priority text check (priority in ('normal','high')) default 'normal',
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);

alter table if exists public.support_tickets enable row level security;

drop policy if exists support_tickets_admin_all on public.support_tickets;
create policy support_tickets_admin_all on public.support_tickets
  for all using (auth.uid() in (select id from public.v_admin));

drop policy if exists support_tickets_owner_select on public.support_tickets;
create policy support_tickets_owner_select on public.support_tickets
  for select using (created_by = auth.uid());

drop policy if exists support_tickets_owner_insert on public.support_tickets;
create policy support_tickets_owner_insert on public.support_tickets
  for insert with check (created_by = auth.uid());

-- Support Messages (Thread pro Ticket)
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_role text check (author_role in ('student','teacher','admin')),
  body text not null,
  created_at timestamptz default now()
);

alter table if exists public.support_messages enable row level security;

-- Admin: alles
drop policy if exists support_messages_admin_all on public.support_messages;
create policy support_messages_admin_all on public.support_messages
  for all using (auth.uid() in (select id from public.v_admin));

-- Besitzer: lesen/schreiben in eigenen Tickets
drop policy if exists support_messages_owner_select on public.support_messages;
create policy support_messages_owner_select on public.support_messages
  for select using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and t.created_by = auth.uid()
    )
  );

drop policy if exists support_messages_owner_insert on public.support_messages;
create policy support_messages_owner_insert on public.support_messages
  for insert with check (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and t.created_by = auth.uid()
    )
  );

-- 13) Quiz – zusätzliche Tabellen
alter table if exists public.quiz_answer_options enable row level security;
alter table if exists public.quiz_attempt_answers enable row level security;

-- Quizzes & Fragen: Admin alles, Kurs-Mitglieder lesen
drop policy if exists quiz_admin_all on public.quizzes;
drop policy if exists quiz_members_select on public.quizzes;
create policy quiz_admin_all on public.quizzes for all using (auth.uid() in (select id from public.v_admin));
create policy quiz_members_select on public.quizzes for select using (
  auth.uid() in (
    select user_id from public.course_members cm where cm.course_id = public.quizzes.course_id
  )
);

-- Fragen
drop policy if exists quizq_admin_all on public.quiz_questions;
drop policy if exists quizq_members_select on public.quiz_questions;
create policy quizq_admin_all on public.quiz_questions for all using (auth.uid() in (select id from public.v_admin));
create policy quizq_members_select on public.quiz_questions for select using (
  exists (
    select 1 from public.quizzes q
    join public.course_members cm on cm.course_id = q.course_id
    where q.id = public.quiz_questions.quiz_id and cm.user_id = auth.uid()
  )
);

-- Antwortoptionen
drop policy if exists quiza_admin_all on public.quiz_answer_options;
drop policy if exists quiza_members_select on public.quiz_answer_options;
create policy quiza_admin_all on public.quiz_answer_options for all using (auth.uid() in (select id from public.v_admin));
create policy quiza_members_select on public.quiz_answer_options for select using (
  exists (
    select 1 from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.course_members cm on cm.course_id = q.course_id
    where qq.id = public.quiz_answer_options.question_id and cm.user_id = auth.uid()
  )
);

-- Attempts
alter table if exists public.quiz_attempts enable row level security;
drop policy if exists quiz_attempts_admin_all on public.quiz_attempts;
drop policy if exists quiz_attempts_self_select on public.quiz_attempts;
drop policy if exists quiz_attempts_course_teacher on public.quiz_attempts;
drop policy if exists quiz_attempts_self_insert on public.quiz_attempts;
create policy quiz_attempts_admin_all on public.quiz_attempts for all using (auth.uid() in (select id from public.v_admin));
create policy quiz_attempts_self_select on public.quiz_attempts for select using (user_id = auth.uid());
create policy quiz_attempts_course_teacher on public.quiz_attempts for select using (
  exists (
    select 1 from public.quizzes q
    join public.course_members cm on cm.course_id = q.course_id
    where q.id = public.quiz_attempts.quiz_id and cm.user_id = auth.uid() and cm.role = 'teacher'
  )
);
create policy quiz_attempts_self_insert on public.quiz_attempts for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.quizzes q
    join public.course_members cm on cm.course_id = q.course_id
    where q.id = public.quiz_attempts.quiz_id and cm.user_id = auth.uid()
  )
);

-- Attempt-Details
drop policy if exists qa_answers_admin_all on public.quiz_attempt_answers;
drop policy if exists qa_answers_self_select on public.quiz_attempt_answers;
drop policy if exists qa_answers_teacher_select on public.quiz_attempt_answers;
drop policy if exists qa_answers_self_insert on public.quiz_attempt_answers;
create policy qa_answers_admin_all on public.quiz_attempt_answers for all using (auth.uid() in (select id from public.v_admin));
create policy qa_answers_self_select on public.quiz_attempt_answers for select using (
  exists (
    select 1 from public.quiz_attempts a where a.id = public.quiz_attempt_answers.attempt_id and a.user_id = auth.uid()
  )
);
create policy qa_answers_teacher_select on public.quiz_attempt_answers for select using (
  exists (
    select 1 from public.quiz_attempts a
    join public.quizzes q on q.id = a.quiz_id
    join public.course_members cm on cm.course_id = q.course_id
    where a.id = public.quiz_attempt_answers.attempt_id and cm.user_id = auth.uid() and cm.role = 'teacher'
  )
);
create policy qa_answers_self_insert on public.quiz_attempt_answers for insert with check (
  exists (
    select 1 from public.quiz_attempts a where a.id = public.quiz_attempt_answers.attempt_id and a.user_id = auth.uid()
  )
);
