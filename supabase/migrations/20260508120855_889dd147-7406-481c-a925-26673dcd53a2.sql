
-- Immutable stock movement ledger
create table public.inventory_transactions (
  transaction_id bigserial primary key,
  transaction_type text not null check (transaction_type in
    ('receive','transfer_out','transfer_in','sale','sale_return',
     'purchase','purchase_return','adjustment','write_off','opening_balance')),
  item_id bigint not null references public.the_items(itemid),
  inventory_detail_id bigint references public.inventorydetails(inventorydetailid),
  source_location_id bigint references public.the_storagelocations(locationid),
  destination_location_id bigint references public.the_storagelocations(locationid),
  quantity numeric not null,
  unit_cost numeric not null default 0,
  reference_type text,
  reference_id bigint,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index idx_inventory_transactions_item on public.inventory_transactions(item_id, created_at desc);
create index idx_inventory_transactions_detail on public.inventory_transactions(inventory_detail_id);
create index idx_inventory_transactions_ref on public.inventory_transactions(reference_type, reference_id);
create index idx_inventory_transactions_type_date on public.inventory_transactions(transaction_type, created_at desc);

alter table public.inventory_transactions enable row level security;

create policy auth_read_inventory_transactions on public.inventory_transactions
  for select to authenticated using (true);

create policy insert_inventory_transactions on public.inventory_transactions
  for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

-- Immutability: block update/delete entirely
create or replace function public.block_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'inventory_transactions is append-only (operation % rejected)', tg_op;
end $$;

create trigger no_update_inventory_transactions
  before update on public.inventory_transactions
  for each row execute function public.block_ledger_mutation();

create trigger no_delete_inventory_transactions
  before delete on public.inventory_transactions
  for each row execute function public.block_ledger_mutation();

-- Auto-log every change to inventorydetails using session-scoped context.
-- Callers set: app.txn_type, app.txn_ref_type, app.txn_ref_id (all optional).
create or replace function public.log_inventory_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _type text;
  _ref_type text;
  _ref_id bigint;
  _delta numeric;
  _src bigint;
  _dest bigint;
begin
  _ref_type := nullif(current_setting('app.txn_ref_type', true), '');
  begin
    _ref_id := nullif(current_setting('app.txn_ref_id', true), '')::bigint;
  exception when others then _ref_id := null;
  end;

  if tg_op = 'INSERT' then
    _type := coalesce(nullif(current_setting('app.txn_type', true), ''), 'receive');
    _delta := new.quantity;
    if _type = 'transfer_in' then
      _src := nullif(current_setting('app.txn_src_loc', true), '')::bigint;
      _dest := new.locationid;
    else
      _dest := new.locationid;
    end if;
  elsif tg_op = 'UPDATE' then
    _delta := new.quantity - old.quantity;
    if _delta = 0 then return new; end if;
    _type := coalesce(nullif(current_setting('app.txn_type', true), ''),
                      case when _delta > 0 then 'adjustment' else 'adjustment' end);
    if _type = 'transfer_out' then
      _src := old.locationid;
    elsif _type = 'transfer_in' then
      _src := nullif(current_setting('app.txn_src_loc', true), '')::bigint;
      _dest := new.locationid;
    end if;
  end if;

  insert into public.inventory_transactions
    (transaction_type, item_id, inventory_detail_id,
     source_location_id, destination_location_id,
     quantity, unit_cost, reference_type, reference_id, created_by)
  values
    (_type, coalesce(new.itemid, old.itemid), new.inventorydetailid,
     _src, _dest, _delta, coalesce(new.costprice, 0),
     _ref_type, _ref_id, auth.uid());

  return new;
end $$;

create trigger trg_log_inventory_insert
  after insert on public.inventorydetails
  for each row execute function public.log_inventory_change();

create trigger trg_log_inventory_update
  after update of quantity on public.inventorydetails
  for each row execute function public.log_inventory_change();

-- Update post_transfer to set ledger context for paired entries
create or replace function public.post_transfer(_transfer_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _hdr record;
  _line record;
  _src record;
  _dest_id bigint;
begin
  select * into _hdr from public.the_transfer where transferid = _transfer_id for update;
  if not found then raise exception 'Transfer % not found', _transfer_id; end if;
  if _hdr.status <> 'pending' then raise exception 'Transfer % is not pending (status=%)', _transfer_id, _hdr.status; end if;

  perform set_config('app.txn_ref_type', 'transfer', true);
  perform set_config('app.txn_ref_id', _transfer_id::text, true);

  for _line in select * from public.the_transferdetails where transferid = _transfer_id loop
    select * into _src from public.inventorydetails
      where inventorydetailid = _line.sourceinventorydetailid for update;
    if not found then raise exception 'Source batch % missing', _line.sourceinventorydetailid; end if;
    if _src.locationid <> _hdr.fromlocationid then
      raise exception 'Source batch % is not in source location', _line.sourceinventorydetailid;
    end if;
    if _src.quantity < _line.quantity then
      raise exception 'Insufficient stock in batch % (have %, need %)', _src.batchnumber, _src.quantity, _line.quantity;
    end if;

    -- transfer_out
    perform set_config('app.txn_type', 'transfer_out', true);
    perform set_config('app.txn_src_loc', _hdr.fromlocationid::text, true);
    update public.inventorydetails
      set quantity = quantity - _line.quantity
      where inventorydetailid = _src.inventorydetailid;

    -- transfer_in
    perform set_config('app.txn_type', 'transfer_in', true);
    perform set_config('app.txn_src_loc', _hdr.fromlocationid::text, true);

    select inventorydetailid into _dest_id
      from public.inventorydetails
      where itemid = _src.itemid
        and locationid = _hdr.tolocationid
        and batchnumber = _src.batchnumber
      for update;

    if _dest_id is null then
      insert into public.inventorydetails
        (itemid, locationid, batchnumber, barcode, expirydate, quantity, costprice, receiveddate)
      values
        (_src.itemid, _hdr.tolocationid, _src.batchnumber, _src.barcode, _src.expirydate,
         _line.quantity, _src.costprice, current_date);
    else
      update public.inventorydetails
        set quantity = quantity + _line.quantity
        where inventorydetailid = _dest_id;
    end if;
  end loop;

  perform set_config('app.txn_type', '', true);
  perform set_config('app.txn_src_loc', '', true);
  perform set_config('app.txn_ref_type', '', true);
  perform set_config('app.txn_ref_id', '', true);

  update public.the_transfer
    set status = 'posted', postedat = now()
    where transferid = _transfer_id;
end $$;
