-- Funktion, die Buchungen des eingeloggten Users liefert (bypasst RLS via SECURITY DEFINER)
create or replace function public.get_my_bookings()
returns table (
  id uuid,
  booking_date date,
  status text,
  amount numeric,
  course_title text,
  course_start date,
  partner_name text,
  student_name text,
  student_email text
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.booking_date,
    b.status,
    b.amount,
    b.course_title,
    b.course_start,
    b.partner_name,
    b.student_name,
    b.student_email
  from public.bookings b
  where lower(coalesce(b.student_email,'')) = lower(coalesce(current_setting('request.jwt.claim.email', true), ''))
$$;

grant execute on function public.get_my_bookings() to anon, authenticated;
