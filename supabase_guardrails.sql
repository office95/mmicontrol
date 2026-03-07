-- Universal Delete-Guardrails (idempotent)
-- Ziel: Keine stillen Datenverluste. Jede Löschung wird protokolliert, Inhalt speicherbar.

-- 1) Audit-Tabelle für gelöschte Zeilen
create table if not exists public.deletion_log (
  id bigserial primary key,
  table_name text not null,
  schema_name text not null default 'public',
  deleted_at timestamptz not null default now(),
  deleted_by uuid null,
  row_data jsonb not null,
  restore_hint text null
);

-- 2) Trigger-Funktion: speichert OLD als JSON
create or replace function public.log_delete()
returns trigger as $$
declare
  user_id uuid := null;
begin
  -- auth.uid() funktioniert nur in RLS-Kontext; bei Service Role bleibt null
  begin
    user_id := auth.uid();
  exception when others then
    user_id := null;
  end;

  insert into public.deletion_log (table_name, schema_name, deleted_by, row_data, restore_hint)
  values (tg_table_name, tg_table_schema, user_id, to_jsonb(old),
          format('Restore: insert into %I.%I (%s) values (%s);',
                 tg_table_schema,
                 tg_table_name,
                 (select string_agg(quote_ident(col), ',') from (select column_name col from information_schema.columns where table_schema = tg_table_schema and table_name = tg_table_name order by ordinal_position) c),
                 (select string_agg(format('%L', val), ',') from jsonb_each_text(to_jsonb(old))
                 )));

  return old; -- Löschung weiterhin zulassen; nur loggen
end;
$$ language plpgsql security definer;

-- 3) Trigger auf alle User-Tabellen hängen (exkl. System/Realtime/Storage)
do $$
declare
  r record;
  trig_name text;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname not in ('pg_catalog','information_schema','pg_toast','storage','extensions','realtime')
      and n.nspname not like 'pg_temp%'
  loop
    trig_name := format('%I_delete_log_trg', r.table_name);
    if not exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where t.tgname = trig_name and n.nspname = r.schema_name and c.relname = r.table_name
    ) then
      execute format('create trigger %I before delete on %I.%I for each row execute function public.log_delete();',
                     trig_name, r.schema_name, r.table_name);
    end if;
  end loop;
end$$;

-- 4) Optional: harte Delete-Blockade aktivieren, falls du globale Soft-Deletes willst
-- Kommentiert lassen, sonst bricht legitime Löschpfade.
--
-- create or replace function public.prevent_delete()
-- returns trigger as $$ begin raise exception ''Delete disabled on %'', tg_table_name; end; $$ language plpgsql;
-- do $$
-- declare r record; trig_name text;
-- begin
--   for r in select n.nspname schema_name, c.relname table_name from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind=''r'' and n.nspname=''public''
--   loop
--     trig_name := format(''%I_block_delete_trg'', r.table_name);
--     execute format(''create trigger %I before delete on %I.%I for each row execute function public.prevent_delete();'', trig_name, r.schema_name, r.table_name);
--   end loop;
-- end$$;

