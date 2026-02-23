-- Payments table (Erweiterung für Bankgebühr)
alter table if exists public.payments
  add column if not exists bank_fee numeric;

