
revoke execute on function public.post_journal_entry(bigint) from public, anon;
revoke execute on function public.post_purchase_invoice(bigint) from public, anon;
revoke execute on function public.post_sales_invoice(bigint) from public, anon;

create or replace function public.post_journal_entry(_entry_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare _hdr record; _dr numeric; _cr numeric;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist')) then
    raise exception 'Not authorized to post journal entries';
  end if;
  select * into _hdr from public.the_journalentries where entryid = _entry_id for update;
  if not found then raise exception 'Journal entry % not found', _entry_id; end if;
  if _hdr.status <> 'draft' then raise exception 'Entry % is not draft (%)', _entry_id, _hdr.status; end if;
  select coalesce(sum(debit),0), coalesce(sum(credit),0) into _dr, _cr
    from public.the_journalentrylines where entryid = _entry_id;
  if _dr = 0 and _cr = 0 then raise exception 'Entry % has no lines', _entry_id; end if;
  if round(_dr,4) <> round(_cr,4) then raise exception 'Entry % unbalanced: debit=% credit=%', _entry_id,_dr,_cr; end if;
  if exists (select 1 from public.the_journalentrylines l join public.the_accounts a on a.accountid=l.accountid
             where l.entryid=_entry_id and a.allowposting=false) then
    raise exception 'Entry % references a non-posting account', _entry_id;
  end if;
  update public.the_journalentries set status='posted', postedat=now() where entryid=_entry_id;
end $$;

create or replace function public.post_purchase_invoice(_invoice_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare _hdr record; _line record; _entry_id bigint; _entry_no text; _total numeric := 0; _dest_id bigint;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist')) then
    raise exception 'Not authorized to post invoices';
  end if;
  select * into _hdr from public.the_purchaseinvoice where invoiceid = _invoice_id for update;
  if not found then raise exception 'Purchase invoice % not found', _invoice_id; end if;
  if _hdr.status <> 'draft' then raise exception 'Invoice % not draft (%)', _invoice_id, _hdr.status; end if;
  perform set_config('app.txn_ref_type', 'purchase_invoice', true);
  perform set_config('app.txn_ref_id', _invoice_id::text, true);
  for _line in select * from public.the_purchaseinvoicedetails where invoiceid = _invoice_id loop
    _total := _total + (_line.quantity * _line.costprice);
    perform set_config('app.txn_type','purchase_receive',true);
    perform set_config('app.txn_src_loc','',true);
    select inventorydetailid into _dest_id from public.inventorydetails
      where itemid=_line.itemid and locationid=_hdr.destinationlocationid and batchnumber=_line.batchnumber for update;
    if _dest_id is null then
      insert into public.inventorydetails(itemid, locationid, batchnumber, barcode, expirydate, quantity, costprice, receiveddate)
      values (_line.itemid,_hdr.destinationlocationid,_line.batchnumber,_line.barcode,_line.expirydate,_line.quantity,_line.costprice,_hdr.invoicedate);
    else
      update public.inventorydetails set quantity = quantity + _line.quantity, costprice = _line.costprice
        where inventorydetailid = _dest_id;
    end if;
  end loop;
  perform set_config('app.txn_type','',true);
  perform set_config('app.txn_ref_type','',true);
  perform set_config('app.txn_ref_id','',true);
  _entry_no := 'PI-' || _invoice_id::text;
  insert into public.the_journalentries(entrynumber, entrydate, reference_type, reference_id, notes, created_by)
  values (_entry_no, _hdr.invoicedate, 'purchase_invoice', _invoice_id, 'Auto: purchase '||_hdr.invoicenumber, auth.uid())
  returning entryid into _entry_id;
  insert into public.the_journalentrylines(entryid, accountid, debit, credit, notes) values
    (_entry_id, _hdr.inventory_accountid, _total, 0, 'Inventory receipt'),
    (_entry_id, _hdr.payable_accountid, 0, _total, 'AP supplier');
  perform public.post_journal_entry(_entry_id);
  update public.the_purchaseinvoice set status='posted', postedat=now(), totalamount=_total where invoiceid=_invoice_id;
end $$;

create or replace function public.post_sales_invoice(_invoice_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare _hdr record; _line record; _b record; _need numeric; _take numeric;
        _line_cogs numeric; _total_rev numeric := 0; _total_cogs numeric := 0;
        _entry_id bigint; _entry_no text;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'pharmacist')) then
    raise exception 'Not authorized to post invoices';
  end if;
  select * into _hdr from public.the_salesinvoice where invoiceid = _invoice_id for update;
  if not found then raise exception 'Sales invoice % not found', _invoice_id; end if;
  if _hdr.status <> 'draft' then raise exception 'Invoice % not draft (%)', _invoice_id, _hdr.status; end if;
  perform set_config('app.txn_ref_type','sales_invoice',true);
  perform set_config('app.txn_ref_id', _invoice_id::text, true);
  for _line in select * from public.the_salesinvoicedetails where invoiceid = _invoice_id loop
    _need := _line.quantity; _line_cogs := 0;
    _total_rev := _total_rev + (_line.quantity * _line.saleprice);
    for _b in select * from public.inventorydetails
              where itemid = _line.itemid and locationid = _hdr.sourcelocationid and quantity > 0
              order by expirydate asc, inventorydetailid asc for update loop
      exit when _need <= 0;
      _take := least(_need, _b.quantity);
      perform set_config('app.txn_type','sale',true);
      perform set_config('app.txn_src_loc',_hdr.sourcelocationid::text,true);
      update public.inventorydetails set quantity = quantity - _take where inventorydetailid = _b.inventorydetailid;
      _line_cogs := _line_cogs + (_take * _b.costprice);
      _need := _need - _take;
    end loop;
    if _need > 0 then raise exception 'Insufficient stock for item % (short %)', _line.itemid, _need; end if;
    update public.the_salesinvoicedetails set costprice = case when _line.quantity>0 then _line_cogs/_line.quantity else 0 end
      where invoicedetailid = _line.invoicedetailid;
    _total_cogs := _total_cogs + _line_cogs;
  end loop;
  perform set_config('app.txn_type','',true);
  perform set_config('app.txn_src_loc','',true);
  perform set_config('app.txn_ref_type','',true);
  perform set_config('app.txn_ref_id','',true);
  _entry_no := 'SI-' || _invoice_id::text;
  insert into public.the_journalentries(entrynumber, entrydate, reference_type, reference_id, notes, created_by)
  values (_entry_no, _hdr.invoicedate, 'sales_invoice', _invoice_id, 'Auto: sale '||_hdr.invoicenumber, auth.uid())
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

revoke execute on function public.post_journal_entry(bigint) from public, anon;
revoke execute on function public.post_purchase_invoice(bigint) from public, anon;
revoke execute on function public.post_sales_invoice(bigint) from public, anon;
