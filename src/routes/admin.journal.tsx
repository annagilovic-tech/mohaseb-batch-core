import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtMoney, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/admin/journal")({ component: JournalPage });

type Entry = { entryid: number; entrynumber: string; entrydate: string; status: string;
  reference_type: string | null; reference_id: number | null; notes: string | null; postedat: string | null };
type Line = { lineid: number; entryid: number; accountid: number; debit: number; credit: number; notes: string | null };
type Account = { accountid: number; accountcode: string; accountname: string; allowposting: boolean };

function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sel, setSel] = useState<Entry | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  async function loadEntries() {
    const { data } = await (supabase as any).from("the_journalentries")
      .select("*").order("entryid", { ascending: false }).limit(300);
    setEntries(data ?? []);
  }
  async function loadLines(id: number) {
    const { data } = await (supabase as any).from("the_journalentrylines")
      .select("*").eq("entryid", id).order("lineid");
    setLines(data ?? []);
  }
  useEffect(() => {
    loadEntries();
    (supabase as any).from("the_accounts").select("accountid,accountcode,accountname,allowposting")
      .order("accountcode").then(({ data }: any) => setAccounts(data ?? []));
  }, []);

  async function newEntry() {
    const num = prompt("Entry number:", `JE-${Date.now()}`); if (!num) return;
    const { data, error } = await (supabase as any).from("the_journalentries")
      .insert({ entrynumber: num, entrydate: new Date().toISOString().slice(0,10) }).select().single();
    if (error) return toast.error(error.message);
    await loadEntries(); setSel(data); setLines([]);
  }
  async function addLine() {
    if (!sel || sel.status !== "draft") return;
    const acc = accounts.find(a => a.allowposting); if (!acc) return toast.error("No posting account");
    const { error } = await (supabase as any).from("the_journalentrylines")
      .insert({ entryid: sel.entryid, accountid: acc.accountid, debit: 0, credit: 0 });
    if (error) return toast.error(error.message);
    loadLines(sel.entryid);
  }
  async function updateLine(l: Line, patch: Partial<Line>) {
    const { error } = await (supabase as any).from("the_journalentrylines").update(patch).eq("lineid", l.lineid);
    if (error) return toast.error(error.message);
    loadLines(sel!.entryid);
  }
  async function delLine(l: Line) {
    const { error } = await (supabase as any).from("the_journalentrylines").delete().eq("lineid", l.lineid);
    if (error) return toast.error(error.message);
    loadLines(sel!.entryid);
  }
  async function post() {
    if (!sel) return;
    const { error } = await (supabase as any).rpc("post_journal_entry", { _entry_id: sel.entryid });
    if (error) return toast.error(error.message);
    toast.success("Posted"); await loadEntries();
    const e = (await (supabase as any).from("the_journalentries").select("*").eq("entryid", sel.entryid).single()).data;
    setSel(e);
  }

  const dr = lines.reduce((s, l) => s + Number(l.debit), 0);
  const cr = lines.reduce((s, l) => s + Number(l.credit), 0);

  return (
    <div className="grid grid-cols-[320px_1fr] gap-2 h-[calc(100vh-72px)]">
      <div className="overflow-auto rounded border border-border">
        <div className="flex items-center justify-between p-1 sticky top-0 bg-muted">
          <span className="text-xs font-semibold">Journal entries</span>
          <button onClick={newEntry} className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">+ Entry</button>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {entries.map(e => (
              <tr key={e.entryid} onClick={() => { setSel(e); loadLines(e.entryid); }}
                className={`cursor-pointer border-t border-border ${sel?.entryid===e.entryid?"bg-accent":""}`}>
                <td className="px-2 py-0.5 font-mono">{e.entrynumber}</td>
                <td className="px-2 py-0.5">{fmtDate(e.entrydate)}</td>
                <td className={`px-2 py-0.5 text-right ${e.status==="posted"?"text-green-600":"text-muted-foreground"}`}>{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 overflow-hidden">
        {sel ? (
          <>
            <div className="flex items-center gap-2 rounded border border-border p-2 text-xs">
              <span className="font-mono font-semibold">{sel.entrynumber}</span>
              <span>{fmtDate(sel.entrydate)}</span>
              <span className="text-muted-foreground">{sel.reference_type ?? "manual"} {sel.reference_id ?? ""}</span>
              <span className="ml-auto">Dr {fmtMoney(dr)} / Cr {fmtMoney(cr)}</span>
              {sel.status === "draft" && (
                <>
                  <button onClick={addLine} className="rounded border px-2 py-0.5">+ Line</button>
                  <button onClick={post} disabled={dr===0||dr!==cr}
                    className="rounded bg-primary px-2 py-0.5 text-primary-foreground disabled:opacity-40">Post</button>
                </>
              )}
              {sel.status === "posted" && <span className="text-green-600">Posted {fmtDate(sel.postedat)}</span>}
            </div>
            <div className="overflow-auto rounded border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-2 py-1">Account</th>
                    <th className="px-2 py-1 w-32 text-right">Debit</th>
                    <th className="px-2 py-1 w-32 text-right">Credit</th>
                    <th className="px-2 py-1">Notes</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(l => (
                    <tr key={l.lineid} className="border-t border-border">
                      <td className="px-2 py-0.5">
                        <select defaultValue={l.accountid} disabled={sel.status!=="draft"}
                          onChange={e => updateLine(l, { accountid: Number(e.target.value) })}
                          className="w-full bg-transparent outline-none">
                          {accounts.filter(a => a.allowposting).map(a =>
                            <option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-0.5">
                        <input type="number" step="0.01" defaultValue={l.debit} disabled={sel.status!=="draft"}
                          onBlur={e => updateLine(l, { debit: Number(e.target.value), credit: Number(e.target.value)>0?0:Number(l.credit) })}
                          className="w-full bg-transparent text-right outline-none" />
                      </td>
                      <td className="px-2 py-0.5">
                        <input type="number" step="0.01" defaultValue={l.credit} disabled={sel.status!=="draft"}
                          onBlur={e => updateLine(l, { credit: Number(e.target.value), debit: Number(e.target.value)>0?0:Number(l.debit) })}
                          className="w-full bg-transparent text-right outline-none" />
                      </td>
                      <td className="px-2 py-0.5">
                        <input defaultValue={l.notes ?? ""} disabled={sel.status!=="draft"}
                          onBlur={e => updateLine(l, { notes: e.target.value })}
                          className="w-full bg-transparent outline-none" />
                      </td>
                      <td className="text-center">
                        {sel.status==="draft" && (
                          <button onClick={() => delLine(l)} className="text-destructive">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <div className="p-4 text-xs text-muted-foreground">Select or create an entry.</div>}
      </div>
    </div>
  );
}
