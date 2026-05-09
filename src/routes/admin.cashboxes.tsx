import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/cashboxes")({ component: CashboxesPage });

type Row = { cashboxid: number; cashboxcode: string; cashboxname: string; cashboxnamear: string | null;
  accountid: number; currency: string; isactive: boolean };
type Account = { accountid: number; accountcode: string; accountname: string };

function CashboxesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  async function load() {
    const { data } = await (supabase as any).from("the_cashboxes").select("*").order("cashboxcode");
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
    (supabase as any).from("the_accounts").select("accountid,accountcode,accountname")
      .eq("accounttype","asset").eq("allowposting",true).order("accountcode")
      .then(({ data }: any) => setAccounts(data ?? []));
  }, []);
  async function addRow() {
    const code = prompt("Cashbox code:"); if (!code) return;
    const name = prompt("Name:"); if (!name) return;
    if (!accounts.length) return toast.error("Create an asset account first");
    const { error } = await (supabase as any).from("the_cashboxes")
      .insert({ cashboxcode: code, cashboxname: name, accountid: accounts[0].accountid });
    if (error) return toast.error(error.message);
    load();
  }
  async function update(id: number, patch: Partial<Row>) {
    const { error } = await (supabase as any).from("the_cashboxes").update(patch).eq("cashboxid", id);
    if (error) return toast.error(error.message);
    load();
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Cashboxes</h2>
        <button onClick={addRow} className="ml-auto flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
          <Plus className="h-3 w-3" /> Cashbox
        </button>
      </div>
      <div className="overflow-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted text-left">
            <tr>
              <th className="px-2 py-1 w-24">Code</th><th className="px-2 py-1">Name</th>
              <th className="px-2 py-1 w-20">Currency</th>
              <th className="px-2 py-1 w-56">GL account</th>
              <th className="px-2 py-1 w-16 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.cashboxid} className="border-t border-border">
                <td className="px-2 py-0.5 font-mono">{r.cashboxcode}</td>
                <td className="px-2 py-0.5"><input defaultValue={r.cashboxname}
                  onBlur={e=>update(r.cashboxid,{cashboxname:e.target.value})} className="w-full bg-transparent outline-none"/></td>
                <td className="px-2 py-0.5"><input defaultValue={r.currency}
                  onBlur={e=>update(r.cashboxid,{currency:e.target.value})} className="w-full bg-transparent outline-none"/></td>
                <td className="px-2 py-0.5">
                  <select defaultValue={r.accountid} onChange={e=>update(r.cashboxid,{accountid:Number(e.target.value)})}
                    className="w-full bg-transparent outline-none">
                    {accounts.map(a=><option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                  </select>
                </td>
                <td className="px-2 py-0.5 text-center">
                  <input type="checkbox" checked={r.isactive} onChange={e=>update(r.cashboxid,{isactive:e.target.checked})}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
