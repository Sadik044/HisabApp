import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/translation.json";
import bn from "@/locales/bn/translation.json";

export const SUPPORTED_LANGS = ["en", "bn"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        bn: { translation: bn },
      },
      lng: "en",
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
    });
  // Note: we intentionally start with "en" on both SSR and the first client
  // render so hydration matches. The persisted language (if any) is applied
  // after mount by <LanguageSync /> via setAppLanguage().
}

export function applyLangSideEffects(lang: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  if (lang === "bn") {
    document.documentElement.classList.add("font-bengali");
  } else {
    document.documentElement.classList.remove("font-bengali");
  }
}

export function setAppLanguage(lang: AppLanguage) {
  void i18n.changeLanguage(lang);
  if (typeof window !== "undefined") {
    localStorage.setItem("language", lang);
  }
  applyLangSideEffects(lang);
}

export default i18n;