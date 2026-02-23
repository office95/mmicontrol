-- Payments table (Erweiterung für Bankgebühr)
alter table if exists public.payments
  add column if not exists bank_fee numeric,
  add column if not exists category text,
  add column if not exists partner_id uuid references public.partners(id) on delete set null;
