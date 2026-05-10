-- 1) Walk-in sales: customer optional
ALTER TABLE public.the_salesinvoice ALTER COLUMN customerid DROP NOT NULL;

-- 2) Sale price on purchase lines (so receiving sets/updates retail price)
ALTER TABLE public.the_purchaseinvoicedetails
  ADD COLUMN IF NOT EXISTS saleprice numeric NOT NULL DEFAULT 0;

-- 3) Update purchase posting to propagate saleprice into item default sale unit
CREATE OR REPLACE FUNCTION public.post_purchase_invoice(_invoice_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _hdr record; _line record; _entry_id bigint; _entry_no text; _total numeric := 0; _dest_id bigint;
        _base_unit bigint; _det_id bigint;
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

    -- propagate sale price into default sale unit
    if coalesce(_line.saleprice,0) > 0 then
      select baseunitid into _base_unit from public.the_items where itemid = _line.itemid;
      if _base_unit is not null then
        select itemdetailid into _det_id from public.the_itemdetails
          where itemid = _line.itemid and isdefaultsaleunit = true limit 1;
        if _det_id is null then
          select itemdetailid into _det_id from public.the_itemdetails
            where itemid = _line.itemid and unitid = _base_unit limit 1;
        end if;
        if _det_id is null then
          insert into public.the_itemdetails(itemid, unitid, conversionfactor, saleprice, isdefaultsaleunit)
            values (_line.itemid, _base_unit, 1, _line.saleprice, true);
        else
          update public.the_itemdetails set saleprice = _line.saleprice where itemdetailid = _det_id;
        end if;
      end if;
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
end $function$;