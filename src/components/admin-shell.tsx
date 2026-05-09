import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Boxes, Package, Layers, ArrowLeftRight, Ruler, MapPin, LogOut, ScrollText,
  BookOpen, BookText, Users, Truck, Wallet, CreditCard, ShoppingCart, Receipt } from "lucide-react";

const nav = [
  { to: "/admin", label: "Inventory", icon: Boxes, exact: true },
  { to: "/admin/items", label: "Items", icon: Package },
  { to: "/admin/batches", label: "Batches", icon: Layers },
  { to: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/admin/ledger", label: "Stock ledger", icon: ScrollText },
  { to: "/admin/accounts", label: "Accounts", icon: BookOpen },
  { to: "/admin/journal", label: "Journal", icon: BookText },
  { to: "/admin/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/admin/sales", label: "Sales", icon: Receipt },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { to: "/admin/cashboxes", label: "Cashboxes", icon: Wallet },
  { to: "/admin/paymentmethods", label: "Payment methods", icon: CreditCard },
  { to: "/admin/units", label: "Units", icon: Ruler },
  { to: "/admin/locations", label: "Locations", icon: MapPin },
];

export function AdminShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="grid h-screen grid-cols-[200px_1fr] grid-rows-[36px_1fr] bg-background">
      {/* Top bar */}
      <header className="col-span-2 flex items-center justify-between border-b border-border bg-sidebar px-3 text-sidebar-foreground">
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide">
          <span className="rounded-sm bg-primary px-1.5 py-0.5 text-primary-foreground">Rx</span>
          Pharmacy ERP <span className="text-muted-foreground/70">— Mohaseb 3 compatible</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">{user.email}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
            className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-sidebar-accent"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <nav className="flex flex-col py-2">
          {nav.map((n) => {
            const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 px-3 py-1.5 text-[13px] border-l-2 ${
                  active
                    ? "border-primary bg-sidebar-accent text-primary-foreground"
                    : "border-transparent hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="overflow-auto p-3">
        <Outlet />
      </main>
    </div>
  );
}
