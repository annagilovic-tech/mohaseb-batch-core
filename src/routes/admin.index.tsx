import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtQty, fmtMoney, fmtDate, daysUntil } from "@/lib/format";
import { Search, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: InventoryPage });

type Row = {
  inventorydetailid: number;
  itemid: number;
  locationid: number;
  batchnumber: string;
  barcode: string | null;
  expirydate: string;
  quantity: number;
  costprice: number;
  the_items: { itemcode: string; itemname: string; itemnamear: string | null } | null;
  the_storagelocations: { locationcode: string; locationname: string } | null;
};

function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState<number | "">("");
  const [locs, setLocs] = useState<{ locationid: number; locationname: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data } = await supabase
      .from("inventorydetails")
      .select("*, the_items(itemcode,itemname,itemnamear), the_storagelocations(locationcode,locationname)")
      .order("expirydate", { ascending: true })
      .limit(500);
    setRows((data ?? []) as any);
  }

  useEffect(() => {
    load();
    supabase.from("the_storagelocations").select("locationid,locationname").then(({ data }) => setLocs(data ?? []));
    const ch = supabase.channel("inv").on("postgres_changes",
      { event: "*", schema: "public", table: "inventorydetails" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Keyboard shortcut: focus search on "/"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (loc !== "" && r.locationid !== loc) return false;
      if (!s) return true;
      return (
        r.barcode?.toLowerCase().includes(s) ||
        r.batchnumber.toLowerCase().includes(s) ||
        r.the_items?.itemname.toLowerCase().includes(s) ||
        r.the_items?.itemcode.toLowerCase().includes(s)
      );
    });
  }, [rows, q, loc]);

  const totals = useMemo(() => {
    const totalQty = filtered.reduce((s, r) => s + Number(r.quantity), 0);
    const totalCost = filtered.reduce((s, r) => s + Number(r.quantity) * Number(r.costprice), 0);
    const expiring = filtered.filter((r) => daysUntil(r.expirydate) <= 90).length;
    return { totalQty, totalCost, expiring, batches: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">Inventory — Batch view</h1>
        <span className="text-xs text-muted-foreground">Live · per-batch quantities</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Card label="Batches" value={String(totals.batches)} />
        <Card label="Total Qty" value={fmtQty(totals.totalQty)} />
        <Card label="Total Cost" value={fmtMoney(totals.totalCost)} />
        <Card label="Expiring ≤90d" value={String(totals.expiring)} accent />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Scan barcode or type item / batch…"
            className="w-full rounded border border-input bg-card pl-7 pr-2 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <kbd className="absolute right-2 top-1">/</kbd>
        </div>
        <select value={loc} onChange={(e) => setLoc(e.target.value ? Number(e.target.value) : "")}
          className="rounded border border-input bg-card px-2 py-1.5 text-sm">
          <option value="">All locations</option>
          {locs.map((l) => <option key={l.locationid} value={l.locationid}>{l.locationname}</option>)}
        </select>
      </div>

      <div className="rounded border border-border bg-card overflow-auto">
        <table className="dense w-full text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th>Code</th><th>Item</th><th>Batch</th><th>Barcode</th>
              <th>Expiry</th><th className="text-right">Qty</th>
              <th className="text-right">Cost</th><th>Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const d = daysUntil(r.expirydate);
              const expSoon = d <= 90;
              const expired = d < 0;
              return (
                <tr key={r.inventorydetailid} className="border-t border-border hover:bg-accent/30">
                  <td className="font-mono">{r.the_items?.itemcode}</td>
                  <td>{r.the_items?.itemname}</td>
                  <td className="font-mono">{r.batchnumber}</td>
                  <td className="font-mono text-xs">{r.barcode ?? "—"}</td>
                  <td className={expired ? "text-destructive font-medium" : expSoon ? "text-warning font-medium" : ""}>
                    {fmtDate(r.expirydate)}
                    {expired && <AlertTriangle className="inline ml-1 h-3 w-3" />}
                  </td>
                  <td className="text-right font-mono">{fmtQty(r.quantity)}</td>
                  <td className="text-right font-mono">{fmtMoney(r.costprice)}</td>
                  <td>{r.the_storagelocations?.locationname}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No batches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded border border-border bg-card p-2 ${accent ? "border-warning/60" : ""}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-base">{value}</div>
    </div>
  );
}
