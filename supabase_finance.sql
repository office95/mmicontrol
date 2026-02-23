-- Hilfs-Trigger: fehlende Datumsfelder setzen
create or replace function public.set_booking_date_default()
returns trigger as $$
begin
  if new.booking_date is null then
    new.booking_date := (new.created_at)::date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_booking_date_default on public.bookings;
create trigger trg_booking_date_default
before insert on public.bookings
for each row execute function public.set_booking_date_default();

create or replace function public.set_cost_date_default()
returns trigger as $$
begin
  if new.cost_date is null then
    new.cost_date := (new.created_at)::date;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_cost_date_default on public.costs;
create trigger trg_cost_date_default
before insert on public.costs
for each row execute function public.set_cost_date_default();

-- Hilfs-Views für saubere Finance-Basis
create or replace view public.v_finance_bookings as
select
  id,
  coalesce(booking_date, created_at::date) as d,
  coalesce(amount,0) as amount,
  status,
  course_id,
  course_title,
  student_id,
  saldo,
  created_at
from public.bookings
where coalesce(status,'') not in ('Storno','Inkasso','Archiv');

create or replace view public.v_finance_costs as
select
  id,
  coalesce(cost_date, created_at::date) as d,
  coalesce(amount_gross,0) as amount_gross,
  category_id,
  course_id,
  partner_id,
  created_at
from public.costs;

-- Umsatz-Aggregation: MTD, QTD, YTD vs. Vorjahr
create or replace function public.finance_revenue_summary()
returns table (
  mtd_current numeric,
  mtd_prev numeric,
  mtd_delta numeric,
  qtd_current numeric,
  qtd_prev numeric,
  qtd_delta numeric,
  ytd_current numeric,
  ytd_prev numeric,
  ytd_delta numeric
) language sql security definer as $$
  with b as (
    select d, amount as amt
    from public.v_finance_bookings
  ),
  cur as (
    select
      sum(case when date_trunc('month', d)=date_trunc('month', current_date) then amt else 0 end) as mtd,
      sum(case when date_trunc('quarter', d)=date_trunc('quarter', current_date) then amt else 0 end) as qtd,
      sum(case when date_trunc('year', d)=date_trunc('year', current_date) then amt else 0 end) as ytd
    from b
  ),
  prev as (
    select
      sum(case when date_trunc('month', d)=date_trunc('month', current_date - interval '1 year') then amt else 0 end) as mtd,
      sum(case when date_trunc('quarter', d)=date_trunc('quarter', current_date - interval '1 year') then amt else 0 end) as qtd,
      sum(case when date_trunc('year', d)=date_trunc('year', current_date - interval '1 year') then amt else 0 end) as ytd
    from b
  )
  select
    cur.mtd as mtd_current,
    prev.mtd as mtd_prev,
    case when prev.mtd=0 then 0 else (cur.mtd-prev.mtd)/nullif(prev.mtd,0)*100 end as mtd_delta,
    cur.qtd as qtd_current,
    prev.qtd as qtd_prev,
    case when prev.qtd=0 then 0 else (cur.qtd-prev.qtd)/nullif(prev.qtd,0)*100 end as qtd_delta,
    cur.ytd as ytd_current,
    prev.ytd as ytd_prev,
    case when prev.ytd=0 then 0 else (cur.ytd-prev.ytd)/nullif(prev.ytd,0)*100 end as ytd_delta
  from cur, prev;
$$;

-- Kosten-Aggregation: MTD, QTD, YTD (Brutto)
create or replace function public.finance_cost_summary()
returns table (
  mtd_current numeric,
  qtd_current numeric,
  ytd_current numeric
) language sql security definer as $$
  with c as (
    select d, amount_gross as amt
    from public.v_finance_costs
  )
  select
    coalesce(sum(case when date_trunc('month', d) = date_trunc('month', current_date) then amt else 0 end),0) as mtd_current,
    coalesce(sum(case when date_trunc('quarter', d) = date_trunc('quarter', current_date) then amt else 0 end),0) as qtd_current,
    coalesce(sum(case when date_trunc('year', d) = date_trunc('year', current_date) then amt else 0 end),0) as ytd_current
  from c;
