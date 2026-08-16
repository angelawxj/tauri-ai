import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectLanguage, LANGUAGE_STORAGE_KEY, type Language } from "./language";
import { translations, type TranslationDict } from "./translations";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: TranslationDict;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(detectLanguage);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    // Generic hook for self-contained feature packages (source-control, explorer, ...)
    // that keep their own i18n copy in sync with the host's language toggle.
    window.dispatchEvent(new Event("app-language-change"));
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang((l) => (l === "zh" ? "en" : "zh")),
      t: translations[lang],
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
