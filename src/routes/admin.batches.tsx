import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtDate, fmtQty, fmtMoney, daysUntil } from "@/lib/format";
import { AlertTriangle, Info } from "lucide-react";

export const Route = createFileRoute("/admin/batches")({ component: BatchesPage });

type Row = {
  inventorydetailid: number; itemid: number; locationid: number;
  batchnumber: string; barcode: string | null; expirydate: string;
  quantity: number; costprice: number; receiveddate: string;
  the_items: { itemcode: string; itemname: string } | null;
  the_storagelocations: { locationname: string } | null;
};

function BatchesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("inventorydetails")
      .select("*, the_items(itemcode,itemname), the_storagelocations(locationname)")
      .order("expirydate", { ascending: true }).limit(500);
    setRows((data ?? []) as any);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.batchnumber.toLowerCase().includes(s) ||
      r.barcode?.toLowerCase().includes(s) ||
      r.the_items?.itemcode.toLowerCase().includes(s) ||
      r.the_items?.itemname.toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function adjust(r: Row) {
    const raw = prompt(
      `Adjust batch ${r.batchnumber} (${r.the_items?.itemcode}).\nCurrent qty: ${r.quantity}\nEnter delta (+ to add, − to remove):`,
      "0"
    );
    if (raw == null) return;
    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) return;
    const reason = prompt("Reason / note (audit trail):", "stock count adjustment");
    if (reason == null) return;
    const newQty = Number(r.quantity) + delta;
    if (newQty < 0) return toast.error("Cannot go below zero");
    // Tag the ledger row so it's an audit-trail adjustment, not a silent edit
    try {
      await (supabase as any).rpc("set_config", { setting_name: "app.txn_type", new_value: "adjustment", is_local: true });
      await (supabase as any).rpc("set_config", { setting_name: "app.txn_ref_type", new_value: "manual_adjustment", is_local: true });
    } catch { /* set_config rpc may not exist; trigger will fall back to 'adjustment' */ }
    const { error } = await supabase.from("inventorydetails")
      .update({ quantity: newQty, notes: reason })
      .eq("inventorydetailid", r.inventorydetailid);
    if (error) return toast.error(error.message);
    toast.success(`Adjusted by ${delta > 0 ? "+" : ""}${delta}`);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="rounded border border-border bg-card p-2 text-xs flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 text-primary" />
        <div>
          <div className="font-semibold">Batches are read-only here.</div>
          <div className="text-muted-foreground">
            Stock enters the system through <span className="font-medium">Purchase Invoices</span> only.
            Use the Adjust button below for audited corrections (stock counts, damage, expiry write-off).
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Scan barcode or search item / batch…"
          className="flex-1 rounded border border-input bg-card px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} batches</span>
      </div>

      <div className="rounded border border-border bg-card overflow-auto">
        <table className="dense w-full">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th>Item</th><th>Batch</th><th>Barcode</th><th>Expiry</th>
              <th className="text-right">Qty</th><th className="text-right">Cost</th>
              <th>Location</th><th>Received</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const d = daysUntil(r.expirydate);
              return (
                <tr key={r.inventorydetailid} className="border-t border-border">
                  <td><span className="font-mono">{r.the_items?.itemcode}</span> {r.the_items?.itemname}</td>
                  <td className="font-mono">{r.batchnumber}</td>
                  <td className="font-mono text-xs">{r.barcode ?? "—"}</td>
                  <td className={d < 0 ? "text-destructive font-medium" : d <= 90 ? "text-warning font-medium" : ""}>
                    {fmtDate(r.expirydate)} {d < 0 && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                  </td>
                  <td className="text-right font-mono">{fmtQty(r.quantity)}</td>
                  <td className="text-right font-mono">{fmtMoney(r.costprice)}</td>
                  <td>{r.the_storagelocations?.locationname}</td>
                  <td>{fmtDate(r.receiveddate)}</td>
                  <td className="text-right">
                    <button onClick={() => adjust(r)} className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent">
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-6 text-center text-muted-foreground text-xs">No batches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
