import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { fmtDate, fmtQty, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/batches")({ component: BatchesPage });

type Item = { itemid: number; itemcode: string; itemname: string };
type Loc = { locationid: number; locationname: string };

function BatchesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    itemid: "", locationid: "", batchnumber: "", barcode: "",
    expirydate: "", quantity: "", costprice: "", receiveddate: new Date().toISOString().slice(0, 10),
  });

  async function load() {
    const { data } = await supabase.from("inventorydetails")
      .select("*, the_items(itemcode,itemname), the_storagelocations(locationname)")
      .order("created_at", { ascending: false }).limit(300);
    setRows(data ?? []);
  }

  useEffect(() => {
    load();
    supabase.from("the_items").select("itemid,itemcode,itemname").order("itemcode").then(({ data }) => setItems(data ?? []));
    supabase.from("the_storagelocations").select("locationid,locationname").then(({ data }) => setLocs(data ?? []));
  }, []);

  async function addBatch(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      itemid: Number(form.itemid),
      locationid: Number(form.locationid),
      batchnumber: form.batchnumber,
      barcode: form.barcode || null,
      expirydate: form.expirydate,
      quantity: Number(form.quantity),
      costprice: Number(form.costprice),
      receiveddate: form.receiveddate,
    };
    const { error } = await supabase.from("inventorydetails").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Batch added");
    setForm({ ...form, batchnumber: "", barcode: "", expirydate: "", quantity: "", costprice: "" });
    load();
  }

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Receive Batch</h1>
      <form onSubmit={addBatch} className="rounded border border-border bg-card p-3">
        <div className="grid grid-cols-8 gap-2 text-xs">
          <L label="Item" col="col-span-2">
            <select required value={form.itemid} onChange={(e) => setForm({ ...form, itemid: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1">
              <option value="">—</option>
              {items.map((i) => <option key={i.itemid} value={i.itemid}>{i.itemcode} · {i.itemname}</option>)}
            </select>
          </L>
          <L label="Location">
            <select required value={form.locationid} onChange={(e) => setForm({ ...form, locationid: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1">
              <option value="">—</option>
              {locs.map((l) => <option key={l.locationid} value={l.locationid}>{l.locationname}</option>)}
            </select>
          </L>
          <L label="Batch #"><input required value={form.batchnumber} onChange={(e) => setForm({ ...form, batchnumber: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1 font-mono" /></L>
          <L label="Barcode"><input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1 font-mono" /></L>
          <L label="Expiry"><input required type="date" value={form.expirydate} onChange={(e) => setForm({ ...form, expirydate: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1" /></L>
          <L label="Quantity"><input required type="number" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1 text-right font-mono" /></L>
          <L label="Cost"><input required type="number" step="0.0001" value={form.costprice} onChange={(e) => setForm({ ...form, costprice: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1 text-right font-mono" /></L>
        </div>
        <button type="submit" className="mt-2 flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3 w-3" /> Add batch <kbd className="ml-1">Enter</kbd>
        </button>
      </form>

      <div className="rounded border border-border bg-card overflow-auto">
        <table className="dense w-full">
          <thead className="bg-muted text-muted-foreground">
            <tr><th>Item</th><th>Batch</th><th>Barcode</th><th>Expiry</th><th className="text-right">Qty</th><th className="text-right">Cost</th><th>Location</th><th>Received</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.inventorydetailid} className="border-t border-border">
                <td><span className="font-mono">{r.the_items?.itemcode}</span> {r.the_items?.itemname}</td>
                <td className="font-mono">{r.batchnumber}</td>
                <td className="font-mono text-xs">{r.barcode ?? "—"}</td>
                <td>{fmtDate(r.expirydate)}</td>
                <td className="text-right font-mono">{fmtQty(r.quantity)}</td>
                <td className="text-right font-mono">{fmtMoney(r.costprice)}</td>
                <td>{r.the_storagelocations?.locationname}</td>
                <td>{fmtDate(r.receiveddate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function L({ label, children, col }: { label: string; children: React.ReactNode; col?: string }) {
  return (
    <label className={`block ${col ?? ""}`}>
      <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
