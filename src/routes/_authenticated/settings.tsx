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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
        <h1 className="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      {/* Preferences */}
      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="font-medium">{t("settings.preferences")}</div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("settings.currency")}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("settings.currencyHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("settings.theme")}</Label>
            <Select value={theme ?? "system"} onValueChange={setTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("settings.themeHint")}</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="font-medium">{t("settings.notifications")}</div>
          <p className="text-xs text-muted-foreground">{t("settings.notificationsDesc")}</p>
        </div>
        <ToggleRow
          label={t("settings.budgetWarn")}
          description={t("settings.budgetWarnDesc")}
          checked={prefs.budget_warnings}
          onChange={(v) => setPrefs((p) => ({ ...p, budget_warnings: v }))}
        />
        <ToggleRow
          label={t("settings.monthlySum")}
          description={t("settings.monthlySumDesc")}
          checked={prefs.monthly_summary}
          onChange={(v) => setPrefs((p) => ({ ...p, monthly_summary: v }))}
        />
        <ToggleRow
          label={t("settings.lowBal")}
          description={t("settings.lowBalDesc")}
          checked={prefs.low_balance}
          onChange={(v) => setPrefs((p) => ({ ...p, low_balance: v }))}
        />
      </div>

      {/* Jars automation */}
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <div className="font-medium">{t("settings.jarAutomation")}</div>
          <p className="text-xs text-muted-foreground">{t("settings.jarAutomationDesc")}</p>
        </div>
        <ToggleRow
          label={t("settings.monthlyResetTitle")}
          description={t("settings.monthlyResetDesc")}
          checked={monthlyReset}
          onChange={setMonthlyReset}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? t("settings.saving") : t("settings.saveChanges")}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="space-y-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <div>
          <div className="font-medium text-destructive">{t("settings.danger")}</div>
          <p className="text-xs text-muted-foreground">{t("settings.dangerDesc")}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> {t("settings.deleteAccount")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.deleteDialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("settings.deleteDialogDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); del.mutate(); }}
                disabled={del.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {del.isPending ? t("settings.deleting") : t("settings.confirmDelete")}
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