-- Archivierung von Kursteilnehmern + zugehörigen Daten

-- Gemeinsame Archiv-Felder anlegen (falls noch nicht vorhanden)
alter table if exists public.students               add column if not exists archived_at timestamptz;
alter table if exists public.bookings               add column if not exists archived_at timestamptz;
alter table if exists public.attendance_entries     add column if not exists archived_at timestamptz;
alter table if exists public.course_survey_responses add column if not exists archived_at timestamptz;
alter table if exists public.course_survey_answers   add column if not exists archived_at timestamptz;
alter table if exists public.payments               add column if not exists archived_at timestamptz;
alter table if exists public.support_tickets        add column if not exists archived_at timestamptz;
alter table if exists public.support_messages       add column if not exists archived_at timestamptz;
alter table if exists public.quiz_attempts          add column if not exists archived_at timestamptz;

-- Log-Tabelle für Archiv-Aktionen
create table if not exists public.archive_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid not null,
  actor_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

-- Funktion zum Archivieren eines Studenten inkl. aller verknüpften Daten
create or replace function public.archive_student(p_student_id uuid, p_actor uuid default null)
returns void
language plpgsql
as $$
begin
  -- Student selbst
  update public.students
    set status = 'inactive',
        archived_at = now()
    where id = p_student_id;

  -- Buchungen
  update public.bookings
    set status = 'Archiv',
        archived_at = now()
    where student_id = p_student_id;

  -- Anwesenheiten
  update public.attendance_entries
    set archived_at = now()
    where student_id = p_student_id;

  -- Kursfragebögen (Responses + Answers)
  update public.course_survey_responses
    set archived_at = now()
    where student_id = p_student_id;

  update public.course_survey_answers
    set archived_at = now()
    where response_id in (
      select id from public.course_survey_responses where student_id = p_student_id
    );

  -- Zahlungen
  update public.payments
    set archived_at = now()
    where student_id = p_student_id;

  -- Support
  update public.support_tickets
    set archived_at = now()
    where student_id = p_student_id;

  update public.support_messages
    set archived_at = now()
    where student_id = p_student_id;

  -- Quiz
  update public.quiz_attempts
    set archived_at = now()
    where student_id = p_student_id;

  -- Log
  insert into public.archive_log (entity, entity_id, actor_id, action)
    values ('student', p_student_id, p_actor, 'archive');
end;
$$;

