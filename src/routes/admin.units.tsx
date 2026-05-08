import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/units")({ component: UnitsPage });

function UnitsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState(""); const [nameAr, setNameAr] = useState(""); const [base, setBase] = useState(false);

  async function load() {
    const { data } = await supabase.from("the_units").select("*").order("unitid");
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("the_units").insert({ unitname: name, unitnamear: nameAr || null, isbaseunit: base });
    if (error) return toast.error(error.message);
    setName(""); setNameAr(""); setBase(false); load();
  }

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Units</h1>
      <form onSubmit={add} className="flex items-end gap-2 rounded border border-border bg-card p-3 text-xs">
        <label className="flex-1">Name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1" /></label>
        <label className="flex-1">Name (AR)<input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1" /></label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={base} onChange={(e) => setBase(e.target.checked)} /> Base</label>
        <button className="rounded bg-primary px-3 py-1 text-primary-foreground">Add</button>
      </form>
      <div className="rounded border border-border bg-card overflow-auto">
        <table className="dense w-full">
          <thead className="bg-muted text-muted-foreground"><tr><th>ID</th><th>Name</th><th>Name (AR)</th><th>Base</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.unitid} className="border-t border-border">
                <td className="font-mono">{r.unitid}</td><td>{r.unitname}</td><td dir="rtl">{r.unitnamear ?? "—"}</td><td>{r.isbaseunit ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
