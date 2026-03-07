-- Kursfragebögen

-- Survey pro Kurs
create table if not exists public.course_surveys (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  instructions text,
  open_days_before_start int default 7,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Fragen
create table if not exists public.course_survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.course_surveys(id) on delete cascade,
  qtype text not null check (qtype in ('text','textarea','select','single','scale','multiselect')),
  prompt text not null,
  options jsonb,
  extra_text_label text,
  extra_text_required boolean default false,
  required boolean default true,
  position int default 1,
  archived boolean not null default false,
  created_at timestamptz default now()
);

-- Antworten (Response pro Teilnehmer/Buchung)
create table if not exists public.course_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.course_surveys(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  submitted_at timestamptz default now(),
  unique(survey_id, booking_id)
);

-- Einzelantworten
create table if not exists public.course_survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.course_survey_responses(id) on delete cascade,
  question_id uuid not null references public.course_survey_questions(id) on delete cascade,
  value text,
  extra_text text,
  created_at timestamptz default now()
);

-- falls extra_text in bestehenden DBs noch fehlt, ergänzen
alter table if exists public.course_survey_answers
  add column if not exists extra_text text;

-- Archiv-Flag für Fragen (verhindert Löschen alter Antworten)
alter table if exists public.course_survey_questions
  add column if not exists archived boolean not null default false;

-- FK so belassen Antworten bei Frage-Löschung erhalten bleiben
alter table if exists public.course_survey_answers
  drop constraint if exists course_survey_answers_question_id_fkey;
alter table if exists public.course_survey_answers
  add constraint course_survey_answers_question_id_fkey
    foreign key (question_id) references public.course_survey_questions(id) on delete set null;

