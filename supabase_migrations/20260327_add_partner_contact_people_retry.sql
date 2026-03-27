-- Safety net: ensure contact_people column exists for partners
alter table public.partners
  add column if not exists contact_people jsonb default '[]'::jsonb;
