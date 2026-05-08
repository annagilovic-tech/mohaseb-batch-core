import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Send } from "lucide-react";
import { fmtDate, fmtQty } from "@/lib/format";

export const Route = createFileRoute("/admin/transfers")({ component: TransfersPage });

type Loc = { locationid: number; locationname: string };
type Batch = { inventorydetailid: number; itemid: number; batchnumber: string; expirydate: string; quantity: number; costprice: number; the_items: { itemcode: string; itemname: string } | null };
type Line = { sourceinventorydetailid: number; itemid: number; batchnumber: string; expirydate: string; quantity: number; costprice: number; itemcode?: string; itemname?: string; available: number };

function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locs, setLocs] = useState<Loc[]>([]);
  const [from, setFrom] = useState<number | "">("");
  const [to, setTo] = useState<number | "">("");
  const [number, setNumber] = useState(`TR-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickBatch, setPickBatch] = useState<number | "">("");
  const [pickQty, setPickQty] = useState("");

  async function loadTransfers() {
    const { data } = await supabase.from("the_transfer")
      .select("*, from:fromlocationid(locationname), to:tolocationid(locationname)")
      .order("created_at", { ascending: false }).limit(50);
    setTransfers(data ?? []);
  }

  useEffect(() => {
    loadTransfers();
    supabase.from("the_storagelocations").select("locationid,locationname").then(({ data }) => setLocs(data ?? []));
  }, []);

  useEffect(() => {
    if (!from) { setBatches([]); return; }
    supabase.from("inventorydetails")
      .select("inventorydetailid,itemid,batchnumber,expirydate,quantity,costprice, the_items(itemcode,itemname)")
      .eq("locationid", from).gt("quantity", 0).order("expirydate")
      .then(({ data }) => setBatches((data ?? []) as any));
  }, [from]);

  function addLine() {
    const b = batches.find((x) => x.inventorydetailid === pickBatch);
    if (!b) return toast.error("Pick a batch");
    const qty = Number(pickQty);
    if (!qty || qty <= 0) return toast.error("Quantity required");
    if (qty > Number(b.quantity)) return toast.error(`Max ${b.quantity}`);
    setLines([...lines, {
      sourceinventorydetailid: b.inventorydetailid, itemid: b.itemid,
      batchnumber: b.batchnumber, expirydate: b.expirydate, quantity: qty,
      costprice: Number(b.costprice), itemcode: b.the_items?.itemcode, itemname: b.the_items?.itemname,
      available: Number(b.quantity),
    }]);
    setPickBatch(""); setPickQty("");
  }

  async function postTransfer() {
    if (!from || !to || from === to) return toast.error("Pick distinct locations");
    if (lines.length === 0) return toast.error("Add at least one line");
    const { data: hdr, error } = await supabase.from("the_transfer").insert({
      transfernumber: number, fromlocationid: Number(from), tolocationid: Number(to), notes,
    }).select().single();
    if (error) return toast.error(error.message);
    const { error: e2 } = await supabase.from("the_transferdetails").insert(
      lines.map((l) => ({
        transferid: hdr.transferid, itemid: l.itemid, sourceinventorydetailid: l.sourceinventorydetailid,
        batchnumber: l.batchnumber, expirydate: l.expirydate, quantity: l.quantity, costprice: l.costprice,
      }))
    );
    if (e2) return toast.error(e2.message);
    const { error: e3 } = await supabase.rpc("post_transfer", { _transfer_id: hdr.transferid });
    if (e3) return toast.error(e3.message);
    toast.success(`Transfer ${number} posted`);
    setLines([]); setNumber(`TR-${Date.now().toString().slice(-6)}`); setNotes("");
    loadTransfers();
  }

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Transfers between locations</h1>
      <div className="rounded border border-border bg-card p-3">
        <div className="grid grid-cols-5 gap-2 text-xs">
          <L label="Transfer #"><input value={number} onChange={(e) => setNumber(e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1 font-mono" /></L>
          <L label="From">
            <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className="w-full rounded border border-input bg-background px-2 py-1">
              <option value="">—</option>
              {locs.map((l) => <option key={l.locationid} value={l.locationid}>{l.locationname}</option>)}
            </select>
          </L>
          <L label="To">
            <select value={to} onChange={(e) => setTo(Number(e.target.value))} className="w-full rounded border border-input bg-background px-2 py-1">
              <option value="">—</option>
              {locs.map((l) => <option key={l.locationid} value={l.locationid}>{l.locationname}</option>)}
            </select>
          </L>
          <L label="Notes" col="col-span-2"><input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1" /></L>
        </div>

        <div className="mt-3 flex items-end gap-2 rounded bg-muted p-2">
          <L label="Pick batch (FEFO)">
            <select value={pickBatch} onChange={(e) => setPickBatch(Number(e.target.value))} disabled={!from}
              className="w-[420px] rounded border border-input bg-background px-2 py-1">
              <option value="">—</option>
              {batches.map((b) => (
                <option key={b.inventorydetailid} value={b.inventorydetailid}>
                  {b.the_items?.itemcode} · {b.the_items?.itemname} · Batch {b.batchnumber} · Exp {fmtDate(b.expirydate)} · Qty {fmtQty(b.quantity)}
                </option>
              ))}
            </select>
          </L>
          <L label="Qty"><input type="number" step="0.001" value={pickQty} onChange={(e) => setPickQty(e.target.value)} className="w-24 rounded border border-input bg-background px-2 py-1 text-right font-mono" /></L>
          <button onClick={addLine} className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs hover:bg-accent"><Plus className="h-3 w-3" /> Add line</button>
        </div>

        <table className="dense mt-2 w-full">
          <thead className="bg-muted text-muted-foreground">
            <tr><th>Item</th><th>Batch</th><th>Expiry</th><th className="text-right">Qty</th><th className="text-right">Avail</th><th></th></tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-border">
                <td className="font-mono text-xs">{l.itemcode} · {l.itemname}</td>
                <td className="font-mono">{l.batchnumber}</td>
                <td>{fmtDate(l.expirydate)}</td>
                <td className="text-right font-mono">{fmtQty(l.quantity)}</td>
                <td className="text-right font-mono text-muted-foreground">{fmtQty(l.available)}</td>
                <td><button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="rounded bg-destructive p-1 text-destructive-foreground"><Trash2 className="h-3 w-3" /></button></td>
              </tr>
            ))}
            {lines.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-muted-foreground">No lines.</td></tr>}
          </tbody>
        </table>

        <button onClick={postTransfer} disabled={!lines.length}
          className="mt-2 flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Send className="h-3 w-3" /> Post transfer
        </button>
      </div>

      <h2 className="text-sm font-semibold">Recent</h2>
      <div className="rounded border border-border bg-card overflow-auto">
        <table className="dense w-full">
          <thead className="bg-muted text-muted-foreground">
            <tr><th>#</th><th>Date</th><th>From</th><th>To</th><th>Status</th><th>Posted At</th></tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.transferid} className="border-t border-border">
                <td className="font-mono">{t.transfernumber}</td>
                <td>{fmtDate(t.transferdate)}</td>
                <td>{t.from?.locationname}</td>
                <td>{t.to?.locationname}</td>
                <td><span className={`rounded px-1.5 py-0.5 text-[11px] ${t.status === "posted" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>{t.status}</span></td>
                <td>{t.postedat ? new Date(t.postedat).toLocaleString() : "—"}</td>
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
