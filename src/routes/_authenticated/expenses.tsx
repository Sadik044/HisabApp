import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Trash2, TrendingDown, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

const CATEGORIES = ["Food", "Rent", "Internet", "Education", "Travel", "Entertainment", "Other"] as const;
type Category = (typeof CATEGORIES)[number];

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — JarWise" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
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
  const currency = profile?.currency ?? "BDT";

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
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
  const [category, setCategory] = useState<Category>("Food");
  const [note, setNote] = useState("");
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));

  const [filterJar, setFilterJar] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [editing, setEditing] = useState<null | { id: string; amount: string; jar_id: string; category: Category; note: string; spent_at: string }>(null);
  const [confirmOverride, setConfirmOverride] = useState<null | { message: string }>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["expenses", userId] });
    qc.invalidateQueries({ queryKey: ["jars", userId] });
    qc.invalidateQueries({ queryKey: ["monthly", userId] });
  };

  const add = useMutation({
    mutationFn: async (_opts?: { override?: boolean }) => {
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
      setConfirmOverride(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const amt = Number(editing.amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      if (!editing.jar_id) throw new Error("Pick a jar");
      const { error } = await supabase.from("expenses").update({
        amount: amt,
        jar_id: editing.jar_id,
        category: editing.category,
        note: editing.note || null,
        spent_at: editing.spent_at,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense updated — jars rebalanced");
      setEditing(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense deleted — jar balance restored");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filterJar !== "all" && e.jar_id !== filterJar) return false;
      if (filterCat !== "all" && e.category !== filterCat) return false;
      if (fromDate && e.spent_at < fromDate) return false;
      if (toDate && e.spent_at > toDate) return false;
      return true;
    });
  }, [expenses, filterJar, filterCat, fromDate, toDate]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTotal = expenses
    .filter((r) => new Date(r.spent_at) >= monthStart)
    .reduce((s, r) => s + Number(r.amount), 0);
  const monthlyCount = expenses.filter((r) => new Date(r.spent_at) >= monthStart).length;
  const monthLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });

  const selectedJar = jars.find((j) => j.id === jarId);
  const amtNum = Number(amount) || 0;
  const overdraft = selectedJar && amtNum > Number(selectedJar.balance);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amtNum || amtNum <= 0) return toast.error("Enter a valid amount");
    if (!jarId) return toast.error("Pick a jar");
    if (overdraft && selectedJar) {
      setConfirmOverride({
        message: `Amount ${formatCurrency(amtNum, currency)} exceeds ${selectedJar.name} balance (${formatCurrency(Number(selectedJar.balance), currency)}). Proceed anyway?`,
      });
      return;
    }
    add.mutate(undefined);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("common.expenses")}</h1>
        <p className="text-sm text-muted-foreground">Log spending and watch jars adjust in real-time.</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">This month · {monthLabel}</div>
            <div className="mt-1 text-3xl font-semibold">{formatCurrency(monthlyTotal, currency)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{monthlyCount} {monthlyCount === 1 ? "expense" : "expenses"}</div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-500/10 text-red-500">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form
          onSubmit={handleSubmit}
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
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
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
          {overdraft && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Exceeds {selectedJar?.name} balance ({formatCurrency(Number(selectedJar?.balance ?? 0), currency)}). You can still log it — we'll ask to confirm.
              </span>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={add.isPending}>{add.isPending ? "Saving…" : "Log expense"}</Button>
        </form>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="space-y-3 border-b px-5 py-4">
            <div className="font-medium">History</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={filterJar} onValueChange={setFilterJar}>
                <SelectTrigger><SelectValue placeholder="Jar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jars</SelectItem>
                  {jars.map((j) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To" />
            </div>
            {(filterJar !== "all" || filterCat !== "all" || fromDate || toDate) && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => { setFilterJar("all"); setFilterCat("all"); setFromDate(""); setToDate(""); }}
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="divide-y">
            {expensesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="🧾"
                  title={t("empty.expenseTitle")}
                  description={t("empty.expenseSub")}
                  ctaLabel={t("empty.expenseCta")}
                  onCtaClick={() => document.getElementById("amount")?.focus()}
                />
              </div>
            ) : (
              filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{r.category}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.spent_at} · {(r as any).jars?.name}{r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium text-red-500">-{formatCurrency(Number(r.amount), currency)}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit"
                    onClick={() => setEditing({
                      id: r.id,
                      amount: String(r.amount),
                      jar_id: r.jar_id,
                      category: (CATEGORIES as readonly string[]).includes(r.category) ? (r.category as Category) : "Other",
                      note: r.note ?? "",
                      spent_at: r.spent_at,
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit expense</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Jar</Label>
                <Select value={editing.jar_id} onValueChange={(v) => setEditing({ ...editing, jar_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {jars.map((j) => (<SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={editing.spent_at} onChange={(e) => setEditing({ ...editing, spent_at: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea rows={2} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmOverride} onOpenChange={(o) => !o && setConfirmOverride(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Over jar balance
            </DialogTitle>
            <DialogDescription>{confirmOverride?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOverride(null)}>Cancel</Button>
            <Button onClick={() => add.mutate({ override: true })} disabled={add.isPending}>
              {add.isPending ? "Logging…" : "Log anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}