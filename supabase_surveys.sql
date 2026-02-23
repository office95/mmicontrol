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
create policy if not exists course_survey_responses_student_insert on public.course_survey_responses
  for insert with check (auth.uid() = student_id);
create policy if not exists course_survey_answers_student_insert on public.course_survey_answers
  for insert with check (exists (select 1 from public.course_survey_responses r where r.id = course_survey_answers.response_id and r.student_id = auth.uid()));
