-- Aggregation Umsatz (Bookings) Monat/Jahr vs. Vorjahr
create or replace function public.finance_revenue_summary()
returns table (
  month_current numeric,
  month_prev numeric,
  month_delta numeric,
  year_current numeric,
  year_prev numeric,
  year_delta numeric
) language sql security definer as $$
  with bookings as (
    select booking_date, coalesce(amount,0) as amt
    from public.bookings
    where booking_date is not null
  ),
  this_month as (
    select coalesce(sum(amt),0) as total from bookings
    where date_trunc('month', booking_date) = date_trunc('month', current_date)
  ),
  last_month as (
    select coalesce(sum(amt),0) as total from bookings
    where date_trunc('month', booking_date) = date_trunc('month', current_date - interval '1 year')
  ),
  this_year as (
    select coalesce(sum(amt),0) as total from bookings
    where date_trunc('year', booking_date) = date_trunc('year', current_date)
  ),
  last_year as (
    select coalesce(sum(amt),0) as total from bookings
    where date_trunc('year', booking_date) = date_trunc('year', current_date - interval '1 year')
  )
  select
    (select total from this_month) as month_current,
    (select total from last_month) as month_prev,
    case when (select total from last_month) = 0 then 0 else ((select total from this_month) - (select total from last_month)) / nullif((select total from last_month),0) * 100 end as month_delta,
    (select total from this_year) as year_current,
    (select total from last_year) as year_prev,
    case when (select total from last_year) = 0 then 0 else ((select total from this_year) - (select total from last_year)) / nullif((select total from last_year),0) * 100 end as year_delta;
$$;

-- Aggregation Kosten Monat/Jahr
create or replace function public.finance_cost_summary()
returns table (
  month_current numeric,
  year_current numeric
) language sql security definer as $$
  select
    coalesce(sum(case when date_trunc('month', cost_date) = date_trunc('month', current_date) then amount_gross else 0 end),0) as month_current,
    coalesce(sum(case when date_trunc('year', cost_date) = date_trunc('year', current_date) then amount_gross else 0 end),0) as year_current
  from public.costs;
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
    select course_id, course_title, coalesce(amount,0) as amt, student_id
    from public.bookings
    where course_id is not null
      and date_trunc('year', booking_date) = date_trunc('year', current_date)
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
