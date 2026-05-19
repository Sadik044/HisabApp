import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const CATEGORIES = ["Food", "Rent", "Utilities", "Transport", "Shopping", "Entertainment", "Health", "Education", "Other"];

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — JarWise" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();

  const { data: jars = [] } = useQuery({
    queryKey: ["jars", userId],
    queryFn: async () => (await supabase.from("jars").select("*").eq("user_id", userId).order("sort_order")).data ?? [],
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("currency").eq("id", userId).maybeSingle()).data,
  });
  const currency = profile?.currency ?? "USD";

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", userId],
    queryFn: async () =>
      (await supabase
        .from("expenses")
        .select("*, jars(name, key, color)")
        .eq("user_id", userId)
        .order("spent_at", { ascending: false })
        .limit(200)).data ?? [],
  });

  const [amount, setAmount] = useState("");
  const [jarId, setJarId] = useState("");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));
  const [filterJar, setFilterJar] = useState<string>("all");

  const add = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      if (!jarId) throw new Error("Pick a jar");
      const { error } = await supabase.from("expenses").insert({
        user_id: userId, jar_id: jarId, amount: amt, category, note: note || null, spent_at: spentAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense logged");
      setAmount(""); setNote("");
      qc.invalidateQueries({ queryKey: ["expenses", userId] });
      qc.invalidateQueries({ queryKey: ["jars", userId] });
      qc.invalidateQueries({ queryKey: ["monthly", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", userId] });
      qc.invalidateQueries({ queryKey: ["jars", userId] });
    },
  });

  const filtered = filterJar === "all" ? expenses : expenses.filter((e) => e.jar_id === filterJar);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-sm text-muted-foreground">Log spending and watch jars adjust in real-time.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
          className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Jar</Label>
            <Select value={jarId} onValueChange={setJarId}>
              <SelectTrigger><SelectValue placeholder="Pick a jar" /></SelectTrigger>
              <SelectContent>
                {jars.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.name} — {formatCurrency(Number(j.balance), currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={add.isPending}>{add.isPending ? "Saving…" : "Log expense"}</Button>
        </form>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="font-medium">History</div>
            <Select value={filterJar} onValueChange={setFilterJar}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jars</SelectItem>
                {jars.map((j) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="divide-y">
            {filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No expenses yet.</div>}
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{r.category}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.spent_at} · {(r as any).jars?.name}{r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium text-red-500">-{formatCurrency(Number(r.amount), currency)}</div>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}