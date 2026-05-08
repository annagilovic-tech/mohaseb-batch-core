
create or replace function public.block_ledger_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'inventory_transactions is append-only (operation % rejected)', tg_op;
end $$;
