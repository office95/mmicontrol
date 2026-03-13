-- Add writeoff_reason for uneinbringliche Forderungen
alter table public.bookings
  add column if not exists writeoff_reason text;

-- Extend status check to include 'uneinbringlich'
-- Drop old constraint if present (default name from Postgres)
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('offen','Anzahlung erhalten','abgeschlossen','Zahlungserinnerung','1. Mahnung','2. Mahnung','Inkasso','Storno','Archiv','uneinbringlich'));
