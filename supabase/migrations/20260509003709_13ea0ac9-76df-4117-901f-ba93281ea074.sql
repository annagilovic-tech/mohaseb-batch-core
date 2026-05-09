
-- =====================================================================
-- ACCOUNTING CORE
-- =====================================================================

-- Chart of accounts (hierarchical)
create table public.the_accounts (
  accountid bigserial primary key,
  accountcode text not null unique,
  accountname text not null,
  accountnamear text,
  parentaccountid bigint references public.the_accounts(accountid) on delete restrict,
  accounttype text not null check (accounttype in ('asset','liability','equity','revenue','expense')),
  allowposting boolean not null default true,
  isactive boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_accounts_parent on public.the_accounts(parentaccountid);
create index idx_accounts_type on public.the_accounts(accounttype);

alter table public.the_accounts enable row level security;
create policy auth_read_the_accounts on public.the_accounts for select to authenticated using (true);
create policy rw_the_accounts on public.the_accounts for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

-- Journal entries (header)
create table public.the_journalentries (
  entryid bigserial primary key,
  entrynumber text not null unique,
  entrydate date not null default current_date,
  reference_type text,
  reference_id bigint,
  notes text,
  status text not null default 'draft' check (status in ('draft','posted','void')),
  postedat timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index idx_je_ref on public.the_journalentries(reference_type, reference_id);
create index idx_je_date on public.the_journalentries(entrydate);

alter table public.the_journalentries enable row level security;
create policy auth_read_je on public.the_journalentries for select to authenticated using (true);
create policy rw_je on public.the_journalentries for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

-- Journal entry lines
create table public.the_journalentrylines (
  lineid bigserial primary key,
  entryid bigint not null references public.the_journalentries(entryid) on delete cascade,
  accountid bigint not null references public.the_accounts(accountid),
  debit numeric(18,4) not null default 0 check (debit >= 0),
  credit numeric(18,4) not null default 0 check (credit >= 0),
  notes text,
  constraint chk_debit_xor_credit check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0) or (debit = 0 and credit = 0)
  )
);
create index idx_jel_entry on public.the_journalentrylines(entryid);
create index idx_jel_account on public.the_journalentrylines(accountid);

alter table public.the_journalentrylines enable row level security;
create policy auth_read_jel on public.the_journalentrylines for select to authenticated using (true);
create policy rw_jel on public.the_journalentrylines for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

-- Immutability of posted journal entries
create or replace function public.guard_posted_journal()
returns trigger language plpgsql set search_path = public as $$
declare _status text;
begin
  if tg_table_name = 'the_journalentries' then
    if tg_op = 'UPDATE' then
      if old.status = 'posted' and (new.entrydate <> old.entrydate or coalesce(new.notes,'') <> coalesce(old.notes,'')
         or coalesce(new.reference_type,'') <> coalesce(old.reference_type,'')
         or coalesce(new.reference_id,0) <> coalesce(old.reference_id,0)) then
        raise exception 'Posted journal entry % is immutable', old.entryid;
      end if;
    elsif tg_op = 'DELETE' then
      if old.status = 'posted' then
        raise exception 'Cannot delete posted journal entry %', old.entryid;
      end if;
    end if;
    return coalesce(new, old);
  else
    select status into _status from public.the_journalentries where entryid = coalesce(new.entryid, old.entryid);
    if _status = 'posted' then
      raise exception 'Cannot modify lines of posted journal entry';
    end if;
    return coalesce(new, old);
  end if;
end $$;

create trigger trg_guard_je
  before update or delete on public.the_journalentries
  for each row execute function public.guard_posted_journal();
create trigger trg_guard_jel
  before insert or update or delete on public.the_journalentrylines
  for each row execute function public.guard_posted_journal();

revoke execute on function public.guard_posted_journal() from public, anon, authenticated;

