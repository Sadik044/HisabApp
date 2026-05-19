import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — JarWise" }] }),
  component: IncomePage,
});

function IncomePage() {
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

  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes", userId],
    queryFn: async () =>
      (await supabase.from("incomes").select("*").eq("user_id", userId).order("received_at", { ascending: false }).limit(100)).data ?? [],
  });

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));

  const add = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("incomes").insert({
        user_id: userId,
        amount: amt,
        source: source || "Income",
        note: note || null,
        received_at: receivedAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income added — distributed across jars");
      setAmount(""); setSource(""); setNote("");
      qc.invalidateQueries({ queryKey: ["incomes", userId] });
      qc.invalidateQueries({ queryKey: ["jars", userId] });
      qc.invalidateQueries({ queryKey: ["monthly", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("incomes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income deleted");
      qc.invalidateQueries({ queryKey: ["incomes", userId] });
      qc.invalidateQueries({ queryKey: ["jars", userId] });
    },
  });

  const amtNum = Number(amount) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Income</h1>
        <p className="text-sm text-muted-foreground">Log income — it's auto-split across your 6 jars.</p>
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
            <Label htmlFor="source">Source</Label>
            <Input id="source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Salary, freelance, etc." />
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