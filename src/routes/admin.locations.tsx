import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/locations")({ component: LocationsPage });

function LocationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [nameAr, setNameAr] = useState("");

  async function load() {
    const { data } = await supabase.from("the_storagelocations").select("*").order("locationid");
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("the_storagelocations").insert({ locationcode: code, locationname: name, locationnamear: nameAr || null });
    if (error) return toast.error(error.message);
    setCode(""); setName(""); setNameAr(""); load();
  }

  return (
    <div className="space-y-3">
      <h1 className="text-sm font-semibold">Storage Locations</h1>
      <form onSubmit={add} className="flex items-end gap-2 rounded border border-border bg-card p-3 text-xs">
        <label>Code<input required value={code} onChange={(e) => setCode(e.target.value)} className="mt-0.5 w-32 rounded border border-input bg-background px-2 py-1 font-mono" /></label>
        <label className="flex-1">Name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1" /></label>
        <label className="flex-1">Name (AR)<input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1" /></label>
        <button className="rounded bg-primary px-3 py-1 text-primary-foreground">Add</button>
      </form>
      <div className="rounded border border-border bg-card overflow-auto">
        <table className="dense w-full">
          <thead className="bg-muted text-muted-foreground"><tr><th>ID</th><th>Code</th><th>Name</th><th>Name (AR)</th><th>Active</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.locationid} className="border-t border-border">
                <td className="font-mono">{r.locationid}</td><td className="font-mono">{r.locationcode}</td><td>{r.locationname}</td><td dir="rtl">{r.locationnamear ?? "—"}</td><td>{r.isactive ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
