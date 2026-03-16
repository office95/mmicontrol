-- Entfernt automatische Vergabe des booking_code (manuelle Eingabe vorgesehen)

-- Default entfernen
alter table if exists public.bookings
  alter column booking_code drop default;

-- Sequenz löschen, falls vorhanden
drop sequence if exists public.booking_code_seq;
