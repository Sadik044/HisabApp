import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  // Track which user's profile language we've already adopted, so we don't
  // keep overwriting the user's in-session toggle with the stored value.
  const adoptedForUser = useRef<string | null>(null);

  // On client mount, adopt the persisted language from localStorage. This
  // runs AFTER hydration so SSR/CSR markup matches on the first render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("language") as AppLanguage | null;
    if (saved && saved !== i18n.resolvedLanguage) {
      setAppLanguage(saved);
    } else {
      applyLangSideEffects(i18n.resolvedLanguage ?? "en");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply the font/lang attribute whenever the active language changes.
  useEffect(() => {
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

  // Adopt the stored profile language exactly ONCE per signed-in user.
  // After that, the navbar switcher is the source of truth for this session
  // (it writes through to localStorage + profiles).
  useEffect(() => {
    if (!user) {
      adoptedForUser.current = null;
      return;
    }
    if (!data) return;
    if (adoptedForUser.current === user.id) return;
    adoptedForUser.current = user.id;

    // Prefer an explicit in-session choice from localStorage over the stored
    // profile value, so toggling before/after login feels consistent.
    const localChoice =
      typeof window !== "undefined"
        ? (localStorage.getItem("language") as AppLanguage | null)
        : null;
    const target: AppLanguage = localChoice ?? data;
    if (target !== i18n.resolvedLanguage) {
      setAppLanguage(target);
    }
    // Keep the cached profile value in sync with the resolved choice so the
    // switcher doesn't see a stale value on next read.
    if (target !== data) {
      void supabase.from("profiles").update({ language: target }).eq("id", user.id);
      queryClient.setQueryData(["profile-language", user.id], target);
    }
  }, [user, data, i18n, queryClient]);

  return null;
}