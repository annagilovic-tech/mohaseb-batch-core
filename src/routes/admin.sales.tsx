import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/admin/sales")({ component: SalesPage });

type Inv = {
  invoiceid: number; invoicenumber: string; invoicedate: string; customerid: number | null;
  sourcelocationid: number; revenue_accountid: number; receivable_accountid: number;
  inventory_accountid: number; cogs_accountid: number;
  totalamount: number; totalcogs: number; status: string; postedat: string | null;
};
type Detail = { invoicedetailid?: number; invoiceid?: number; itemid: number;
  quantity: number; saleprice: number; costprice: number };
type Item = { itemid: number; itemcode: string; itemname: string };
type Loc = { locationid: number; locationcode: string; locationname: string };
type Customer = { customerid: number; customercode: string; customername: string; receivable_accountid: number | null };
type Account = { accountid: number; accountcode: string; accountname: string; accounttype: string };

function SalesPage() {
  const [invs, setInvs] = useState<Inv[]>([]);
  const [sel, setSel] = useState<Inv | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  async function loadInvs() {
    const { data } = await (supabase as any).from("the_salesinvoice")
      .select("*").order("invoiceid", { ascending: false }).limit(200);
    setInvs(data ?? []);
  }
  async function loadDetails(id: number) {
    const { data } = await (supabase as any).from("the_salesinvoicedetails")
      .select("*").eq("invoiceid", id).order("invoicedetailid");
    setDetails(data ?? []);
  }
  useEffect(() => {
    loadInvs();
    (supabase as any).from("the_items").select("itemid,itemcode,itemname").order("itemcode").limit(2000)
      .then(({ data }: any) => setItems(data ?? []));
    (supabase as any).from("the_storagelocations").select("locationid,locationcode,locationname").order("locationcode")
      .then(({ data }: any) => setLocs(data ?? []));
    (supabase as any).from("the_customers").select("customerid,customercode,customername,receivable_accountid").order("customercode")
      .then(({ data }: any) => setCustomers(data ?? []));
    (supabase as any).from("the_accounts").select("accountid,accountcode,accountname,accounttype")
      .eq("allowposting",true).order("accountcode").then(({ data }: any) => setAccounts(data ?? []));
  }, []);

  async function newInv() {
    if (!locs.length) return toast.error("Create a location first");
    const rev = accounts.find(a => a.accounttype === "revenue");
    const ar = accounts.find(a => a.accounttype === "asset");
    const inv = accounts.find(a => a.accounttype === "asset");
    const cogs = accounts.find(a => a.accounttype === "expense");
    if (!rev || !ar || !inv || !cogs) return toast.error("Need revenue, asset, expense accounts");
    const num = prompt("Invoice number:", `SI-${Date.now()}`); if (!num) return;
    const { data, error } = await (supabase as any).from("the_salesinvoice").insert({
      invoicenumber: num, customerid: null, sourcelocationid: locs[0].locationid,
      revenue_accountid: rev.accountid, inventory_accountid: inv.accountid, cogs_accountid: cogs.accountid,
      receivable_accountid: ar.accountid,
    }).select().single();
    if (error) return toast.error(error.message);
    await loadInvs(); setSel(data); setDetails([]);
  }
  async function updateInv(patch: Partial<Inv>) {
    if (!sel || sel.status !== "draft") return;
    const { error } = await (supabase as any).from("the_salesinvoice").update(patch).eq("invoiceid", sel.invoiceid);
    if (error) return toast.error(error.message);
    setSel({ ...sel, ...patch });
  }
  async function addLine() {
    if (!sel || !items.length) return;
    const { error } = await (supabase as any).from("the_salesinvoicedetails").insert({
      invoiceid: sel.invoiceid, itemid: items[0].itemid, quantity: 1, saleprice: 0,
    });
    if (error) return toast.error(error.message);
    loadDetails(sel.invoiceid);
  }
  async function updLine(d: Detail, patch: Partial<Detail>) {
    const { error } = await (supabase as any).from("the_salesinvoicedetails").update(patch)
      .eq("invoicedetailid", d.invoicedetailid);
    if (error) return toast.error(error.message);
    loadDetails(sel!.invoiceid);
  }
  async function delLine(d: Detail) {
    await (supabase as any).from("the_salesinvoicedetails").delete().eq("invoicedetailid", d.invoicedetailid);
    loadDetails(sel!.invoiceid);
  }
  async function post() {
    if (!sel) return;
    const { error } = await (supabase as any).rpc("post_sales_invoice", { _invoice_id: sel.invoiceid });
    if (error) return toast.error(error.message);
    toast.success("Posted");
    await loadInvs();
    const r = (await (supabase as any).from("the_salesinvoice").select("*").eq("invoiceid", sel.invoiceid).single()).data;
    setSel(r);
  }
  const total = details.reduce((s, d) => s + Number(d.quantity) * Number(d.saleprice), 0);

  return (
    <div className="grid grid-cols-[280px_1fr] gap-2 h-[calc(100vh-72px)]">
      <div className="overflow-auto rounded border border-border">
        <div className="flex items-center justify-between p-1 sticky top-0 bg-muted">
          <span className="text-xs font-semibold">Sales invoices</span>
          <button onClick={newInv} className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">+ New</button>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {invs.map(i => (
              <tr key={i.invoiceid} onClick={() => { setSel(i); loadDetails(i.invoiceid); }}
                className={`cursor-pointer border-t border-border ${sel?.invoiceid===i.invoiceid?"bg-accent":""}`}>
                <td className="px-2 py-0.5 font-mono">{i.invoicenumber}</td>
                <td className="px-2 py-0.5">{fmtDate(i.invoicedate)}</td>
                <td className="px-2 py-0.5 text-right">{fmtMoney(i.totalamount)}</td>
                <td className={`px-2 py-0.5 ${i.status==="posted"?"text-green-600":"text-muted-foreground"}`}>{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 overflow-hidden">
        {sel ? (
          <>
            <div className="grid grid-cols-3 gap-2 rounded border border-border p-2 text-xs">
              <label>Customer <span className="text-muted-foreground">(optional · walk-in if empty)</span>
                <select disabled={sel.status!=="draft"} value={sel.customerid ?? ""}
                  onChange={e=>updateInv({customerid: e.target.value ? Number(e.target.value) : null})}
                  className="block w-full bg-background border border-border rounded px-1 py-0.5">
                  <option value="">— Walk-in (cash) —</option>
                  {customers.map(c=><option key={c.customerid} value={c.customerid}>{c.customercode} {c.customername}</option>)}
                </select>
              </label>
              <label>Source location
                <select disabled={sel.status!=="draft"} value={sel.sourcelocationid}
                  onChange={e=>updateInv({sourcelocationid:Number(e.target.value)})}
                  className="block w-full bg-background border border-border rounded px-1 py-0.5">
                  {locs.map(l=><option key={l.locationid} value={l.locationid}>{l.locationcode} {l.locationname}</option>)}
                </select>
              </label>
              <label>Revenue acct
                <select disabled={sel.status!=="draft"} value={sel.revenue_accountid}
                  onChange={e=>updateInv({revenue_accountid:Number(e.target.value)})}
                  className="block w-full bg-background border border-border rounded px-1 py-0.5">
                  {accounts.filter(a=>a.accounttype==="revenue").map(a=><option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                </select>
              </label>
              <label>AR acct
                <select disabled={sel.status!=="draft"} value={sel.receivable_accountid}
                  onChange={e=>updateInv({receivable_accountid:Number(e.target.value)})}
                  className="block w-full bg-background border border-border rounded px-1 py-0.5">
                  {accounts.filter(a=>a.accounttype==="asset").map(a=><option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                </select>
              </label>
              <label>Inventory acct
                <select disabled={sel.status!=="draft"} value={sel.inventory_accountid}
                  onChange={e=>updateInv({inventory_accountid:Number(e.target.value)})}
                  className="block w-full bg-background border border-border rounded px-1 py-0.5">
                  {accounts.filter(a=>a.accounttype==="asset").map(a=><option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                </select>
              </label>
              <label>COGS acct
                <select disabled={sel.status!=="draft"} value={sel.cogs_accountid}
                  onChange={e=>updateInv({cogs_accountid:Number(e.target.value)})}
                  className="block w-full bg-background border border-border rounded px-1 py-0.5">
                  {accounts.filter(a=>a.accounttype==="expense").map(a=><option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono font-semibold">{sel.invoicenumber}</span>
              <span>{fmtDate(sel.invoicedate)}</span>
              <span className="ml-auto">Total {fmtMoney(total)}</span>
              {sel.status==="draft" && <>
                <button onClick={addLine} className="rounded border px-2 py-0.5">+ Line</button>
                <button onClick={post} disabled={!details.length}
                  className="rounded bg-primary px-2 py-0.5 text-primary-foreground disabled:opacity-40">Post (FIFO)</button>
              </>}
              {sel.status==="posted" && <span className="text-green-600">
                Posted {fmtDate(sel.postedat)} · COGS {fmtMoney(sel.totalcogs)}
              </span>}
            </div>
            <div className="overflow-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-2 py-1">Item</th>
                    <th className="px-2 py-1 w-24 text-right">Qty</th>
                    <th className="px-2 py-1 w-28 text-right">Sale price</th>
                    <th className="px-2 py-1 w-28 text-right">Total</th>
                    <th className="px-2 py-1 w-28 text-right">Cost (post)</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {details.map(d => (
                    <tr key={d.invoicedetailid} className="border-t border-border">
                      <td className="px-2 py-0.5">
                        <select value={d.itemid} disabled={sel.status!=="draft"}
                          onChange={e=>updLine(d,{itemid:Number(e.target.value)})}
                          className="w-full bg-transparent outline-none">
                          {items.map(i=><option key={i.itemid} value={i.itemid}>{i.itemcode} {i.itemname}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-0.5"><input type="number" step="0.001" defaultValue={d.quantity} disabled={sel.status!=="draft"}
                        onBlur={e=>updLine(d,{quantity:Number(e.target.value)})} className="w-full bg-transparent text-right outline-none"/></td>
                      <td className="px-2 py-0.5"><input type="number" step="0.0001" defaultValue={d.saleprice} disabled={sel.status!=="draft"}
                        onBlur={e=>updLine(d,{saleprice:Number(e.target.value)})} className="w-full bg-transparent text-right outline-none"/></td>
                      <td className="px-2 py-0.5 text-right">{fmtMoney(Number(d.quantity)*Number(d.saleprice))}</td>
                      <td className="px-2 py-0.5 text-right text-muted-foreground">{fmtMoney(d.costprice)}</td>
                      <td className="text-center">{sel.status==="draft" && <button onClick={()=>delLine(d)} className="text-destructive">×</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <div className="p-4 text-xs text-muted-foreground">Select or create a sales invoice.</div>}
      </div>
    </div>
  );
}
