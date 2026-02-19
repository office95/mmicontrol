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
alter table if exists public.students enable row level security;
alter table if exists public.leads enable row level security;

-- Hilfs-View auf Rolle
create or replace view public.v_admin as
select id from public.profiles where role='admin';

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
drop policy if exists qa_read_own on quiz_attempts;
drop policy if exists qa_read_teacher on quiz_attempts;
create policy qa_admin_all on quiz_attempts for all using (auth.uid() in (select id from v_admin));
create policy qa_insert_student on quiz_attempts for insert with check (
  auth.uid() = user_id
  and auth.uid() in (
    select cm.user_id from quizzes q join course_members cm on cm.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id and cm.role='student'
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
