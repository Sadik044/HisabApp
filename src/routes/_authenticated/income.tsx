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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Trash2, TrendingUp } from "lucide-react";

const CATEGORIES = ["Salary", "Freelance", "Business", "Investment", "Other"] as const;
type Category = (typeof CATEGORIES)[number];

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — JarWise" }] }),
  component: IncomePage,
});

function IncomePage() {
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

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes", userId],
    queryFn: async () =>
      (await supabase.from("incomes").select("*").eq("user_id", userId).order("received_at", { ascending: false }).limit(100)).data ?? [],
  });

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Salary");
  const [note, setNote] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));

  const [editing, setEditing] = useState<null | { id: string; amount: string; category: Category; note: string; received_at: string }>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["incomes", userId] });
    qc.invalidateQueries({ queryKey: ["jars", userId] });
    qc.invalidateQueries({ queryKey: ["monthly", userId] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("incomes").insert({
        user_id: userId,
        amount: amt,
        source: category,
        note: note || null,
        received_at: receivedAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income added — distributed across jars");
      setAmount(""); setNote("");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const amt = Number(editing.amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("incomes").update({
        amount: amt,
        source: editing.category,
        note: editing.note || null,
        received_at: editing.received_at,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income updated — jars rebalanced");
      setEditing(null);
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("incomes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income deleted — jar balances reversed");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const amtNum = Number(amount) || 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTotal = incomes
    .filter((r) => new Date(r.received_at) >= monthStart)
    .reduce((s, r) => s + Number(r.amount), 0);
  const monthlyCount = incomes.filter((r) => new Date(r.received_at) >= monthStart).length;
  const monthLabel = now.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("common.income")}</h1>
        <p className="text-sm text-muted-foreground">Log income — it's auto-split across your 6 jars.</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">This month · {monthLabel}</div>
            <div className="mt-1 text-3xl font-semibold">{formatCurrency(monthlyTotal, currency)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{monthlyCount} {monthlyCount === 1 ? "entry" : "entries"}</div>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
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
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={add.isPending}>
            {add.isPending ? "Adding…" : "Add income"}
          </Button>
          {amtNum > 0 && (
            <div className="rounded-lg bg-secondary/60 p-3 text-xs">
              <div className="mb-2 font-medium">Will distribute as:</div>
              <div className="grid grid-cols-2 gap-1">
                {jars.map((j) => (
                  <div key={j.id} className="flex justify-between">
                    <span className="text-muted-foreground">{j.key}</span>
                    <span>{formatCurrency((amtNum * Number(j.percentage)) / 100, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4 font-medium">History</div>
          <div className="divide-y">
            {incomes.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">No income yet.</div>
            )}
            {incomes.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{r.source}</div>
                  <div className="text-xs text-muted-foreground">{r.received_at}{r.note ? ` · ${r.note}` : ""}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium text-emerald-500">+{formatCurrency(Number(r.amount), currency)}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit"
                    onClick={() => setEditing({
                      id: r.id,
                      amount: String(r.amount),
                      category: (CATEGORIES as readonly string[]).includes(r.source) ? (r.source as Category) : "Other",
                      note: r.note ?? "",
                      received_at: r.received_at,
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit income</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} />
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
                <Input type="date" value={editing.received_at} onChange={(e) => setEditing({ ...editing, received_at: e.target.value })} />
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
    </div>
  );
}