import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/lib/account.functions";

const CURRENCIES = [
  { code: "BDT", label: "Bangladeshi Taka (৳)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
];

type NotifPrefs = {
  budget_warnings: boolean;
  monthly_summary: boolean;
  low_balance: boolean;
};

const DEFAULT_PREFS: NotifPrefs = { budget_warnings: true, monthly_summary: true, low_balance: true };

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — JarWise" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const deleteAccountFn = useServerFn(deleteAccount);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });

  const [currency, setCurrency] = useState("BDT");
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [monthlyReset, setMonthlyReset] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (profile.currency) setCurrency(profile.currency);
    if (profile.theme_preference && theme !== profile.theme_preference) setTheme(profile.theme_preference);
    const raw = (profile as { notification_prefs?: Partial<NotifPrefs> }).notification_prefs;
    if (raw) setPrefs({ ...DEFAULT_PREFS, ...raw });
    setMonthlyReset(Boolean((profile as { monthly_reset?: boolean }).monthly_reset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        currency,
        theme_preference: theme ?? "system",
        notification_prefs: prefs,
        monthly_reset: monthlyReset,
      }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      await deleteAccountFn({});
    },
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your preferences.</p>
      </div>

      {/* Preferences */}
      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="font-medium">Preferences</div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used to format every amount shown in the app.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={theme ?? "system"} onValueChange={setTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Persisted to your profile.</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="font-medium">Notifications</div>
          <p className="text-xs text-muted-foreground">Choose which alerts you want to receive.</p>
        </div>
        <ToggleRow
          label="Budget warnings"
          description="Get alerted when an expense exceeds the chosen jar balance."
          checked={prefs.budget_warnings}
          onChange={(v) => setPrefs((p) => ({ ...p, budget_warnings: v }))}
        />
        <ToggleRow
          label="Monthly summary"
          description="Receive a recap of income, expenses, and savings every month."
          checked={prefs.monthly_summary}
          onChange={(v) => setPrefs((p) => ({ ...p, monthly_summary: v }))}
        />
        <ToggleRow
          label="Jar low balance alerts"
          description="Be notified when any jar's balance drops to near zero."
          checked={prefs.low_balance}
          onChange={(v) => setPrefs((p) => ({ ...p, low_balance: v }))}
        />
      </div>

      {/* Jars automation */}
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="font-medium">Jar automation</div>
          <p className="text-xs text-muted-foreground">Control how your jars behave over time.</p>
        </div>
        <ToggleRow
          label="Monthly reset"
          description="On the 1st of each month, reset all jar balances to 0 before applying new income."
          checked={monthlyReset}
          onChange={setMonthlyReset}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="space-y-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <div>
          <div className="font-medium text-destructive">Danger zone</div>
          <p className="text-xs text-muted-foreground">Permanent actions. Proceed with caution.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes your profile, jars, income, and expense history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); del.mutate(); }}
                disabled={del.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {del.isPending ? "Deleting…" : "Yes, delete forever"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}