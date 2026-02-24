-- Erzwinge Hard-Delete für Quizzes und Fragen (alles kaskadiert)

-- FK neu setzen (idempotent) mit ON DELETE CASCADE
alter table if exists public.quiz_questions
  drop constraint if exists quiz_questions_quiz_id_fkey;
alter table if exists public.quiz_questions
  add constraint quiz_questions_quiz_id_fkey
    foreign key (quiz_id) references public.quizzes(id) on delete cascade;

alter table if exists public.quiz_answer_options
  drop constraint if exists quiz_answer_options_question_id_fkey;
alter table if exists public.quiz_answer_options
  add constraint quiz_answer_options_question_id_fkey
    foreign key (question_id) references public.quiz_questions(id) on delete cascade;

alter table if exists public.quiz_attempts
  drop constraint if exists quiz_attempts_quiz_id_fkey;
alter table if exists public.quiz_attempts
  add constraint quiz_attempts_quiz_id_fkey
    foreign key (quiz_id) references public.quizzes(id) on delete cascade;

alter table if exists public.quiz_attempt_answers
  drop constraint if exists quiz_attempt_answers_attempt_id_fkey;
alter table if exists public.quiz_attempt_answers
  add constraint quiz_attempt_answers_attempt_id_fkey
    foreign key (attempt_id) references public.quiz_attempts(id) on delete cascade;

alter table if exists public.quiz_attempt_answers
  drop constraint if exists quiz_attempt_answers_question_id_fkey;
alter table if exists public.quiz_attempt_answers
  add constraint quiz_attempt_answers_question_id_fkey
    foreign key (question_id) references public.quiz_questions(id) on delete cascade;

-- Helper: ganzes Quiz hart löschen (löscht automatisch Questions, Options, Attempts, Attempt-Answers)
create or replace function public.hard_delete_quiz(p_quiz_id uuid)
returns void
language sql
as $$
  delete from public.quizzes where id = p_quiz_id;
$$;

-- Helper: einzelne Frage hart löschen (löscht automatisch Options & Attempt-Answers)
create or replace function public.hard_delete_question(p_question_id uuid)
returns void
language sql
as $$
  delete from public.quiz_questions where id = p_question_id;
$$;
