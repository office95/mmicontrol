-- Einheitliches Buchungscode-Format: BU-##### ab 10100

-- Sequenz anlegen (idempotent)
create sequence if not exists public.booking_code_seq start with 10100;

-- Default setzen: BU- + 5-stellige Nummer
alter table if exists public.bookings
  alter column booking_code set default (
    'BU-' || lpad(nextval('public.booking_code_seq')::text, 5, '0')
  );

-- Sequenz an aktuellen Stand anpassen (höchster vorhandener Code oder 10100)
select setval(
  'public.booking_code_seq',
  greatest(
    10100,
    coalesce(max((regexp_replace(booking_code, '^BU-', ''))::int), 10100)
  )
) from public.bookings;

-- Bestehende Codes auf Format bringen, falls abweichend
with numbered as (
  select id,
         'BU-' || lpad(nextval('public.booking_code_seq')::text, 5, '0') as new_code
  from public.bookings
  where booking_code is null or booking_code !~ '^BU-\d{5}$'
)
update public.bookings b
set booking_code = n.new_code
from numbered n
where b.id = n.id;
