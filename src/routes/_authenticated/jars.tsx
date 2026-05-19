import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { motion } from "framer-motion";

const JAR_DESCRIPTIONS: Record<string, string> = {
  NEC: "Day-to-day essentials — rent, food, bills, transport.",
  LTSS: "Save up for big future purchases like a car, home, or vacation.",
  EDU: "Invest in yourself — books, courses, coaching, skills.",
  PLAY: "Guilt-free fun — treat yourself and enjoy life today.",
  FFA: "Financial freedom — investments and passive income, never spent.",
  GIVE: "Generosity — charity, gifts, and helping others.",
};

export const Route = createFileRoute("/_authenticated/jars")({
  head: () => ({ meta: [{ title: "Jars — JarWise" }] }),
  component: JarsPage,
});

function JarsPage() {
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

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-expenses", userId],
    queryFn: async () =>
      (await supabase.from("expenses").select("id,jar_id,amount,category,spent_at").eq("user_id", userId).order("spent_at", { ascending: false }).limit(50)).data ?? [],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">The 6 Jars</h1>
        <p className="text-sm text-muted-foreground">Your money split by purpose, the proven way.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jars.map((j, i) => {
          const items = recent.filter((r) => r.jar_id === j.id).slice(0, 3);
          return (
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
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {JAR_DESCRIPTIONS[j.key] ?? ""}
              </p>
              <div className="mt-3 text-3xl font-semibold">{formatCurrency(Number(j.balance), currency)}</div>
              <div className="mt-4 space-y-1.5">
                {items.length === 0 && <div className="text-xs text-muted-foreground">No recent activity</div>}
                {items.map((e) => (
                  <div key={e.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{e.category} · {e.spent_at}</span>
                    <span className="text-red-500">-{formatCurrency(Number(e.amount), currency)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}