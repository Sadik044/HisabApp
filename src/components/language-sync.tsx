import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { applyLangSideEffects, setAppLanguage, type AppLanguage } from "@/lib/i18n";

/**
 * Syncs the active i18n language with:
 *  - localStorage (handled by i18next detector)
 *  - the logged-in user's profile.language column
 * Also applies the Bengali font side-effect on language change.
 */
export function LanguageSync() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  // Apply the font/lang attribute whenever the active language changes.
  useEffect(() => {
    applyLangSideEffects(i18n.resolvedLanguage ?? "en");
    const handler = (lng: string) => applyLangSideEffects(lng);
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  // Pull profile.language for the signed-in user and adopt it.
  const { data } = useQuery({
    queryKey: ["profile-language", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user!.id)
        .maybeSingle();
      return (data?.language as AppLanguage | undefined) ?? null;
    },
  });

  useEffect(() => {
    if (!data) return;
    if (data !== i18n.resolvedLanguage) {
      setAppLanguage(data);
    }
  }, [data, i18n.resolvedLanguage]);

  return null;
}