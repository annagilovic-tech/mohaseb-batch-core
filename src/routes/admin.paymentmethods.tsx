import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/paymentmethods")({ component: PMPage });

type Row = { paymentmethodid: number; methodcode: string; methodname: string; methodnamear: string | null;
  accountid: number; isactive: boolean };
type Account = { accountid: number; accountcode: string; accountname: string };

function PMPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  async function load() {
    const { data } = await (supabase as any).from("the_paymentmethods").select("*").order("methodcode");
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
    (supabase as any).from("the_accounts").select("accountid,accountcode,accountname")
      .eq("allowposting",true).order("accountcode").then(({ data }: any) => setAccounts(data ?? []));
  }, []);
  async function addRow() {
    const code = prompt("Method code:"); if (!code) return;
    const name = prompt("Name:"); if (!name) return;
    if (!accounts.length) return toast.error("Create a posting account first");
    const { error } = await (supabase as any).from("the_paymentmethods")
      .insert({ methodcode: code, methodname: name, accountid: accounts[0].accountid });
    if (error) return toast.error(error.message);
    load();
  }
  async function update(id: number, patch: Partial<Row>) {
    const { error } = await (supabase as any).from("the_paymentmethods").update(patch).eq("paymentmethodid", id);
    if (error) return toast.error(error.message);
    load();
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Payment methods</h2>
        <button onClick={addRow} className="ml-auto flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
          <Plus className="h-3 w-3" /> Method
        </button>
      </div>
      <div className="overflow-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted text-left">
            <tr>
              <th className="px-2 py-1 w-24">Code</th><th className="px-2 py-1">Name</th>
              <th className="px-2 py-1 w-56">GL account</th>
              <th className="px-2 py-1 w-16 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.paymentmethodid} className="border-t border-border">
                <td className="px-2 py-0.5 font-mono">{r.methodcode}</td>
                <td className="px-2 py-0.5"><input defaultValue={r.methodname}
                  onBlur={e=>update(r.paymentmethodid,{methodname:e.target.value})} className="w-full bg-transparent outline-none"/></td>
                <td className="px-2 py-0.5">
                  <select defaultValue={r.accountid} onChange={e=>update(r.paymentmethodid,{accountid:Number(e.target.value)})}
                    className="w-full bg-transparent outline-none">
                    {accounts.map(a=><option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                  </select>
                </td>
                <td className="px-2 py-0.5 text-center">
                  <input type="checkbox" checked={r.isactive} onChange={e=>update(r.paymentmethodid,{isactive:e.target.checked})}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
