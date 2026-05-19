import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setAppLanguage, type AppLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const current = (i18n.resolvedLanguage ?? "en") as AppLanguage;

  async function pick(lang: AppLanguage) {
    setAppLanguage(lang);
    if (user) {
      await supabase.from("profiles").update({ language: lang }).eq("id", user.id);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" aria-label="Change language">
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">
            {current === "bn" ? "বাং" : "EN"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => pick("en")} className={current === "en" ? "font-semibold" : ""}>
          🇬🇧 English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => pick("bn")} className={current === "bn" ? "font-semibold" : ""}>
          🇧🇩 বাংলা
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}