-- Post a journal entry: validates balance and flips to posted
create or replace function public.post_journal_entry(_entry_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare _hdr record; _dr numeric; _cr numeric;
begin
  select * into _hdr from public.the_journalentries where entryid = _entry_id for update;
  if not found then raise exception 'Journal entry % not found', _entry_id; end if;
  if _hdr.status <> 'draft' then raise exception 'Entry % is not draft (%)', _entry_id, _hdr.status; end if;

  select coalesce(sum(debit),0), coalesce(sum(credit),0)
    into _dr, _cr from public.the_journalentrylines where entryid = _entry_id;

  if _dr = 0 and _cr = 0 then raise exception 'Entry % has no lines', _entry_id; end if;
  if round(_dr,4) <> round(_cr,4) then
    raise exception 'Entry % unbalanced: debit=% credit=%', _entry_id, _dr, _cr;
  end if;

  -- enforce all lines reference posting-allowed accounts
  if exists (
    select 1 from public.the_journalentrylines l
    join public.the_accounts a on a.accountid = l.accountid
    where l.entryid = _entry_id and a.allowposting = false
  ) then
    raise exception 'Entry % references a non-posting account', _entry_id;
  end if;

  update public.the_journalentries set status='posted', postedat=now() where entryid=_entry_id;
end $$;

-- =====================================================================
-- PARTIES + CASH + PAYMENT METHODS
-- =====================================================================

create table public.the_customers (
  customerid bigserial primary key,
  customercode text not null unique,
  customername text not null,
  customernamear text,
  phone text,
  email text,
  address text,
  taxnumber text,
  creditlimit numeric(18,4) not null default 0,
  receivable_accountid bigint references public.the_accounts(accountid),
  isactive boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.the_customers enable row level security;
create policy auth_read_cust on public.the_customers for select to authenticated using (true);
create policy rw_cust on public.the_customers for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

create table public.the_suppliers (
  supplierid bigserial primary key,
  suppliercode text not null unique,
  suppliername text not null,
  suppliernamear text,
  phone text,
  email text,
  address text,
  taxnumber text,
  payable_accountid bigint references public.the_accounts(accountid),
  isactive boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.the_suppliers enable row level security;
create policy auth_read_supp on public.the_suppliers for select to authenticated using (true);
create policy rw_supp on public.the_suppliers for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

create table public.the_cashboxes (
  cashboxid bigserial primary key,
  cashboxcode text not null unique,
  cashboxname text not null,
  cashboxnamear text,
  accountid bigint not null references public.the_accounts(accountid),
  currency text not null default 'EGP',
  isactive boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.the_cashboxes enable row level security;
create policy auth_read_cb on public.the_cashboxes for select to authenticated using (true);
create policy rw_cb on public.the_cashboxes for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

create table public.the_paymentmethods (
  paymentmethodid bigserial primary key,
  methodcode text not null unique,
  methodname text not null,
  methodnamear text,
  accountid bigint not null references public.the_accounts(accountid),
  isactive boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.the_paymentmethods enable row level security;
create policy auth_read_pm on public.the_paymentmethods for select to authenticated using (true);
create policy rw_pm on public.the_paymentmethods for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

-- =====================================================================
-- PURCHASE / SALES INVOICES
-- =====================================================================

create table public.the_purchaseinvoice (
  invoiceid bigserial primary key,
  invoicenumber text not null unique,
  invoicedate date not null default current_date,
  supplierid bigint not null references public.the_suppliers(supplierid),
  destinationlocationid bigint not null references public.the_storagelocations(locationid),
  inventory_accountid bigint not null references public.the_accounts(accountid),
  payable_accountid bigint not null references public.the_accounts(accountid),
  totalamount numeric(18,4) not null default 0,
  status text not null default 'draft' check (status in ('draft','posted','void')),
  postedat timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.the_purchaseinvoice enable row level security;
create policy auth_read_pinv on public.the_purchaseinvoice for select to authenticated using (true);
create policy rw_pinv on public.the_purchaseinvoice for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

create table public.the_purchaseinvoicedetails (
  invoicedetailid bigserial primary key,
  invoiceid bigint not null references public.the_purchaseinvoice(invoiceid) on delete cascade,
  itemid bigint not null references public.the_items(itemid),
  batchnumber text not null,
  barcode text,
  expirydate date not null,
  quantity numeric(18,4) not null check (quantity > 0),
  costprice numeric(18,4) not null check (costprice >= 0)
);
create index idx_pinvd_inv on public.the_purchaseinvoicedetails(invoiceid);
alter table public.the_purchaseinvoicedetails enable row level security;
create policy auth_read_pinvd on public.the_purchaseinvoicedetails for select to authenticated using (true);
create policy rw_pinvd on public.the_purchaseinvoicedetails for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

create table public.the_salesinvoice (
  invoiceid bigserial primary key,
  invoicenumber text not null unique,
  invoicedate date not null default current_date,
  customerid bigint not null references public.the_customers(customerid),
  sourcelocationid bigint not null references public.the_storagelocations(locationid),
  revenue_accountid bigint not null references public.the_accounts(accountid),
  receivable_accountid bigint not null references public.the_accounts(accountid),
  inventory_accountid bigint not null references public.the_accounts(accountid),
  cogs_accountid bigint not null references public.the_accounts(accountid),
  totalamount numeric(18,4) not null default 0,
  totalcogs numeric(18,4) not null default 0,
  status text not null default 'draft' check (status in ('draft','posted','void')),
  postedat timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.the_salesinvoice enable row level security;
create policy auth_read_sinv on public.the_salesinvoice for select to authenticated using (true);
create policy rw_sinv on public.the_salesinvoice for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

create table public.the_salesinvoicedetails (
  invoicedetailid bigserial primary key,
  invoiceid bigint not null references public.the_salesinvoice(invoiceid) on delete cascade,
  itemid bigint not null references public.the_items(itemid),
  quantity numeric(18,4) not null check (quantity > 0),
  saleprice numeric(18,4) not null check (saleprice >= 0),
  costprice numeric(18,4) not null default 0
);
create index idx_sinvd_inv on public.the_salesinvoicedetails(invoiceid);
alter table public.the_salesinvoicedetails enable row level security;
create policy auth_read_sinvd on public.the_salesinvoicedetails for select to authenticated using (true);
create policy rw_sinvd on public.the_salesinvoicedetails for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist'));

-- =====================================================================
-- POSTING: PURCHASE INVOICE
-- Inventory Dr / Payable Cr; receives batches into destination location.
-- =====================================================================
create or replace function public.post_purchase_invoice(_invoice_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  _hdr record; _line record; _entry_id bigint; _entry_no text; _total numeric := 0;
  _dest_id bigint; _line_total numeric;
begin
  select * into _hdr from public.the_purchaseinvoice where invoiceid = _invoice_id for update;
  if not found then raise exception 'Purchase invoice % not found', _invoice_id; end if;
  if _hdr.status <> 'draft' then raise exception 'Invoice % not draft (%)', _invoice_id, _hdr.status; end if;

  perform set_config('app.txn_ref_type', 'purchase_invoice', true);
  perform set_config('app.txn_ref_id', _invoice_id::text, true);

  for _line in select * from public.the_purchaseinvoicedetails where invoiceid = _invoice_id loop
    _line_total := _line.quantity * _line.costprice;
    _total := _total + _line_total;

    perform set_config('app.txn_type', 'purchase_receive', true);
    perform set_config('app.txn_src_loc', '', true);

    select inventorydetailid into _dest_id from public.inventorydetails
      where itemid=_line.itemid and locationid=_hdr.destinationlocationid and batchnumber=_line.batchnumber
      for update;
    if _dest_id is null then
      insert into public.inventorydetails(itemid, locationid, batchnumber, barcode, expirydate, quantity, costprice, receiveddate)
      values (_line.itemid, _hdr.destinationlocationid, _line.batchnumber, _line.barcode, _line.expirydate, _line.quantity, _line.costprice, _hdr.invoicedate);
    else
      update public.inventorydetails set quantity = quantity + _line.quantity, costprice = _line.costprice
        where inventorydetailid = _dest_id;
    end if;
  end loop;

  perform set_config('app.txn_type','',true);
  perform set_config('app.txn_ref_type','',true);
  perform set_config('app.txn_ref_id','',true);

  -- create journal entry
  _entry_no := 'PI-' || _invoice_id::text;
  insert into public.the_journalentries(entrynumber, entrydate, reference_type, reference_id, notes, created_by)
  values (_entry_no, _hdr.invoicedate, 'purchase_invoice', _invoice_id, 'Auto: purchase ' || _hdr.invoicenumber, auth.uid())
  returning entryid into _entry_id;

  insert into public.the_journalentrylines(entryid, accountid, debit, credit, notes)
  values (_entry_id, _hdr.inventory_accountid, _total, 0, 'Inventory receipt'),
         (_entry_id, _hdr.payable_accountid, 0, _total, 'AP supplier');

  perform public.post_journal_entry(_entry_id);

  update public.the_purchaseinvoice set status='posted', postedat=now(), totalamount=_total where invoiceid=_invoice_id;
end $$;

-- =====================================================================
-- POSTING: SALES INVOICE
-- Receivable Dr / Revenue Cr; COGS Dr / Inventory Cr (FIFO by expiry).
-- =====================================================================
create or replace function public.post_sales_invoice(_invoice_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  _hdr record; _line record; _b record; _need numeric; _take numeric;
  _line_cogs numeric; _total_rev numeric := 0; _total_cogs numeric := 0;
  _entry_id bigint; _entry_no text;
begin
  select * into _hdr from public.the_salesinvoice where invoiceid = _invoice_id for update;
  if not found then raise exception 'Sales invoice % not found', _invoice_id; end if;
  if _hdr.status <> 'draft' then raise exception 'Invoice % not draft (%)', _invoice_id, _hdr.status; end if;

  perform set_config('app.txn_ref_type','sales_invoice',true);
  perform set_config('app.txn_ref_id', _invoice_id::text, true);

  for _line in select * from public.the_salesinvoicedetails where invoiceid = _invoice_id loop
    _need := _line.quantity;
    _line_cogs := 0;
    _total_rev := _total_rev + (_line.quantity * _line.saleprice);

    for _b in
      select * from public.inventorydetails
       where itemid = _line.itemid and locationid = _hdr.sourcelocationid and quantity > 0
       order by expirydate asc, inventorydetailid asc
       for update
    loop
      exit when _need <= 0;
      _take := least(_need, _b.quantity);
      perform set_config('app.txn_type','sale',true);
      perform set_config('app.txn_src_loc', _hdr.sourcelocationid::text, true);
      update public.inventorydetails set quantity = quantity - _take where inventorydetailid = _b.inventorydetailid;
      _line_cogs := _line_cogs + (_take * _b.costprice);
      _need := _need - _take;
    end loop;

    if _need > 0 then
      raise exception 'Insufficient stock for item % at location % (short %)', _line.itemid, _hdr.sourcelocationid, _need;
    end if;

    update public.the_salesinvoicedetails set costprice = case when _line.quantity > 0 then _line_cogs/_line.quantity else 0 end
      where invoicedetailid = _line.invoicedetailid;
    _total_cogs := _total_cogs + _line_cogs;
  end loop;

  perform set_config('app.txn_type','',true);
  perform set_config('app.txn_src_loc','',true);
  perform set_config('app.txn_ref_type','',true);
  perform set_config('app.txn_ref_id','',true);

  _entry_no := 'SI-' || _invoice_id::text;
  insert into public.the_journalentries(entrynumber, entrydate, reference_type, reference_id, notes, created_by)
  values (_entry_no, _hdr.invoicedate, 'sales_invoice', _invoice_id, 'Auto: sale ' || _hdr.invoicenumber, auth.uid())
  returning entryid into _entry_id;

  insert into public.the_journalentrylines(entryid, accountid, debit, credit, notes) values
    (_entry_id, _hdr.receivable_accountid, _total_rev, 0, 'AR customer'),
    (_entry_id, _hdr.revenue_accountid, 0, _total_rev, 'Sales revenue'),
    (_entry_id, _hdr.cogs_accountid, _total_cogs, 0, 'COGS'),
    (_entry_id, _hdr.inventory_accountid, 0, _total_cogs, 'Inventory issue');

  perform public.post_journal_entry(_entry_id);

  update public.the_salesinvoice set status='posted', postedat=now(),
         totalamount=_total_rev, totalcogs=_total_cogs where invoiceid=_invoice_id;
end $$;

-- Extend ledger transaction types via check (we currently have no constraint? leave as text).
-- Allow ledger types: purchase_receive, sale, transfer_in, transfer_out, adjustment, receive
-- log_inventory_change already infers type from session var.
