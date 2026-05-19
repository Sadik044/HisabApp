import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  BarChart3,
  Settings,
  User as UserIcon,
  LogOut,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/income", label: "Income", icon: ArrowDownToLine },
  { to: "/expenses", label: "Expenses", icon: ArrowUpFromLine },
  { to: "/jars", label: "Jars", icon: Boxes },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="font-semibold">JarWise</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button size="icon" variant="ghost" onClick={() => setOpen((s) => !s)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="md:flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-x-0 top-[57px] z-20 border-b bg-card md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r",
            open ? "block" : "hidden md:block",
          )}
        >
          <div className="hidden items-center gap-2 px-6 py-5 md:flex">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">JarWise</span>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {nav.map((n) => {
              const active = location.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-3">
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
            <Button variant="ghost" className="w-full justify-start" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <main className="flex-1">
          <div className="hidden items-center justify-end gap-2 border-b bg-background/80 px-6 py-3 backdrop-blur md:flex">
            <ThemeToggle />
          </div>
          <div className="container mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}