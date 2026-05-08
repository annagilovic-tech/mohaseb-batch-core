
create or replace function public.validate_inventory_qty()
returns trigger language plpgsql
set search_path = public as $$
begin
  if new.quantity < 0 then
    raise exception 'Inventory quantity cannot be negative for batch % (item %)', new.batchnumber, new.itemid;
  end if;
  new.updated_at = now();
  return new;
end $$;

revoke execute on function public.post_transfer(bigint) from public, anon;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
