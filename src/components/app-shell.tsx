import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  BarChart3,
  Settings,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-logo";

const nav = [
  { to: "/dashboard", labelKey: "common.dashboard", icon: LayoutDashboard },
  { to: "/income", labelKey: "common.income", icon: ArrowDownToLine },
  { to: "/expenses", labelKey: "common.expenses", icon: ArrowUpFromLine },
  { to: "/jars", labelKey: "common.jars", icon: Boxes },
  { to: "/reports", labelKey: "common.reports", icon: BarChart3 },
  { to: "/settings", labelKey: "common.settings", icon: Settings },
  { to: "/profile", labelKey: "common.profile", icon: UserIcon },
] as const;

export function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <BrandMark className="h-8 w-8" />
          <span className="font-bold tracking-tight">HisabApp</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
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
            "fixed inset-x-0 top-[57px] z-20 border-b bg-card transition-[width] duration-200 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r",
            collapsed ? "md:w-16" : "md:w-64",
            open ? "block" : "hidden md:block",
          )}
        >
          <div className={cn("hidden items-center gap-2 py-5 md:flex", collapsed ? "justify-center px-2" : "px-6")}>
            <BrandMark />
            {!collapsed && <span className="font-bold tracking-tight">HisabApp</span>}
          </div>
          <nav className={cn("flex flex-col gap-1", collapsed ? "p-2" : "p-3")}>
            {nav.map((n) => {
              const active = location.pathname === n.to;
              const label = t(n.labelKey);
              const link = (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    collapsed && "md:justify-center md:px-0",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  <span className={cn(collapsed && "md:hidden")}>{label}</span>
                </Link>
              );
              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ) : link;
            })}
          </nav>
          <div className={cn("border-t", collapsed ? "p-2" : "p-3")}>
            {!collapsed && <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full" onClick={logout} aria-label={t("common.signOut")}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t("common.signOut")}</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" className="w-full justify-start" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" /> {t("common.signOut")}
              </Button>
            )}
          </div>
        </aside>

        <main className="flex-1">
          <div className="hidden items-center justify-between gap-2 border-b bg-background/80 px-6 py-3 backdrop-blur md:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
          <div className="container mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-[60vh]">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
                    </div>
                  }
                >
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}