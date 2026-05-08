import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/items")({ component: ItemsPage });

type Item = {
  itemid: number; itemcode: string; itemname: string; itemnamear: string | null;
  scientificname: string | null; manufacturer: string | null; category: string | null;
  baseunitid: number | null; reorderlevel: number; taxrate: number; isactive: boolean;
};
type Unit = { unitid: number; unitname: string };
type Detail = { itemdetailid?: number; itemid?: number; unitid: number; barcode: string | null;
  conversionfactor: number; saleprice: number; wholesaleprice: number; isdefaultsaleunit: boolean };

function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [sel, setSel] = useState<Item | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [q, setQ] = useState("");

  async function loadItems() {
    const { data } = await supabase.from("the_items").select("*").order("itemcode").limit(500);
    setItems((data ?? []) as any);
  }
  useEffect(() => {
    loadItems();
    supabase.from("the_units").select("unitid,unitname").then(({ data }) => setUnits(data ?? []));
  }, []);

  async function selectItem(it: Item) {
    setSel(it);
    const { data } = await supabase.from("the_itemdetails").select("*").eq("itemid", it.itemid);
    setDetails((data ?? []) as any);
  }

  async function newItem() {
    const code = prompt("Item code (e.g. PARA500):"); if (!code) return;
    const name = prompt("Item name:"); if (!name) return;
    const { data, error } = await supabase.from("the_items").insert({ itemcode: code, itemname: name }).select().single();
    if (error) return toast.error(error.message);
    await loadItems(); await selectItem(data as any);
  }

  async function saveItem() {
    if (!sel) return;
    const { error } = await supabase.from("the_items").update({
      itemname: sel.itemname, itemnamear: sel.itemnamear, scientificname: sel.scientificname,
      manufacturer: sel.manufacturer, category: sel.category, baseunitid: sel.baseunitid,
      reorderlevel: sel.reorderlevel, taxrate: sel.taxrate, isactive: sel.isactive,
    }).eq("itemid", sel.itemid);
    if (error) return toast.error(error.message);
    toast.success("Saved"); loadItems();
  }

  async function addDetail() {
    if (!sel) return;
    const newRow: Detail = { itemid: sel.itemid, unitid: units[0]?.unitid ?? 0, barcode: "", conversionfactor: 1, saleprice: 0, wholesaleprice: 0, isdefaultsaleunit: false };
    setDetails([...details, newRow]);
  }
  async function saveDetail(d: Detail) {
    if (!sel) return;
    const payload = { ...d, itemid: sel.itemid };
    if (d.itemdetailid) {
      const { error } = await supabase.from("the_itemdetails").update(payload).eq("itemdetailid", d.itemdetailid);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("the_itemdetails").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Unit saved"); selectItem(sel);
  }
  async function delDetail(id?: number) {
    if (!id) return setDetails(details.filter((d) => d.itemdetailid));
    if (!confirm("Remove unit?")) return;
    await supabase.from("the_itemdetails").delete().eq("itemdetailid", id);
    if (sel) selectItem(sel);
  }

  const filtered = items.filter((i) =>
    !q || i.itemcode.toLowerCase().includes(q.toLowerCase()) || i.itemname.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="grid grid-cols-[300px_1fr] gap-3">
      <div className="rounded border border-border bg-card">
        <div className="flex items-center gap-1 border-b border-border p-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…"
            className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm" />
          <button onClick={newItem} className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <div className="max-h-[calc(100vh-130px)] overflow-auto">
          <table className="dense w-full">
            <tbody>
              {filtered.map((i) => (
                <tr key={i.itemid} onClick={() => selectItem(i)}
                  className={`cursor-pointer border-b border-border ${sel?.itemid === i.itemid ? "bg-accent" : "hover:bg-accent/40"}`}>
                  <td className="font-mono text-xs">{i.itemcode}</td>
                  <td>{i.itemname}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border border-border bg-card p-3">
        {!sel ? <p className="text-muted-foreground">Select or create an item.</p> : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{sel.itemcode} — {sel.itemname}</h2>
              <button onClick={saveItem} className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90">Save</button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Field label="Code"><input value={sel.itemcode} disabled className="w-full rounded border border-input bg-muted px-2 py-1 font-mono" /></Field>
              <Field label="Name (EN)"><input value={sel.itemname} onChange={(e) => setSel({ ...sel, itemname: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1" /></Field>
              <Field label="Name (AR)"><input value={sel.itemnamear ?? ""} onChange={(e) => setSel({ ...sel, itemnamear: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1" dir="rtl" /></Field>
              <Field label="Scientific"><input value={sel.scientificname ?? ""} onChange={(e) => setSel({ ...sel, scientificname: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1" /></Field>
              <Field label="Manufacturer"><input value={sel.manufacturer ?? ""} onChange={(e) => setSel({ ...sel, manufacturer: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1" /></Field>
              <Field label="Category"><input value={sel.category ?? ""} onChange={(e) => setSel({ ...sel, category: e.target.value })} className="w-full rounded border border-input bg-background px-2 py-1" /></Field>
              <Field label="Base Unit">
                <select value={sel.baseunitid ?? ""} onChange={(e) => setSel({ ...sel, baseunitid: e.target.value ? Number(e.target.value) : null })}
                  className="w-full rounded border border-input bg-background px-2 py-1">
                  <option value="">—</option>
                  {units.map((u) => <option key={u.unitid} value={u.unitid}>{u.unitname}</option>)}
                </select>
              </Field>
              <Field label="Reorder Lvl"><input type="number" value={sel.reorderlevel} onChange={(e) => setSel({ ...sel, reorderlevel: Number(e.target.value) })} className="w-full rounded border border-input bg-background px-2 py-1 text-right font-mono" /></Field>
              <Field label="Tax %"><input type="number" value={sel.taxrate} onChange={(e) => setSel({ ...sel, taxrate: Number(e.target.value) })} className="w-full rounded border border-input bg-background px-2 py-1 text-right font-mono" /></Field>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Item Details (per unit)</h3>
              <button onClick={addDetail} className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs hover:bg-accent">
                <Plus className="h-3 w-3" /> Add unit
              </button>
            </div>
            <table className="dense mt-2 w-full">
              <thead className="bg-muted text-muted-foreground">
                <tr><th>Unit</th><th>Barcode</th><th className="text-right">Conv.</th><th className="text-right">Sale</th><th className="text-right">Wholesale</th><th>Default</th><th></th></tr>
              </thead>
              <tbody>
                {details.map((d, idx) => (
                  <tr key={d.itemdetailid ?? `new-${idx}`} className="border-t border-border">
                    <td>
                      <select value={d.unitid} onChange={(e) => { const c = [...details]; c[idx] = { ...d, unitid: Number(e.target.value) }; setDetails(c); }}
                        className="w-full rounded border border-input bg-background px-1 py-0.5">
                        {units.map((u) => <option key={u.unitid} value={u.unitid}>{u.unitname}</option>)}
                      </select>
                    </td>
                    <td><input value={d.barcode ?? ""} onChange={(e) => { const c = [...details]; c[idx] = { ...d, barcode: e.target.value }; setDetails(c); }} className="w-full rounded border border-input bg-background px-1 py-0.5 font-mono" /></td>
                    <td><input type="number" value={d.conversionfactor} onChange={(e) => { const c = [...details]; c[idx] = { ...d, conversionfactor: Number(e.target.value) }; setDetails(c); }} className="w-full rounded border border-input bg-background px-1 py-0.5 text-right font-mono" /></td>
                    <td><input type="number" value={d.saleprice} onChange={(e) => { const c = [...details]; c[idx] = { ...d, saleprice: Number(e.target.value) }; setDetails(c); }} className="w-full rounded border border-input bg-background px-1 py-0.5 text-right font-mono" /></td>
                    <td><input type="number" value={d.wholesaleprice} onChange={(e) => { const c = [...details]; c[idx] = { ...d, wholesaleprice: Number(e.target.value) }; setDetails(c); }} className="w-full rounded border border-input bg-background px-1 py-0.5 text-right font-mono" /></td>
                    <td className="text-center"><input type="checkbox" checked={d.isdefaultsaleunit} onChange={(e) => { const c = [...details]; c[idx] = { ...d, isdefaultsaleunit: e.target.checked }; setDetails(c); }} /></td>
                    <td className="flex gap-1">
                      <button onClick={() => saveDetail(d)} className="rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">Save</button>
                      <button onClick={() => delDetail(d.itemdetailid)} className="rounded bg-destructive px-1 py-0.5 text-destructive-foreground"><Trash2 className="h-3 w-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
