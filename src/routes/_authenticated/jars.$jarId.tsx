import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { JAR_EMOJIS, JAR_DESCRIPTIONS } from "./jars";

export const Route = createFileRoute("/_authenticated/jars/$jarId")({
  head: () => ({ meta: [{ title: "Jar Details — JarWise" }] }),
  component: JarDetailPage,
});

function JarDetailPage() {
  const { jarId } = Route.useParams();
  const { user } = useAuth();
  const userId = user!.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("currency").eq("id", userId).maybeSingle()).data,
  });
  const currency = profile?.currency ?? "BDT";

  const { data: jar } = useQuery({
    queryKey: ["jar", jarId, userId],
    queryFn: async () =>
      (await supabase.from("jars").select("*").eq("id", jarId).eq("user_id", userId).maybeSingle()).data,
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes", userId],
    queryFn: async () => (await supabase.from("incomes").select("*").eq("user_id", userId).order("received_at", { ascending: false }).limit(200)).data ?? [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["jar-expenses", jarId, userId],
    queryFn: async () =>
      (await supabase.from("expenses").select("*").eq("jar_id", jarId).eq("user_id", userId).order("spent_at", { ascending: false }).limit(200)).data ?? [],
  });

  if (!jar) {
    return <div className="text-sm text-muted-foreground">Loading jar…</div>;
  }

  const pct = Number(jar.percentage);

  // Allocations: each income contributes (amount * pct / 100) to this jar
  const allocations = incomes.map((i) => ({
    id: i.id,
    date: i.received_at,
    source: i.source,
    note: i.note,
    income: Number(i.amount),
    allocated: Math.round(Number(i.amount) * pct) / 100,
  }));

  // Savings trend: monthly cumulative balance (allocations - expenses) over last 6 months
  const months: { label: string; key: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString(undefined, { month: "short" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  const monthly: Record<string, { in: number; out: number }> = {};
  months.forEach((m) => (monthly[m.key] = { in: 0, out: 0 }));
  allocations.forEach((a) => {
    const k = a.date.slice(0, 7);
    if (monthly[k]) monthly[k].in += a.allocated;
  });
  expenses.forEach((e) => {
    const k = e.spent_at.slice(0, 7);
    if (monthly[k]) monthly[k].out += Number(e.amount);
  });
  let running = 0;
  const chartData = months.map((m) => {
    running += monthly[m.key].in - monthly[m.key].out;
    return { month: m.label, balance: Math.round(running * 100) / 100 };
  });

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/jars"><ArrowLeft className="mr-1 h-4 w-4" /> All jars</Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="text-5xl">{JAR_EMOJIS[jar.key] ?? "🫙"}</div>
          <div>
            <div className="text-xs text-muted-foreground">{jar.key} · {pct}%</div>
            <h1 className="text-3xl font-semibold tracking-tight">{jar.name}</h1>
            <p className="text-sm text-muted-foreground">{JAR_DESCRIPTIONS[jar.key] ?? ""}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Current balance</div>
          <div className="mt-1 text-3xl font-semibold">{formatCurrency(Number(jar.balance), currency)}</div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Allocated</div>
          <div className="mt-1 text-3xl font-semibold text-emerald-500">
            +{formatCurrency(allocations.reduce((s, a) => s + a.allocated, 0), currency)}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Spent</div>
          <div className="mt-1 text-3xl font-semibold text-red-500">
            -{formatCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0), currency)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 font-medium">Savings trend (last 6 months)</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v) => formatCurrency(Number(v) || 0, currency)}
              />
              <Line type="monotone" dataKey="balance" stroke={jar.color || "#10B981"} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4 font-medium">Allocation history</div>
          <div className="divide-y">
            {allocations.length === 0 && <div className="p-5 text-sm text-muted-foreground">No allocations yet.</div>}
            {allocations.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{a.source}</div>
                  <div className="text-xs text-muted-foreground">{a.date} · from {formatCurrency(a.income, currency)} income</div>
                </div>
                <div className="font-medium text-emerald-500">+{formatCurrency(a.allocated, currency)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4 font-medium">Expense history</div>
          <div className="divide-y">
            {expenses.length === 0 && <div className="p-5 text-sm text-muted-foreground">No expenses from this jar.</div>}
            {expenses.slice(0, 20).map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{e.category}</div>
                  <div className="text-xs text-muted-foreground">{e.spent_at}{e.note ? ` · ${e.note}` : ""}</div>
                </div>
                <div className="font-medium text-red-500">-{formatCurrency(Number(e.amount), currency)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}