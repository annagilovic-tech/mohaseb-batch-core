
create type public.app_role as enum ('admin', 'pharmacist', 'viewer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.the_storagelocations (
  locationid bigserial primary key,
  locationcode text unique not null,
  locationname text not null,
  locationnamear text,
  isactive boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.the_units (
  unitid bigserial primary key,
  unitname text not null,
  unitnamear text,
  isbaseunit boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.the_items (
  itemid bigserial primary key,
  itemcode text unique not null,
  itemname text not null,
  itemnamear text,
  scientificname text,
  manufacturer text,
  category text,
  baseunitid bigint references public.the_units(unitid),
  reorderlevel numeric(18,3) not null default 0,
  taxrate numeric(5,2) not null default 0,
  isactive boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_items_name on public.the_items(itemname);
create index idx_items_code on public.the_items(itemcode);

create table public.the_itemdetails (
  itemdetailid bigserial primary key,
  itemid bigint not null references public.the_items(itemid) on delete cascade,
  unitid bigint not null references public.the_units(unitid),
  barcode text,
  conversionfactor numeric(18,4) not null default 1,
  saleprice numeric(18,4) not null default 0,
  wholesaleprice numeric(18,4) not null default 0,
  isdefaultsaleunit boolean not null default false,
  created_at timestamptz not null default now(),
  unique(itemid, unitid)
);
create index idx_itemdetails_barcode on public.the_itemdetails(barcode);
create index idx_itemdetails_item on public.the_itemdetails(itemid);

create table public.inventorydetails (
  inventorydetailid bigserial primary key,
  itemid bigint not null references public.the_items(itemid) on delete restrict,
  locationid bigint not null references public.the_storagelocations(locationid) on delete restrict,
  batchnumber text not null,
  barcode text,
  expirydate date not null,
  quantity numeric(18,3) not null default 0,
  costprice numeric(18,4) not null default 0,
  receiveddate date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(itemid, locationid, batchnumber)
);
create index idx_inv_item on public.inventorydetails(itemid);
create index idx_inv_location on public.inventorydetails(locationid);
create index idx_inv_barcode on public.inventorydetails(barcode);
create index idx_inv_expiry on public.inventorydetails(expirydate);
create index idx_inv_batch on public.inventorydetails(batchnumber);

create or replace function public.validate_inventory_qty()
returns trigger language plpgsql as $$
begin
  if new.quantity < 0 then
    raise exception 'Inventory quantity cannot be negative for batch % (item %)', new.batchnumber, new.itemid;
  end if;
  new.updated_at = now();
  return new;
end $$;

create trigger trg_validate_inv_qty
before insert or update on public.inventorydetails
for each row execute function public.validate_inventory_qty();

create table public.the_transfer (
  transferid bigserial primary key,
  transfernumber text unique not null,
  transferdate date not null default current_date,
  fromlocationid bigint not null references public.the_storagelocations(locationid),
  tolocationid bigint not null references public.the_storagelocations(locationid),
  status text not null default 'pending',
  notes text,
  postedat timestamptz,
  createdby uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (fromlocationid <> tolocationid)
);
create index idx_transfer_date on public.the_transfer(transferdate);
create index idx_transfer_status on public.the_transfer(status);

create table public.the_transferdetails (
  transferdetailid bigserial primary key,
  transferid bigint not null references public.the_transfer(transferid) on delete cascade,
  itemid bigint not null references public.the_items(itemid),
  sourceinventorydetailid bigint not null references public.inventorydetails(inventorydetailid),
  batchnumber text not null,
  expirydate date not null,
  quantity numeric(18,3) not null,
  costprice numeric(18,4) not null default 0,
  check (quantity > 0)
);
create index idx_transferdetails_transfer on public.the_transferdetails(transferid);

create or replace function public.post_transfer(_transfer_id bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare
  _hdr record;
  _line record;
  _src record;
  _dest_id bigint;
begin
  select * into _hdr from public.the_transfer where transferid = _transfer_id for update;
  if not found then raise exception 'Transfer % not found', _transfer_id; end if;
  if _hdr.status <> 'pending' then raise exception 'Transfer % is not pending (status=%)', _transfer_id, _hdr.status; end if;

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

    update public.inventorydetails
      set quantity = quantity - _line.quantity
      where inventorydetailid = _src.inventorydetailid;

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

  update public.the_transfer
    set status = 'posted', postedat = now()
    where transferid = _transfer_id;
end $$;

alter table public.the_storagelocations enable row level security;
alter table public.the_units enable row level security;
alter table public.the_items enable row level security;
alter table public.the_itemdetails enable row level security;
alter table public.inventorydetails enable row level security;
alter table public.the_transfer enable row level security;
alter table public.the_transferdetails enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'the_storagelocations','the_units','the_items','the_itemdetails',
    'inventorydetails','the_transfer','the_transferdetails'
  ]) loop
    execute format('create policy "auth_read_%1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "rw_%1$s" on public.%1$I for all to authenticated using (public.has_role(auth.uid(),''admin'') or public.has_role(auth.uid(),''pharmacist'')) with check (public.has_role(auth.uid(),''admin'') or public.has_role(auth.uid(),''pharmacist''))', t);
  end loop;
end $$;

alter publication supabase_realtime add table public.inventorydetails;
alter table public.inventorydetails replica identity full;

insert into public.the_storagelocations (locationcode, locationname, locationnamear) values
  ('MAIN', 'Main Pharmacy', 'الصيدلية الرئيسية'),
  ('STORE', 'Warehouse', 'المخزن');

insert into public.the_units (unitname, unitnamear, isbaseunit) values
  ('Tablet', 'قرص', true),
  ('Strip', 'شريط', false),
  ('Box', 'علبة', false),
  ('Bottle', 'زجاجة', false),
  ('Vial', 'قارورة', false);
