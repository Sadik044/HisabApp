import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, JAR_COLORS } from "@/lib/format";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, PiggyBank, Plus, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JarWise" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const { t } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });
  const currency = profile?.currency ?? "BDT";

  const { data: jars = [], isLoading: jarsLoading } = useQuery({
    queryKey: ["jars", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jars").select("*").eq("user_id", userId).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ["monthly", userId],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      const iso = start.toISOString().slice(0, 10);
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase.from("incomes").select("amount").eq("user_id", userId).gte("received_at", iso),
        supabase.from("expenses").select("amount").eq("user_id", userId).gte("spent_at", iso),
      ]);
      const income = (inc ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const expense = (exp ?? []).reduce((s, r) => s + Number(r.amount), 0);
      return { income, expense };
    },
  });

  const { data: expensesByJar = [], isLoading: expByJarLoading } = useQuery({
    queryKey: ["dash-exp-by-jar", userId],
    queryFn: async () => {
      const start = new Date(); start.setDate(1);
      const { data } = await supabase
        .from("expenses").select("amount, jar_id")
        .eq("user_id", userId).gte("spent_at", start.toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const { data: trend = [], isLoading: trendLoading } = useQuery({
    queryKey: ["dash-trend", userId],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const iso = start.toISOString().slice(0, 10);
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase.from("incomes").select("amount, received_at").eq("user_id", userId).gte("received_at", iso),
        supabase.from("expenses").select("amount, spent_at").eq("user_id", userId).gte("spent_at", iso),
      ]);
      const months: { key: string; label: string; income: number; expense: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          label: d.toLocaleString(undefined, { month: "short" }),
          income: 0, expense: 0,
        });
      }
      (inc ?? []).forEach((r) => {
        const m = months.find((x) => x.key === String(r.received_at).slice(0, 7));
        if (m) m.income += Number(r.amount);
      });
      (exp ?? []).forEach((r) => {
        const m = months.find((x) => x.key === String(r.spent_at).slice(0, 7));
        if (m) m.expense += Number(r.amount);
      });
      return months;
    },
  });

  const { data: recent = [], isLoading: recentLoading } = useQuery({
    queryKey: ["dash-recent", userId],
    queryFn: async () => {
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase.from("incomes").select("id, amount, source, note, received_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        supabase.from("expenses").select("id, amount, category, note, spent_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      ]);
      const items = [
        ...(inc ?? []).map((r) => ({ id: `i-${r.id}`, type: "income" as const, amount: Number(r.amount), label: r.source, note: r.note as string | null, date: r.received_at, created_at: r.created_at })),
        ...(exp ?? []).map((r) => ({ id: `e-${r.id}`, type: "expense" as const, amount: Number(r.amount), label: r.category, note: r.note as string | null, date: r.spent_at, created_at: r.created_at })),
      ];
      items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return items.slice(0, 5);
    },
  });

  const totalBalance = jars.reduce((s, j) => s + Number(j.balance), 0);
  const income = monthly?.income ?? 0;
  const expense = monthly?.expense ?? 0;
  const anyLoading = monthlyLoading || jarsLoading || recentLoading || expByJarLoading || trendLoading;
  const isEmpty = !anyLoading && income === 0 && expense === 0 && totalBalance === 0 && recent.length === 0;
  const netSavings = income - expense;
  const biggestJar = jars.reduce<typeof jars[number] | null>((a, b) => (!a || Number(b.balance) > Number(a.balance) ? b : a), null);

  const jarById = new Map(jars.map((j) => [j.id, j]));
  const expensePieData = Object.values(
    expensesByJar.reduce<Record<string, { name: string; value: number; color: string }>>((acc, r) => {
      const j = jarById.get(r.jar_id);
      if (!j) return acc;
      if (!acc[j.id]) acc[j.id] = { name: j.name, value: 0, color: j.color ?? JAR_COLORS[j.key] ?? "#888" };
      acc[j.id].value += Number(r.amount);
      return acc;
    }, {})
  );

  const allocationData = jars
    .map((j) => ({ name: j.name, value: Number(j.balance), color: j.color ?? JAR_COLORS[j.key] ?? "#888" }))
    .filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard.welcome")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/income"><Plus className="mr-1 h-4 w-4" />{t("dashboard.addIncome")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/expenses"><Minus className="mr-1 h-4 w-4" />{t("dashboard.addExpense")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {monthlyLoading || jarsLoading ? (
          <>
            <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={ArrowDownToLine} label={`${t("dashboard.totalIncome")} (${t("dashboard.thisMonth")})`} value={formatCurrency(income, currency)} accent="text-emerald-500" />
            <StatCard icon={ArrowUpFromLine} label={`${t("dashboard.totalExpenses")} (${t("dashboard.thisMonth")})`} value={formatCurrency(expense, currency)} accent="text-red-500" />
            <StatCard icon={Wallet} label={t("dashboard.netSavings")} value={formatCurrency(netSavings, currency)} accent={netSavings >= 0 ? "text-emerald-500" : "text-red-500"} />
            <StatCard icon={PiggyBank} label={t("dashboard.biggestJar")} value={biggestJar ? formatCurrency(Number(biggestJar.balance), currency) : "—"} sub={biggestJar?.name ?? "—"} />
          </>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon="📊"
          title={t("empty.dashboardTitle")}
          description={t("empty.dashboardSub")}
          ctaLabel={t("empty.dashboardCta")}
          ctaTo="/income"
        />
      ) : (
      <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-3">
        {expByJarLoading ? <ChartSkeleton /> : (
        <ChartCard title={t("dashboard.expensesByJar")} subtitle={t("dashboard.thisMonth")}>
          {expensePieData.length === 0 ? <EmptyChart label="No expenses yet" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expensePieData} dataKey="value" nameKey="name" outerRadius={90} stroke="hsl(var(--background))">
                  {expensePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        )}

        {trendLoading ? <ChartSkeleton /> : (
        <ChartCard title={t("dashboard.incomeVsExpenses")} subtitle={t("dashboard.last6Months")}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        )}

        {jarsLoading ? <ChartSkeleton /> : (
        <ChartCard title={t("dashboard.jarAllocation")} subtitle={`${formatCurrency(totalBalance, currency)}`}>
          {allocationData.length === 0 ? <EmptyChart label="No balance yet" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} stroke="hsl(var(--background))">
                  {allocationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">{t("dashboard.recentTransactions")}</h2>
            <span className="text-xs text-muted-foreground">{t("dashboard.last5")}</span>
          </div>
          {recentLoading ? (
            <ul className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                </li>
              ))}
            </ul>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("dashboard.noTransactions")}</p>
          ) : (
            <ul className="divide-y">
              {recent.map((t, i) => (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-full ${t.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                      {t.type === "income" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{t.label}</span>
                        <Badge variant={t.type === "income" ? "secondary" : "outline"} className="text-[10px] uppercase">{t.type}</Badge>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{t.note || new Date(t.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${t.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                    {t.type === "income" ? "+" : "−"}{formatCurrency(t.amount, currency)}
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">{t("dashboard.yourJars")}</h2>
          <div className="space-y-3">
            {jarsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))
              : jars.map((j) => {
              const pct = totalBalance > 0 ? (Number(j.balance) / totalBalance) * 100 : 0;
              return (
                <div key={j.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: j.color }} />
                      <span className="font-medium">{j.name}</span>
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(Number(j.balance), currency)}</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        <Icon className={`h-4 w-4 ${accent ?? ""}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">{label}</div>;
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-[240px] w-full rounded-md" />
    </div>
  );
}