$$;

-- Gewinn/Verlust (Umsatz - Kosten) je Zeitraum
create or replace function public.finance_profit_summary()
returns table (
  mtd numeric,
  qtd numeric,
  ytd numeric
) language sql security definer as $$
  select
    rev.mtd_current - coalesce(cost.mtd_current,0) as mtd,
    rev.qtd_current - coalesce(cost.qtd_current,0) as qtd,
    rev.ytd_current - coalesce(cost.ytd_current,0) as ytd
  from public.finance_revenue_summary() rev,
       public.finance_cost_summary() cost;
$$;

-- Kosten nach Kategorie (aktuelles Jahr)
create or replace function public.finance_cost_by_category()
returns table (
  category_name text,
  amount numeric
) language sql security definer as $$
  select coalesce(cat.name, 'Unkategorisiert') as category_name, coalesce(sum(c.amount_gross),0) as amount
  from public.costs c
  left join public.cost_categories cat on cat.id = c.category_id
  where date_trunc('year', c.cost_date) = date_trunc('year', current_date)
  group by 1
  order by amount desc;
$$;

-- Top Kurse nach Umsatz (aktuelles Jahr)
create or replace function public.finance_top_courses()
returns table (
  course_id uuid,
  title text,
  revenue numeric,
  participants int,
  avg_rev_per_student numeric
) language sql security definer as $$
  with bookings as (
    select course_id, course_title, amount as amt, student_id, d
    from public.v_finance_bookings
    where course_id is not null
      and date_trunc('year', d) = date_trunc('year', current_date)
  )
  select
    course_id,
    max(course_title) as title,
    sum(amt) as revenue,
    count(distinct student_id) as participants,
    case when count(distinct student_id)=0 then 0 else sum(amt)::numeric / count(distinct student_id) end as avg_rev_per_student
  from bookings
  group by course_id
  order by revenue desc
  limit 5;
$$;

-- Cashflow: Umsatz & Kosten je Monat (letzte 12 Monate)
create or replace function public.finance_cashflow_monthly()
returns table (
  label text,
  revenue numeric,
  cost numeric
) language sql security definer as $$
  with months as (
    select generate_series(date_trunc('month', current_date) - interval '11 months', date_trunc('month', current_date), interval '1 month') as m
  ),
  rev as (
    select date_trunc('month', d) as m, sum(amount) as amt
    from public.v_finance_bookings
    where d >= date_trunc('month', current_date) - interval '11 months'
    group by 1
  ),
  cst as (
    select date_trunc('month', d) as m, sum(amount_gross) as amt
    from public.v_finance_costs
    where d >= date_trunc('month', current_date) - interval '11 months'
    group by 1
  )
  select to_char(m.m, 'Mon YY') as label,
         coalesce(r.amt,0) as revenue,
         coalesce(c.amt,0) as cost
  from months m
  left join rev r on r.m = m.m
  left join cst c on c.m = m.m
  order by m.m;
$$;

-- Offene Forderungen mit Aging
create or replace function public.finance_open_invoices_aging()
returns table (
  bucket text,
  amount numeric
) language sql security definer as $$
  with base as (
    select coalesce(saldo,0) as saldo, coalesce(d, current_date) as d
    from public.v_finance_bookings
    where saldo > 0
  )
  select bucket, sum(saldo) as amount from (
    select case
      when age(current_date, d) <= interval '30 days' then '0-30'
      when age(current_date, d) <= interval '60 days' then '31-60'
      when age(current_date, d) <= interval '90 days' then '61-90'
      else '90+'
    end as bucket,
    saldo
    from base
  ) t
  group by bucket
  order by bucket;
$$;
