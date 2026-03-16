-- Orders: Herkunft (AT/DE) speichern und Buchungscode automatisch vergeben

-- 1) Feld für Herkunft anlegen (idempotent)
alter table if exists public.orders
  add column if not exists source_domain text;

-- 2) Sequenz für laufende Nummer ab 10100
create sequence if not exists public.order_number_seq as bigint start with 10100;

-- 3) Trigger-Funktion: setzt order_number falls nicht gesetzt
create or replace function public.f_set_order_number()
returns trigger
language plpgsql
as $$
declare
  seq_num bigint;
  country text;
  year_txt text := to_char(current_date, 'YYYY');
begin
  -- Wenn bereits vorhanden, nichts ändern
  if new.order_number is not null then
    return new;
  end if;

  seq_num := nextval('public.order_number_seq');

  if coalesce(new.source_domain,'') ~* '\.at$' then
    country := 'AT';
  elsif coalesce(new.source_domain,'') ~* '\.de$' then
    country := 'DE';
  else
    country := 'XX';
  end if;

  new.order_number := 'BU-' || lpad(seq_num::text, 5, '0') || country || year_txt;
  return new;
end;
$$;

-- 4) Trigger anlegen (ersetzt, falls schon vorhanden)
drop trigger if exists trg_set_order_number on public.orders;
create trigger trg_set_order_number
before insert on public.orders
for each row execute function public.f_set_order_number();

-- 5) Bestehende Orders nachziehen: neu durchnummerieren ab BU-10100xx2026
with ordered as (
  select id, source_domain,
         row_number() over (order by created_at, id) - 1 as rn
  from public.orders
),
renum as (
  select id,
    'BU-' ||
    lpad((10100 + rn)::text, 5, '0') ||
    case
      when coalesce(source_domain,'') ~* '\.at$' then 'AT'
      when coalesce(source_domain,'') ~* '\.de$' then 'DE'
      else 'XX'
    end ||
    to_char(current_date, 'YYYY') as new_code
  from ordered
)
update public.orders o
set order_number = r.new_code
from renum r
where o.id = r.id;

-- 6) Sequenz auf nächsten Wert setzen
select setval(
  'public.order_number_seq',
  (select max((regexp_replace(order_number, '^BU-', ''))::bigint) from public.orders) + 1,
  true
);
