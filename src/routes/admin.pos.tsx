import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney, fmtQty } from "@/lib/format";
import { Trash2, ScanLine } from "lucide-react";

export const Route = createFileRoute("/admin/pos")({ component: PosPage });

type Loc = { locationid: number; locationcode: string; locationname: string };
type Account = { accountid: number; accountcode: string; accountname: string; accounttype: string };
type Customer = { customerid: number; customercode: string; customername: string; receivable_accountid: number | null };
type CartLine = {
  itemid: number; itemcode: string; itemname: string;
  quantity: number; saleprice: number; available: number;
};

function PosPage() {
  const [locs, setLocs] = useState<Loc[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locId, setLocId] = useState<number | "">("");
  const [revAcct, setRevAcct] = useState<number | "">("");
  const [invAcct, setInvAcct] = useState<number | "">("");
  const [cogsAcct, setCogsAcct] = useState<number | "">("");
  const [cashAcct, setCashAcct] = useState<number | "">("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [scan, setScan] = useState("");
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [l, a, c] = await Promise.all([
        supabase.from("the_storagelocations").select("locationid,locationcode,locationname").order("locationcode"),
        (supabase as any).from("the_accounts").select("accountid,accountcode,accountname,accounttype").eq("allowposting", true).order("accountcode"),
        (supabase as any).from("the_customers").select("customerid,customercode,customername,receivable_accountid").order("customercode"),
      ]);
      const ls = (l.data ?? []) as Loc[]; setLocs(ls); if (ls[0]) setLocId(ls[0].locationid);
      const as = (a.data ?? []) as Account[]; setAccounts(as);
      setRevAcct(as.find(x => x.accounttype === "revenue")?.accountid ?? "");
      const assets = as.filter(x => x.accounttype === "asset");
      setInvAcct(assets[0]?.accountid ?? "");
      setCashAcct(assets[0]?.accountid ?? "");
      setCogsAcct(as.find(x => x.accounttype === "expense")?.accountid ?? "");
      setCustomers((c.data ?? []) as Customer[]);
    })();
    scanRef.current?.focus();
  }, []);

  async function lookup(code: string) {
    const term = code.trim();
    if (!term || !locId) return;
    // Try barcode/itemcode/batch — pick best available batch
    const { data: byBatch } = await supabase
      .from("inventorydetails")
      .select("itemid,quantity,barcode,batchnumber,locationid,the_items(itemid,itemcode,itemname)")
      .eq("locationid", locId).gt("quantity", 0)
      .or(`barcode.eq.${term},batchnumber.eq.${term}`)
      .limit(1);
    let item: any = null;
    let avail = 0;
    if (byBatch && byBatch.length) {
      item = (byBatch[0] as any).the_items;
      // sum available across all batches at this location for that item
      const { data: sums } = await supabase.from("inventorydetails")
        .select("quantity").eq("itemid", item.itemid).eq("locationid", locId);
      avail = (sums ?? []).reduce((s: number, r: any) => s + Number(r.quantity), 0);
    } else {
      const { data: it } = await (supabase as any).from("the_items")
        .select("itemid,itemcode,itemname").eq("itemcode", term).limit(1);
      if (it && it.length) {
        item = it[0];
        const { data: sums } = await supabase.from("inventorydetails")
          .select("quantity").eq("itemid", item.itemid).eq("locationid", locId);
        avail = (sums ?? []).reduce((s: number, r: any) => s + Number(r.quantity), 0);
      }
    }
    if (!item) return toast.error(`Not found: ${term}`);
    if (avail <= 0) return toast.error(`Out of stock: ${item.itemname}`);
    const { data: det } = await (supabase as any).from("the_itemdetails")
      .select("saleprice,isdefaultsaleunit").eq("itemid", item.itemid).order("isdefaultsaleunit", { ascending: false }).limit(1);
    const sp = Number(det?.[0]?.saleprice ?? 0);
    setCart(c => {
      const idx = c.findIndex(l => l.itemid === item.itemid);
      if (idx >= 0) {
        const next = [...c];
        if (next[idx].quantity + 1 > avail) { toast.error("Exceeds available stock"); return c; }
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1, available: avail };
        return next;
      }
      return [...c, { itemid: item.itemid, itemcode: item.itemcode, itemname: item.itemname,
        quantity: 1, saleprice: sp, available: avail }];
    });
    setScan("");
  }

  function setQty(i: number, q: number) {
    setCart(c => c.map((l, idx) => idx === i
      ? { ...l, quantity: Math.max(0, Math.min(q, l.available)) } : l));
  }
  function setPrice(i: number, p: number) {
    setCart(c => c.map((l, idx) => idx === i ? { ...l, saleprice: Math.max(0, p) } : l));
  }
  function remove(i: number) { setCart(c => c.filter((_, idx) => idx !== i)); }

  const total = useMemo(() => cart.reduce((s, l) => s + l.quantity * l.saleprice, 0), [cart]);

  async function complete() {
    if (!cart.length) return;
    if (!locId || !revAcct || !invAcct || !cogsAcct || !cashAcct)
      return toast.error("Select location and accounts first");
    setBusy(true);
    try {
      const num = `POS-${Date.now()}`;
      const cust = customers.find(c => c.customerid === customerId);
      const debitAcct = cust?.receivable_accountid ?? Number(cashAcct);
      const { data: inv, error } = await (supabase as any).from("the_salesinvoice").insert({
        invoicenumber: num, customerid: customerId || null, sourcelocationid: locId,
        revenue_accountid: revAcct, inventory_accountid: invAcct,
        cogs_accountid: cogsAcct, receivable_accountid: debitAcct,
      }).select().single();
      if (error) throw error;
      const lines = cart.filter(l => l.quantity > 0).map(l => ({
        invoiceid: inv.invoiceid, itemid: l.itemid, quantity: l.quantity, saleprice: l.saleprice,
      }));
      const ld = await (supabase as any).from("the_salesinvoicedetails").insert(lines);
      if (ld.error) throw ld.error;
      const { error: pe } = await (supabase as any).rpc("post_sales_invoice", { _invoice_id: inv.invoiceid });
      if (pe) throw pe;
      toast.success(`Sale ${num} complete · ${fmtMoney(total)}`);
      setCart([]); setCustomerId(""); setScan("");
      scanRef.current?.focus();
    } catch (e: any) {
      toast.error(e.message ?? "Sale failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-2 h-[calc(100vh-72px)]">
      <div className="flex flex-col gap-2 overflow-hidden">
        <div className="rounded border border-border bg-card p-2 grid grid-cols-5 gap-2 text-xs">
          <label>Location
            <select value={locId} onChange={e => setLocId(Number(e.target.value))}
              className="block w-full bg-background border border-border rounded px-1 py-0.5">
              {locs.map(l => <option key={l.locationid} value={l.locationid}>{l.locationcode} {l.locationname}</option>)}
            </select>
          </label>
          <label>Cash acct
            <select value={cashAcct} onChange={e => setCashAcct(Number(e.target.value))}
              className="block w-full bg-background border border-border rounded px-1 py-0.5">
              {accounts.filter(a => a.accounttype === "asset").map(a =>
                <option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
            </select>
          </label>
          <label>Revenue
            <select value={revAcct} onChange={e => setRevAcct(Number(e.target.value))}
              className="block w-full bg-background border border-border rounded px-1 py-0.5">
              {accounts.filter(a => a.accounttype === "revenue").map(a =>
                <option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
            </select>
          </label>
          <label>Inventory
            <select value={invAcct} onChange={e => setInvAcct(Number(e.target.value))}
              className="block w-full bg-background border border-border rounded px-1 py-0.5">
              {accounts.filter(a => a.accounttype === "asset").map(a =>
                <option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
            </select>
          </label>
          <label>COGS
            <select value={cogsAcct} onChange={e => setCogsAcct(Number(e.target.value))}
              className="block w-full bg-background border border-border rounded px-1 py-0.5">
              {accounts.filter(a => a.accounttype === "expense").map(a =>
                <option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
            </select>
          </label>
        </div>

        <form onSubmit={e => { e.preventDefault(); lookup(scan); }}
          className="flex items-center gap-2 rounded border border-border bg-card p-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <input
            ref={scanRef}
            value={scan} onChange={e => setScan(e.target.value)}
            placeholder="Scan barcode / type item code or batch then Enter…"
            className="flex-1 bg-transparent text-sm outline-none font-mono"
          />
          <kbd className="text-[10px] text-muted-foreground">Enter</kbd>
        </form>

        <div className="flex-1 overflow-auto rounded border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted text-left">
              <tr>
                <th className="px-2 py-1">Item</th>
                <th className="px-2 py-1 w-24 text-right">Avail</th>
                <th className="px-2 py-1 w-24 text-right">Qty</th>
                <th className="px-2 py-1 w-28 text-right">Price</th>
                <th className="px-2 py-1 w-28 text-right">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((l, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1"><span className="font-mono">{l.itemcode}</span> {l.itemname}</td>
                  <td className="px-2 py-1 text-right font-mono text-muted-foreground">{fmtQty(l.available)}</td>
                  <td className="px-2 py-1">
                    <input type="number" step="1" min="0" max={l.available} value={l.quantity}
                      onChange={e => setQty(i, Number(e.target.value))}
                      className="w-full bg-transparent text-right outline-none font-mono" />
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" step="0.01" min="0" value={l.saleprice}
                      onChange={e => setPrice(i, Number(e.target.value))}
                      className="w-full bg-transparent text-right outline-none font-mono" />
                  </td>
                  <td className="px-2 py-1 text-right font-mono">{fmtMoney(l.quantity * l.saleprice)}</td>
                  <td className="text-center">
                    <button onClick={() => remove(i)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">
                  Scan an item to begin. No customer needed.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="flex flex-col gap-2 rounded border border-border bg-card p-3 text-sm">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
        <div className="font-mono text-3xl">{fmtMoney(total)}</div>
        <div className="text-xs text-muted-foreground">{cart.reduce((s, l) => s + l.quantity, 0)} items</div>

        <label className="text-xs mt-2">Customer (optional)
          <select value={customerId} onChange={e => setCustomerId(e.target.value ? Number(e.target.value) : "")}
            className="block w-full bg-background border border-border rounded px-1 py-1 text-sm">
            <option value="">Walk-in (cash)</option>
            {customers.map(c => <option key={c.customerid} value={c.customerid}>{c.customercode} {c.customername}</option>)}
          </select>
        </label>

        <button
          onClick={complete} disabled={busy || !cart.length}
          className="mt-auto rounded bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-40">
          {busy ? "Posting…" : "Complete sale (F9)"}
        </button>
        <button onClick={() => { setCart([]); setCustomerId(""); }}
          className="rounded border border-border py-1 text-xs hover:bg-accent">Clear</button>
      </aside>
    </div>
  );
}