-- Automation Settings (global toggles)
create table if not exists public.automation_settings (
  id text primary key,
  title text not null,
  description text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Defaults einspielen (idempotent)
insert into public.automation_settings (id, title, description, active)
values
  ('survey-reminder', 'Fragebogen-Erinnerung', 'E-Mail/Banner vor Kursstart, wenn Survey offen.', true),
  ('survey-submitted-mail', 'Mail bei Fragebogen-Einreichung', 'Mail an Dozenten nach Absenden.', true),
  ('survey-open-banner', 'Banner offener Fragebogen (Student)', 'Banner im Student Dashboard.', true),
  ('course-reschedule-mail', 'Kursverschiebung Benachrichtigung', 'Mail an Admin, Lehrende, Teilnehmer bei Terminverschiebung.', true),
  ('role-assign-mail', 'Rollen-/Freischaltungs-Mail', 'Mail an User bei Rollen-/Freischaltung.', true),
  ('support-ticket-mail', 'Support/Ticket Mail', 'Mails bei Support-Nachrichten.', true),
  ('quiz-save-idempotent', 'Quiz-Speichern (Admin)', 'Schutz vor Datenverlust beim Quiz-Speichern.', true)
on conflict (id) do nothing;
-- Erinnerungen (damit E-Mails nur einmal pro Buchung/Survey rausgehen)
create table if not exists public.course_survey_reminders (
  survey_id uuid not null references public.course_surveys(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sent_at timestamptz default now(),
  primary key (survey_id, booking_id)
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_course_surveys_u on public.course_surveys;
create trigger trg_course_surveys_u before update on public.course_surveys for each row execute function public.set_updated_at();

-- RLS
alter table if exists public.course_surveys enable row level security;
alter table if exists public.course_survey_questions enable row level security;
alter table if exists public.course_survey_responses enable row level security;
alter table if exists public.course_survey_answers enable row level security;

-- Policies: Admin alles
create policy if not exists course_surveys_admin_all on public.course_surveys for all using (auth.uid() in (select id from public.v_admin));
create policy if not exists course_survey_questions_admin_all on public.course_survey_questions for all using (auth.uid() in (select id from public.v_admin));
create policy if not exists course_survey_responses_admin_all on public.course_survey_responses for all using (auth.uid() in (select id from public.v_admin));
create policy if not exists course_survey_answers_admin_all on public.course_survey_answers for all using (auth.uid() in (select id from public.v_admin));

-- Studenten: lesen eigenen Kursfragebogen/-fragen
create policy if not exists course_surveys_student_select on public.course_surveys
  for select using (
    exists (
      select 1 from public.bookings b
      where b.course_id = course_surveys.course_id
        and (
          b.student_id = auth.uid()
          or lower(b.student_email) = lower(auth.email())
        )
    )
  );

create policy if not exists course_survey_questions_student_select on public.course_survey_questions
  for select using (
    exists (
      select 1
      from public.course_surveys s
      join public.bookings b on b.course_id = s.course_id
      where s.id = course_survey_questions.survey_id
        and (
          b.student_id = auth.uid()
          or lower(b.student_email) = lower(auth.email())
        )
    )
  );

-- Lehrer: Lesen/Einsehen ihrer Kurse
create policy if not exists course_surveys_teacher_select on public.course_surveys
  for select using (auth.uid() in (select user_id from public.course_members cm where cm.course_id = course_surveys.course_id and cm.role = 'teacher'));
create policy if not exists course_survey_questions_teacher_select on public.course_survey_questions
  for select using (exists (select 1 from public.course_surveys s where s.id = survey_id and auth.uid() in (select user_id from public.course_members cm where cm.course_id = s.course_id and cm.role='teacher')));
create policy if not exists course_survey_responses_teacher_select on public.course_survey_responses
  for select using (exists (select 1 from public.course_surveys s where s.id = survey_id and auth.uid() in (select user_id from public.course_members cm where cm.course_id = s.course_id and cm.role='teacher')));
create policy if not exists course_survey_answers_teacher_select on public.course_survey_answers
  for select using (exists (select 1 from public.course_survey_responses r join public.course_surveys s on s.id = r.survey_id where r.id = course_survey_answers.response_id and auth.uid() in (select user_id from public.course_members cm where cm.course_id = s.course_id and cm.role='teacher')));

-- Teilnehmer: eigenes Ausfüllen/Lesen
create policy if not exists course_survey_responses_student_select on public.course_survey_responses
  for select using (auth.uid() = student_id);
create policy if not exists course_survey_answers_student_select on public.course_survey_answers
  for select using (exists (select 1 from public.course_survey_responses r where r.id = course_survey_answers.response_id and r.student_id = auth.uid()));
drop policy if exists course_survey_responses_student_insert on public.course_survey_responses;
create policy course_survey_responses_student_insert on public.course_survey_responses
  for insert with check (
    student_id = auth.uid()
    or booking_id in (
      select b.id from public.bookings b
      where b.id = course_survey_responses.booking_id
        and lower(b.student_email) = lower(auth.email())
    )
  );
drop policy if exists course_survey_answers_student_insert on public.course_survey_answers;
create policy course_survey_answers_student_insert on public.course_survey_answers
  for insert with check (
    exists (
      select 1 from public.course_survey_responses r
      join public.bookings b on b.id = r.booking_id
      where r.id = course_survey_answers.response_id
        and (
          r.student_id = auth.uid()
          or lower(b.student_email) = lower(auth.email())
        )
    )
  );

-- View: Kursfragebögen aus Sicht des Lehrers (alles fertig gejoint)
create or replace view public.v_teacher_course_surveys as
select
  cm.user_id      as teacher_id,
  cs.id           as survey_id,
  cs.course_id,
  c.partner_id    as course_partner_id,
  cs.title        as survey_title,
  cs.created_at   as survey_created_at,
  csr.id          as response_id,
  csr.booking_id,
  csr.student_id,
  csr.submitted_at,
  ans.question_id,
  ans.value,
  ans.extra_text
from public.course_members cm
join public.courses c on c.id = cm.course_id
join public.course_surveys cs on cs.course_id = c.id
left join public.course_survey_responses csr on csr.survey_id = cs.id
left join public.course_survey_answers   ans on ans.response_id = csr.id
where cm.role = 'teacher';

-- RLS für View
alter view public.v_teacher_course_surveys set (security_invoker = false);
grant select on public.v_teacher_course_surveys to authenticated, service_role, anon;

drop policy if exists v_teacher_course_surveys_select on public.v_teacher_course_surveys;
create policy v_teacher_course_surveys_select on public.v_teacher_course_surveys
  for select using (auth.uid() = teacher_id);
