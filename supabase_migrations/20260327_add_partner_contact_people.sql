-- Allow multiple Ansprechpartner per Partner
alter table public.partners
  add column if not exists contact_people jsonb default '[]'::jsonb;
