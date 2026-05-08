import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtQty, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/ledger")({ component: LedgerPage });

const TYPES = [
  "", "receive", "transfer_out", "transfer_in", "sale", "sale_return",
  "purchase", "purchase_return", "adjustment", "write_off", "opening_balance",
];

function LedgerPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase.from("inventory_transactions")
      .select("*, the_items(itemcode,itemname), src:the_storagelocations!inventory_transactions_source_location_id_fkey(locationname), dest:the_storagelocations!inventory_transactions_destination_location_id_fkey(locationname)")
      .order("created_at", { ascending: false }).limit(500);
    if (type) query = query.eq("transaction_type", type);
    const { data } = await query;
    let r = data ?? [];
    if (q.trim()) {
      const t = q.toLowerCase();
      r = r.filter((x: any) =>
        x.the_items?.itemcode?.toLowerCase().includes(t) ||
        x.the_items?.itemname?.toLowerCase().includes(t) ||
        String(x.reference_id ?? "").includes(t));
    }
    setRows(r);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">Inventory Transaction Ledger <span className="text-muted-foreground font-normal">(append-only)</span></h1>
        <div className="flex items-center gap-2 text-xs">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-input bg-background px-2 py-1">
            {TYPES.map((t) => <option key={t} value={t}>{t || "all types"}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="filter item / ref id" className="w-56 rounded border border-input bg-background px-2 py-1 font-mono" />
          <button onClick={load} className="rounded bg-primary px-2 py-1 text-primary-foreground hover:bg-primary/90">Refresh</button>
        </div>
      </div>

      <div className="rounded border border-border bg-card overflow-auto">
        <table className="dense w-full">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th>#</th><th>When</th><th>Type</th><th>Item</th>
              <th>Batch det.</th><th>From</th><th>To</th>
              <th className="text-right">Δ Qty</th><th className="text-right">Unit cost</th>
              <th>Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="p-3 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={10} className="p-3 text-center text-muted-foreground">No transactions</td></tr>}
            {rows.map((r) => {
              const delta = Number(r.quantity);
              return (
                <tr key={r.transaction_id} className="border-t border-border">
                  <td className="font-mono text-xs">{r.transaction_id}</td>
                  <td className="font-mono text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td><span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">{r.transaction_type}</span></td>
                  <td><span className="font-mono">{r.the_items?.itemcode}</span> {r.the_items?.itemname}</td>
                  <td className="font-mono text-xs">{r.inventory_detail_id ?? "—"}</td>
                  <td>{r.src?.locationname ?? "—"}</td>
                  <td>{r.dest?.locationname ?? "—"}</td>
                  <td className={`text-right font-mono ${delta < 0 ? "text-destructive" : "text-primary"}`}>{delta > 0 ? "+" : ""}{fmtQty(delta)}</td>
                  <td className="text-right font-mono">{fmtMoney(r.unit_cost)}</td>
                  <td className="font-mono text-xs">{r.reference_type ? `${r.reference_type}#${r.reference_id ?? ""}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
