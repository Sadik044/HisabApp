import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JarWise" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const userId = user!.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });
  const currency = profile?.currency ?? "USD";

  const { data: jars = [] } = useQuery({
    queryKey: ["jars", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jars").select("*").eq("user_id", userId).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: monthly } = useQuery({
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

  const totalBalance = jars.reduce((s, j) => s + Number(j.balance), 0);
  const maxBalance = Math.max(1, ...jars.map((j) => Number(j.balance)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Here's your money at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Total balance" value={formatCurrency(totalBalance, currency)} />
        <StatCard icon={ArrowDownToLine} label="Income (this month)" value={formatCurrency(monthly?.income ?? 0, currency)} accent="text-emerald-500" />
        <StatCard icon={ArrowUpFromLine} label="Expenses (this month)" value={formatCurrency(monthly?.expense ?? 0, currency)} accent="text-red-500" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Your jars</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jars.map((j, i) => (
            <motion.div
              key={j.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{j.key} · {Number(j.percentage)}%</div>
                  <div className="font-medium">{j.name}</div>
                </div>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: j.color }} />
              </div>
              <div className="mt-3 text-2xl font-semibold">{formatCurrency(Number(j.balance), currency)}</div>
              <Progress value={(Number(j.balance) / maxBalance) * 100} className="mt-3" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        <Icon className={`h-4 w-4 ${accent ?? ""}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}