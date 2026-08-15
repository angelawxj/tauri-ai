export type Language = "zh" | "en";

export const LANGUAGE_STORAGE_KEY = "language";

export function detectLanguage(): Language {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
  if (stored === "zh" || stored === "en") return stored;
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav.toLowerCase().startsWith("zh") ? "zh" : "en";
}
