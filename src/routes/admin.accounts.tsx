import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/accounts")({ component: AccountsPage });

type Account = {
  accountid: number; accountcode: string; accountname: string; accountnamear: string | null;
  parentaccountid: number | null; accounttype: string; allowposting: boolean; isactive: boolean;
};

const TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;

function AccountsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data, error } = await (supabase as any)
      .from("the_accounts").select("*").order("accountcode").limit(2000);
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addRow() {
    const code = prompt("Account code (e.g. 1100):"); if (!code) return;
    const name = prompt("Account name:"); if (!name) return;
    const type = prompt(`Type [${TYPES.join("|")}]:`, "asset"); if (!type) return;
    const { error } = await (supabase as any).from("the_accounts").insert({
      accountcode: code, accountname: name, accounttype: type, allowposting: true,
    });
    if (error) return toast.error(error.message);
    load();
  }

  async function update(id: number, patch: Partial<Account>) {
    const { error } = await (supabase as any).from("the_accounts").update(patch).eq("accountid", id);
    if (error) return toast.error(error.message);
    load();
  }

  const filtered = rows.filter(r =>
    !q || r.accountcode.toLowerCase().includes(q.toLowerCase()) ||
    r.accountname.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-wide">Chart of accounts</h2>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter…"
          className="ml-auto h-7 rounded border border-border bg-background px-2 text-xs" />
        <button onClick={addRow}
          className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
          <Plus className="h-3 w-3" /> Account
        </button>
      </div>
      <div className="overflow-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted text-left">
            <tr>
              <th className="px-2 py-1 w-24">Code</th>
              <th className="px-2 py-1">Name</th>
              <th className="px-2 py-1 w-28">Type</th>
              <th className="px-2 py-1 w-28">Parent</th>
              <th className="px-2 py-1 w-20 text-center">Posting</th>
              <th className="px-2 py-1 w-20 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.accountid} className="border-t border-border hover:bg-muted/50">
                <td className="px-2 py-0.5 font-mono">{r.accountcode}</td>
                <td className="px-2 py-0.5">
                  <input defaultValue={r.accountname}
                    onBlur={e => e.target.value !== r.accountname && update(r.accountid, { accountname: e.target.value })}
                    className="w-full bg-transparent outline-none focus:bg-background" />
                </td>
                <td className="px-2 py-0.5">
                  <select defaultValue={r.accounttype} onChange={e => update(r.accountid, { accounttype: e.target.value })}
                    className="w-full bg-transparent outline-none">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-0.5">
                  <select defaultValue={r.parentaccountid ?? ""}
                    onChange={e => update(r.accountid, { parentaccountid: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-transparent outline-none">
                    <option value="">—</option>
                    {rows.filter(p => p.accountid !== r.accountid).map(p =>
                      <option key={p.accountid} value={p.accountid}>{p.accountcode} {p.accountname}</option>)}
                  </select>
                </td>
                <td className="px-2 py-0.5 text-center">
                  <input type="checkbox" checked={r.allowposting}
                    onChange={e => update(r.accountid, { allowposting: e.target.checked })} />
                </td>
                <td className="px-2 py-0.5 text-center">
                  <input type="checkbox" checked={r.isactive}
                    onChange={e => update(r.accountid, { isactive: e.target.checked })} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">No accounts.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
