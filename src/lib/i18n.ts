import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/locales/en/translation.json";
import bn from "@/locales/bn/translation.json";

export const SUPPORTED_LANGS = ["en", "bn"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        bn: { translation: bn },
      },
      fallbackLng: "en",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "language",
        caches: ["localStorage"],
      },
    });
  // Apply side effects (font + html lang) before first render.
  if (typeof document !== "undefined") {
    applyLangSideEffects(i18n.resolvedLanguage ?? "en");
  }
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