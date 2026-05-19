import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import jsPDF from "jspdf";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — JarWise" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const userId = user!.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("currency").eq("id", userId).maybeSingle()).data,
  });
  const currency = profile?.currency ?? "USD";

  const { data: jars = [] } = useQuery({
    queryKey: ["jars", userId],
    queryFn: async () => (await supabase.from("jars").select("*").eq("user_id", userId).order("sort_order")).data ?? [],
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["all-incomes", userId],
    queryFn: async () => (await supabase.from("incomes").select("*").eq("user_id", userId)).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses", userId],
    queryFn: async () => (await supabase.from("expenses").select("*").eq("user_id", userId)).data ?? [],
  });

  // monthly trends (last 6 months)
  const months: { key: string; label: string; income: number; expense: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleString(undefined, { month: "short" }), income: 0, expense: 0 });
  }
  for (const r of incomes) {
    const k = r.received_at.slice(0, 7);
    const m = months.find((x) => x.key === k);
    if (m) m.income += Number(r.amount);
  }
  for (const r of expenses) {
    const k = r.spent_at.slice(0, 7);
    const m = months.find((x) => x.key === k);
    if (m) m.expense += Number(r.amount);
  }

  const jarDist = jars.map((j) => ({ name: j.name, value: Number(j.balance), color: j.color }));
  const totalJarBalance = jarDist.reduce((s, x) => s + x.value, 0);

  const catTotals = new Map<string, number>();
  for (const e of expenses) catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + Number(e.amount));
  const categories = Array.from(catTotals.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  function exportCSV() {
    const rows = [
      ...incomes.map((r) => ({ type: "income", date: r.received_at, amount: r.amount, category: r.source, note: r.note ?? "" })),
      ...expenses.map((r) => ({ type: "expense", date: r.spent_at, amount: r.amount, category: r.category, note: r.note ?? "" })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `jarwise-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("JarWise Report", 14, 18);
    doc.setFontSize(10); doc.text(new Date().toLocaleString(), 14, 25);
    let y = 36;
    doc.setFontSize(12); doc.text("Jar Balances", 14, y); y += 6;
    doc.setFontSize(10);
    jars.forEach((j) => { doc.text(`${j.name} (${j.percentage}%): ${formatCurrency(Number(j.balance), currency)}`, 14, y); y += 6; });
    y += 4;
    doc.setFontSize(12); doc.text("Monthly Totals", 14, y); y += 6;
    doc.setFontSize(10);
    months.forEach((m) => {
      doc.text(`${m.label}: +${formatCurrency(m.income, currency)} / -${formatCurrency(m.expense, currency)}`, 14, y);
      y += 6;
    });
    doc.save(`jarwise-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Understand where your money flows.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button variant="outline" onClick={exportPDF}><FileText className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 font-medium">Monthly trends (last 6 months)</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={months}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 font-medium">Income vs Expense</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Legend />
                <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 font-medium">Jar distribution</div>
          <div className="h-64">
            {totalJarBalance > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={jarDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {jarDist.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">Add some income to see distribution.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 font-medium">Category breakdown</div>
        {categories.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No expenses yet.</div>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => {
              const max = categories[0].value;
              return (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(c.value, currency)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${(c.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}