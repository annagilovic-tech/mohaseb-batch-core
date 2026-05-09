import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/customers")({ component: CustomersPage });

type Row = {
  customerid: number; customercode: string; customername: string; customernamear: string | null;
  phone: string | null; email: string | null; address: string | null; taxnumber: string | null;
  creditlimit: number; receivable_accountid: number | null; isactive: boolean;
};
type Account = { accountid: number; accountcode: string; accountname: string };

function CustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  async function load() {
    const { data } = await (supabase as any).from("the_customers").select("*").order("customercode").limit(500);
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
    (supabase as any).from("the_accounts").select("accountid,accountcode,accountname")
      .eq("accounttype","asset").eq("allowposting",true).order("accountcode")
      .then(({ data }: any) => setAccounts(data ?? []));
  }, []);
  async function addRow() {
    const code = prompt("Customer code:"); if (!code) return;
    const name = prompt("Name:"); if (!name) return;
    const { error } = await (supabase as any).from("the_customers").insert({ customercode: code, customername: name });
    if (error) return toast.error(error.message);
    load();
  }
  async function update(id: number, patch: Partial<Row>) {
    const { error } = await (supabase as any).from("the_customers").update(patch).eq("customerid", id);
    if (error) return toast.error(error.message);
    load();
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">Customers</h2>
        <button onClick={addRow} className="ml-auto flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
          <Plus className="h-3 w-3" /> Customer
        </button>
      </div>
      <div className="overflow-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted text-left">
            <tr>
              <th className="px-2 py-1 w-24">Code</th><th className="px-2 py-1">Name</th>
              <th className="px-2 py-1 w-32">Phone</th><th className="px-2 py-1">Address</th>
              <th className="px-2 py-1 w-28 text-right">Credit</th>
              <th className="px-2 py-1 w-44">AR account</th>
              <th className="px-2 py-1 w-16 text-center">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.customerid} className="border-t border-border">
                <td className="px-2 py-0.5 font-mono">{r.customercode}</td>
                <td className="px-2 py-0.5"><input defaultValue={r.customername}
                  onBlur={e=>update(r.customerid,{customername:e.target.value})} className="w-full bg-transparent outline-none"/></td>
                <td className="px-2 py-0.5"><input defaultValue={r.phone??""}
                  onBlur={e=>update(r.customerid,{phone:e.target.value})} className="w-full bg-transparent outline-none"/></td>
                <td className="px-2 py-0.5"><input defaultValue={r.address??""}
                  onBlur={e=>update(r.customerid,{address:e.target.value})} className="w-full bg-transparent outline-none"/></td>
                <td className="px-2 py-0.5"><input type="number" defaultValue={r.creditlimit}
                  onBlur={e=>update(r.customerid,{creditlimit:Number(e.target.value)})} className="w-full bg-transparent text-right outline-none"/></td>
                <td className="px-2 py-0.5">
                  <select defaultValue={r.receivable_accountid??""}
                    onChange={e=>update(r.customerid,{receivable_accountid:e.target.value?Number(e.target.value):null})}
                    className="w-full bg-transparent outline-none">
                    <option value="">—</option>
                    {accounts.map(a=><option key={a.accountid} value={a.accountid}>{a.accountcode} {a.accountname}</option>)}
                  </select>
                </td>
                <td className="px-2 py-0.5 text-center">
                  <input type="checkbox" checked={r.isactive} onChange={e=>update(r.customerid,{isactive:e.target.checked})}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
