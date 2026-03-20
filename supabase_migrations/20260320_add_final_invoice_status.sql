-- Allow new booking status "Schlussrechnung versendet"
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (
    status in (
      'offen',
      'Anzahlung erhalten',
      'abgeschlossen',
      'Schlussrechnung versendet',
      'Zahlungserinnerung',
      '1. Mahnung',
      '2. Mahnung',
      'Inkasso',
      'Storno',
      'Archiv',
      'uneinbringlich'
    )
  );
