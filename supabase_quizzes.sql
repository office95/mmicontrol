-- Quiz Grundschema für Music Mission Control
-- Ausführungsreihenfolge: nach Basistabellen (courses, modules, profiles) und vor supabase_policies.sql

-- Enums
create type if not exists quiz_difficulty as enum ('easy','medium','hard');
create type if not exists quiz_question_type as enum ('single','multiple','boolean','order','match','text','media');

-- Quizzes (pro Kurs oder Modul)
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  course_id uuid references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  level_count int not null default 5,
  time_per_question int not null default 30, -- Sekunden
  allow_mixed_modules boolean not null default true,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fragen
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  difficulty quiz_difficulty not null default 'medium',
  qtype quiz_question_type not null default 'single',
  prompt text not null,
  media_url text,
  explanation text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Antwortoptionen
create table if not exists public.quiz_answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  order_index int not null default 0
);

-- Attempts (Runs)
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid references auth.users(id),
  alias text, -- für anonyme Bestenliste
  score int not null default 0,
  max_score int not null default 0,
  level_reached int not null default 1,
  duration_sec int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Attempt-Details (Antworten pro Frage)
create table if not exists public.quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_ids uuid[] default '{}',
  is_correct boolean,
  time_ms int,
  level int,
  points int default 0,
  created_at timestamptz not null default now()
);

create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id);
create index if not exists quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id);
create index if not exists quiz_qs_quiz_idx on public.quiz_questions(quiz_id);
create index if not exists quiz_ans_q_idx on public.quiz_answer_options(question_id);
