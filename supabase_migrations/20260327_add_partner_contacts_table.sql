-- Zusätzliche Ansprechpartner je Partner als eigene Tabelle
create table if not exists public.partner_contacts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now()
);

create index if not exists partner_contacts_partner_id_idx on public.partner_contacts(partner_id);
