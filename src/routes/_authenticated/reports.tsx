import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, JAR_COLORS } from "@/lib/format";
import {
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Papa from "papaparse";
import jsPDF from "jspdf";
import { Download, FileText, Lightbulb, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — JarWise" }] }),
  component: ReportsPage,
});

type Preset = "week" | "month" | "3m" | "custom";

function startOfWeek(d: Date) {
  const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function ReportsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const userId = user!.id;

  const [preset, setPreset] = useState<Preset>("month");
  const today = new Date();
  const [from, setFrom] = useState<string>(isoDate(startOfMonth(today)));
  const [to, setTo] = useState<string>(isoDate(today));

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    if (p === "week") { setFrom(isoDate(startOfWeek(now))); setTo(isoDate(now)); }
    else if (p === "month") { setFrom(isoDate(startOfMonth(now))); setTo(isoDate(now)); }
    else if (p === "3m") {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setFrom(isoDate(d)); setTo(isoDate(now));
    }
  }

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("currency").eq("id", userId).maybeSingle()).data,
  });
  const currency = profile?.currency ?? "BDT";

  const { data: jars = [] } = useQuery({
    queryKey: ["jars", userId],
    queryFn: async () => (await supabase.from("jars").select("*").eq("user_id", userId).order("sort_order")).data ?? [],
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["all-incomes", userId],
    queryFn: async () => (await supabase.from("incomes").select("*").eq("user_id", userId).order("received_at", { ascending: true })).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses", userId],
    queryFn: async () => (await supabase.from("expenses").select("*").eq("user_id", userId).order("spent_at", { ascending: true })).data ?? [],
  });

  // Filtered range
  const fIncomes = useMemo(() => incomes.filter((r) => r.received_at >= from && r.received_at <= to), [incomes, from, to]);
  const fExpenses = useMemo(() => expenses.filter((r) => r.spent_at >= from && r.spent_at <= to), [expenses, from, to]);

  const totalIncome = fIncomes.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = fExpenses.reduce((s, r) => s + Number(r.amount), 0);
  const savings = totalIncome - totalExpense;

  // Per-jar breakdown (allocated from income vs spent in range)
  const jarRows = useMemo(() => {
    return jars.map((j) => {
      const allocated = totalIncome * (Number(j.percentage) / 100);
      const spent = fExpenses.filter((e) => e.jar_id === j.id).reduce((s, e) => s + Number(e.amount), 0);
      return { id: j.id, key: j.key, name: j.name, color: j.color ?? JAR_COLORS[j.key] ?? "#888", percentage: Number(j.percentage), allocated, spent, net: allocated - spent };
    });
  }, [jars, fExpenses, totalIncome]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of fExpenses) m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amount));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fExpenses]);

  const CAT_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#0EA5E9", "#84CC16", "#A855F7"];

  // Savings growth: reconstruct each jar's balance over last 6 months end-of-month
  const growth = useMemo(() => {
    const points: { label: string; date: Date }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // last day of month
      points.push({ label: d.toLocaleString(undefined, { month: "short" }), date: d });
    }
    return points.map((p) => {
      const iso = isoDate(p.date);
      const row: Record<string, number | string> = { label: p.label };
      let total = 0;
      for (const j of jars) {
        const allocated = incomes
          .filter((r) => r.received_at <= iso)
          .reduce((s, r) => s + Number(r.amount) * (Number(j.percentage) / 100), 0);
        const spent = expenses
          .filter((e) => e.jar_id === j.id && e.spent_at <= iso)
          .reduce((s, e) => s + Number(e.amount), 0);
        const bal = Math.max(0, allocated - spent);
        row[j.name] = Math.round(bal * 100) / 100;
        total += bal;
      }
      row.Total = Math.round(total * 100) / 100;
      return row;
    });
  }, [jars, incomes, expenses]);

  // Insights
  const insights = useMemo(() => {
    const out: { tone: "good" | "warn" | "info"; text: string }[] = [];
    const totalLast = growth[growth.length - 2]?.Total as number | undefined;
    const totalNow = growth[growth.length - 1]?.Total as number | undefined;
    if (totalLast && totalNow && totalLast > 0) {
      const pct = ((totalNow - totalLast) / totalLast) * 100;
      if (pct >= 1) out.push({ tone: "good", text: `Your total savings grew ${pct.toFixed(1)}% this month.` });
      else if (pct <= -1) out.push({ tone: "warn", text: `Your total savings dropped ${Math.abs(pct).toFixed(1)}% this month.` });
    }
    // Overspend streaks per jar over last 3 months
    for (const j of jars) {
      let streak = 0;
      for (let i = 2; i >= 0; i--) {
        const ms = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const me = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
        const inc = incomes.filter((r) => r.received_at >= isoDate(ms) && r.received_at <= isoDate(me)).reduce((s, r) => s + Number(r.amount), 0);
        const alloc = inc * (Number(j.percentage) / 100);
        const sp = expenses.filter((e) => e.jar_id === j.id && e.spent_at >= isoDate(ms) && e.spent_at <= isoDate(me)).reduce((s, e) => s + Number(e.amount), 0);
        if (sp > alloc && alloc > 0) streak++; else streak = 0;
      }
      if (streak >= 2) out.push({ tone: "warn", text: `You overspent in ${j.name} ${streak} months in a row.` });
    }
    // Top category
    if (categoryData.length > 0 && totalExpense > 0) {
      const top = categoryData[0];
      const share = (top.value / totalExpense) * 100;
      if (share >= 30) out.push({ tone: "info", text: `${top.name} accounts for ${share.toFixed(0)}% of your spending this period.` });
    }
    if (savings > 0 && totalIncome > 0) {
      const rate = (savings / totalIncome) * 100;
      if (rate >= 20) out.push({ tone: "good", text: `Strong ${rate.toFixed(0)}% savings rate this period — keep going.` });
    }
    if (out.length === 0) out.push({ tone: "info", text: "Add more income and expenses to unlock personalized insights." });
    return out;
  }, [growth, jars, incomes, expenses, categoryData, totalExpense, totalIncome, savings, today]);

  function exportCSV() {
    const rows = [
      ...fIncomes.map((r) => ({ type: "income", date: r.received_at, amount: r.amount, category: r.source, note: r.note ?? "" })),
      ...fExpenses.map((r) => ({ type: "expense", date: r.spent_at, amount: r.amount, category: r.category, note: r.note ?? "" })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `jarwise-${from}_${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("JarWise Report", 14, 18);
    doc.setFontSize(10); doc.text(`${from} → ${to}`, 14, 25);
    let y = 36;
    doc.setFontSize(12); doc.text("Summary", 14, y); y += 6; doc.setFontSize(10);
    doc.text(`Income: ${formatCurrency(totalIncome, currency)}`, 14, y); y += 6;
    doc.text(`Expenses: ${formatCurrency(totalExpense, currency)}`, 14, y); y += 6;
    doc.text(`Net savings: ${formatCurrency(savings, currency)}`, 14, y); y += 10;

    doc.setFontSize(12); doc.text("Per-jar breakdown", 14, y); y += 6; doc.setFontSize(10);
    jarRows.forEach((j) => {
      doc.text(`${j.name} (${j.percentage}%)  alloc ${formatCurrency(j.allocated, currency)}  spent ${formatCurrency(j.spent, currency)}  net ${formatCurrency(j.net, currency)}`, 14, y);
      y += 6;
    });
    y += 4;

    doc.setFontSize(12); doc.text("Top categories", 14, y); y += 6; doc.setFontSize(10);
    categoryData.slice(0, 8).forEach((c) => { doc.text(`${c.name}: ${formatCurrency(c.value, currency)}`, 14, y); y += 6; });
    y += 4;

    doc.setFontSize(12); doc.text("Insights", 14, y); y += 6; doc.setFontSize(10);
    insights.forEach((i) => {
      const lines = doc.splitTextToSize(`• ${i.text}`, 180);
      doc.text(lines, 14, y); y += lines.length * 5 + 1;
    });
    doc.save(`jarwise-report-${from}_${to}.pdf`);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("common.reports")}</h1>
          <p className="text-sm text-muted-foreground">Understand where your money flows.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button variant="outline" onClick={exportPDF}><FileText className="mr-2 h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {([
              ["week", "This Week"], ["month", "This Month"], ["3m", "Last 3 Months"], ["custom", "Custom"],
            ] as [Preset, string][]).map(([p, label]) => (
              <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => applyPreset(p)}>
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Income" value={formatCurrency(totalIncome, currency)} accent="text-emerald-500" />
        <SummaryCard label="Expenses" value={formatCurrency(totalExpense, currency)} accent="text-red-500" />
        <SummaryCard label="Net savings" value={formatCurrency(savings, currency)} accent={savings >= 0 ? "text-emerald-500" : "text-red-500"} />
      </div>

      {/* Per-jar breakdown */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 font-medium">Per-jar breakdown</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3">Jar</th>
                <th className="py-2 pr-3">%</th>
                <th className="py-2 pr-3 text-right">Allocated</th>
                <th className="py-2 pr-3 text-right">Spent</th>
                <th className="py-2 pr-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {jarRows.map((j) => (
                <tr key={j.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: j.color }} />
                      {j.name}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{j.percentage}%</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(j.allocated, currency)}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(j.spent, currency)}</td>
                  <td className={`py-2 pr-3 text-right font-medium ${j.net >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {formatCurrency(j.net, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 font-medium">Expense breakdown</div>
          <div className="h-64">
            {categoryData.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No expenses in this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {categoryData.map((d, i) => <Cell key={d.name} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 font-medium">By category</div>
          {categoryData.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No expenses yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((c, i) => (
                  <tr key={c.name} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                        {c.name}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(c.value, currency)}</td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">
                      {totalExpense > 0 ? `${((c.value / totalExpense) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Savings growth */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 font-medium">Savings growth (last 6 months)</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              {jars.map((j) => (
                <Line key={j.id} type="monotone" dataKey={j.name} stroke={j.color ?? "#888"} strokeWidth={2} dot={false} />
              ))}
              <Line type="monotone" dataKey="Total" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-primary" /> Financial habit insights
        </div>
        <ul className="space-y-3">
          {insights.map((i, idx) => {
            const Icon = i.tone === "good" ? TrendingUp : i.tone === "warn" ? AlertTriangle : Lightbulb;
            const color = i.tone === "good" ? "text-emerald-500" : i.tone === "warn" ? "text-amber-500" : "text-sky-500";
            return (
              <li key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                <Icon className={`mt-0.5 h-4 w-4 ${color}`} />
                <div className="flex-1 text-sm">{i.text}</div>
                <Badge variant="outline" className="text-[10px] uppercase">{i.tone}</Badge>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${accent ?? ""}`}>{value}</div>
    </div>
  );
}