-- Sync course_members beim Anlegen einer Buchung
create or replace function public.sync_member_on_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course uuid;
  v_student uuid;
begin
  select course_id into v_course from course_dates where id = new.course_date_id;
  v_student := new.student_id;
  if v_course is not null and v_student is not null then
    insert into course_members (course_id, user_id, role)
    values (v_course, v_student, 'student')
    on conflict (course_id, user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_member_on_booking on public.bookings;
create trigger trg_sync_member_on_booking
after insert on public.bookings
for each row
execute function public.sync_member_on_booking();
