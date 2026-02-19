-- Attendance tables
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  date date not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.attendance_sessions(id) on delete cascade,
  student_id uuid references public.students(id),
  status text not null check (status in ('present','absent')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

alter table if exists public.attendance_sessions enable row level security;
alter table if exists public.attendance_entries enable row level security;

-- Admin: full access
drop policy if exists attendance_sessions_admin_all on public.attendance_sessions;
create policy attendance_sessions_admin_all on public.attendance_sessions
  for all using (auth.uid() in (select id from public.v_admin));

drop policy if exists attendance_entries_admin_all on public.attendance_entries;
create policy attendance_entries_admin_all on public.attendance_entries
  for all using (auth.uid() in (select id from public.v_admin));

-- Teacher: sessions of own courses
drop policy if exists attendance_sessions_teacher_rw on public.attendance_sessions;
create policy attendance_sessions_teacher_rw on public.attendance_sessions
  for select using (
    auth.uid() in (
      select cm.user_id from public.course_members cm
      where cm.course_id = attendance_sessions.course_id and cm.role = 'teacher'
    )
  )
  with check (
    auth.uid() in (
      select cm.user_id from public.course_members cm
      where cm.course_id = attendance_sessions.course_id and cm.role = 'teacher'
    )
  );

-- Teacher: entries of own sessions
drop policy if exists attendance_entries_teacher_rw on public.attendance_entries;
create policy attendance_entries_teacher_rw on public.attendance_entries
  for all using (
    exists (
      select 1 from public.attendance_sessions s
      join public.course_members cm on cm.course_id = s.course_id and cm.role='teacher' and cm.user_id = auth.uid()
      where s.id = attendance_entries.session_id
    )
  )
  with check (
    exists (
      select 1 from public.attendance_sessions s
      join public.course_members cm on cm.course_id = s.course_id and cm.role='teacher' and cm.user_id = auth.uid()
      where s.id = attendance_entries.session_id
    )
  );

