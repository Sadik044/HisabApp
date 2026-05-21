import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRightLeft, Settings2, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

export const JAR_EMOJIS: Record<string, string> = {
  NEC: "🏠",
  FFA: "💰",
  EDU: "📚",
  LTSS: "🎯",
  PLAY: "🎮",
  GIVE: "🤝",
};

export const JAR_DESCRIPTIONS: Record<string, string> = {
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
  const { t } = useTranslation();
  const userId = user!.id;
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("currency").eq("id", userId).maybeSingle()).data,
  });
  const currency = profile?.currency ?? "BDT";

  const { data: jars = [], isLoading: jarsLoading } = useQuery({
    queryKey: ["jars", userId],
    queryFn: async () => (await supabase.from("jars").select("*").eq("user_id", userId).order("sort_order")).data ?? [],
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);
  const { data: monthlyIncome = 0 } = useQuery({
    queryKey: ["monthly-income-total", userId, monthStart],
    queryFn: async () => {
      const { data } = await supabase.from("incomes").select("amount").eq("user_id", userId).gte("received_at", monthStart);
      return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    },
  });

  const [transferOpen, setTransferOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const totalBalance = jars.reduce((s, j) => s + Number(j.balance), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("nav.jars")}</h1>
          <p className="text-sm text-muted-foreground">Your money split by purpose, the proven way.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer
          </Button>
          <Button variant="outline" onClick={() => setCustomizeOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" /> Customize %
          </Button>
        </div>
      </div>

      {jarsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <Skeleton className="h-3 w-3 rounded-full" />
              </div>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ) : totalBalance === 0 ? (
        <EmptyState
          icon="🏺"
          title={t("empty.jarsTitle")}
          description={t("empty.jarsSub")}
          ctaLabel={t("empty.jarsCta")}
          ctaTo="/income"
        />
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jars.map((j, i) => {
          const goal = (monthlyIncome * Number(j.percentage)) / 100;
          const pct = goal > 0 ? Math.max(0, Math.min(100, (Number(j.balance) / goal) * 100)) : 0;
          const lowBalance = goal > 0 && Number(j.balance) < goal * 0.1;
          return (
            <motion.div
              key={j.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-colors",
                lowBalance && "border-amber-500/50",
              )}
            >
              {lowBalance && (
                <div className="-mx-5 -mt-5 mb-4 flex items-center gap-2 rounded-t-2xl border-b border-amber-500/30 bg-amber-500/10 px-5 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Low balance — under 10% of this month's allocation
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl leading-none">{JAR_EMOJIS[j.key] ?? "🫙"}</div>
                  <div>
                    <div className="text-xs text-muted-foreground">{j.key} · {Number(j.percentage)}%</div>
                    <div className="font-medium">{j.name}</div>
                  </div>
                </div>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: j.color }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {JAR_DESCRIPTIONS[j.key] ?? ""}
              </p>
              <div className="mt-3 text-3xl font-semibold">{formatCurrency(Number(j.balance), currency)}</div>
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>vs this month's allocation</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} />
                <div className="text-[11px] text-muted-foreground">Goal: {formatCurrency(goal, currency)}</div>
              </div>
              <div className="mt-4">
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/jars/$jarId" params={{ jarId: j.id }}>
                    View details <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} jars={jars} currency={currency} userId={userId} qc={qc} />
      <CustomizeDialog open={customizeOpen} onOpenChange={setCustomizeOpen} jars={jars} qc={qc} userId={userId} />
    </div>
  );
}

function TransferDialog({ open, onOpenChange, jars, currency, userId, qc }: {
  open: boolean; onOpenChange: (o: boolean) => void; jars: any[]; currency: string; userId: string; qc: ReturnType<typeof useQueryClient>;
}) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => { if (!open) { setFromId(""); setToId(""); setAmount(""); setNote(""); } }, [open]);

  const from = jars.find((j) => j.id === fromId);
  const to = jars.find((j) => j.id === toId);
  const amt = Number(amount) || 0;

  const transfer = useMutation({
    mutationFn: async () => {
      if (!from || !to) throw new Error("Pick both jars");
      if (from.id === to.id) throw new Error("Source and destination must differ");
      if (amt <= 0) throw new Error("Enter a valid amount");
      const newFrom = Number(from.balance) - amt;
      const newTo = Number(to.balance) + amt;
      const { error: e1 } = await supabase.from("jars").update({ balance: newFrom }).eq("id", from.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("jars").update({ balance: newTo }).eq("id", to.id);
      if (e2) {
        await supabase.from("jars").update({ balance: Number(from.balance) }).eq("id", from.id);
        throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Transfer complete");
      qc.invalidateQueries({ queryKey: ["jars", userId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overdraft = from && amt > Number(from.balance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer between jars</DialogTitle>
          <DialogDescription>Move money from one jar to another. This doesn't change your income.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger><SelectValue placeholder="Source jar" /></SelectTrigger>
                <SelectContent>
                  {jars.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.name} — {formatCurrency(Number(j.balance), currency)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger><SelectValue placeholder="Destination jar" /></SelectTrigger>
                <SelectContent>
                  {jars.filter((j) => j.id !== fromId).map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.name} — {formatCurrency(Number(j.balance), currency)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {overdraft && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Exceeds {from?.name} balance ({formatCurrency(Number(from?.balance ?? 0), currency)}). It will go negative.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => transfer.mutate()} disabled={transfer.isPending}>
            {transfer.isPending ? "Transferring…" : "Confirm transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomizeDialog({ open, onOpenChange, jars, qc, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; jars: any[]; qc: ReturnType<typeof useQueryClient>; userId: string;
}) {
  const [vals, setVals] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const next: Record<string, string> = {};
      jars.forEach((j) => { next[j.id] = String(j.percentage); });
      setVals(next);
    }
  }, [open, jars]);

  const total = Object.values(vals).reduce((s, v) => s + (Number(v) || 0), 0);
  const valid = Math.abs(total - 100) < 0.001;

  const save = useMutation({
    mutationFn: async () => {
      if (!valid) throw new Error(`Percentages must total 100% (currently ${total}%)`);
      for (const j of jars) {
        const next = Number(vals[j.id]);
        if (next === Number(j.percentage)) continue;
        const { error } = await supabase.from("jars").update({ percentage: next }).eq("id", j.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Jar percentages updated");
      qc.invalidateQueries({ queryKey: ["jars", userId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize jar percentages</DialogTitle>
          <DialogDescription>Adjust the split for future income. Total must equal 100%.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {jars.map((j) => (
            <div key={j.id} className="flex items-center gap-3">
              <div className="w-8 text-xl">{JAR_EMOJIS[j.key] ?? "🫙"}</div>
              <div className="flex-1 text-sm">{j.name}</div>
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                className="w-24"
                value={vals[j.id] ?? ""}
                onChange={(e) => setVals({ ...vals, [j.id]: e.target.value })}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}
          <div className={`flex justify-between rounded-lg px-3 py-2 text-sm ${valid ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            <span>Total</span>
            <span className="font-medium">{total}%</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!valid || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}