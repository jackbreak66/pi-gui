import { useSyncExternalStore } from "react";
import { enUs, type TranslationKey } from "./en-us";
import { zhCn } from "./zh-cn";

export type { TranslationKey };

/*
 * The one place the renderer's UI language lives. The setting persists in
 * localStorage (the same pattern as `pi-gui.last-theme`), `auto` follows the
 * OS language, and every other window of the same app is kept in sync through
 * the `storage` event. `t()` is also callable outside React so plain helpers
 * can translate; components re-render through `useI18n()`.
 */

export const languageIds = ["en-US", "zh-CN"] as const;
export type LanguageId = (typeof languageIds)[number];
/** What the user picked in Settings; `auto` follows the operating system. */
export type LanguageSetting = "auto" | LanguageId;

const STORAGE_KEY = "pi-gui.language";

export interface I18nApi {
  /** The language messages are shown in right now. */
  readonly language: LanguageId;
  /** The stored preference, `auto` included. */
  readonly languageSetting: LanguageSetting;
  readonly setLanguageSetting: (setting: LanguageSetting) => void;
  readonly t: typeof t;
}

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return (
    value === "auto" || (typeof value === "string" && languageIds.includes(value as LanguageId))
  );
}

/**
 * Resolves the OS preference; anything not Chinese falls back to English.
 * Automated sessions (Playwright) resolve to English so specs that assert
 * English copy stay locale-independent on any OS language.
 */
export function resolveSystemLanguage(): LanguageId {
  if (typeof navigator === "undefined") return "en-US";
  if (navigator.webdriver) return "en-US";
  const languages =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language ?? ""];
  for (const candidate of languages) {
    if (candidate.toLowerCase().startsWith("zh")) return "zh-CN";
  }
  return "en-US";
}

let setting: LanguageSetting = loadSetting();
let language: LanguageId = setting === "auto" ? resolveSystemLanguage() : setting;
let api: I18nApi = createApi();
const listeners = new Set<() => void>();

export function getLanguageSetting(): LanguageSetting {
  return setting;
}

export function getLanguage(): LanguageId {
  return language;
}

export function setLanguageSetting(next: LanguageSetting): void {
  if (!isLanguageSetting(next) || next === setting) return;
  setting = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable; the choice then lasts for this launch.
  }
  applySetting();
}

/**
 * Looks up `key` in the active dictionary, falling back to English, and
 * interpolates `{param}` placeholders.
 */
export function t(key: TranslationKey, params?: Readonly<Record<string, string | number>>): string {
  const value = (language === "zh-CN" ? zhCn[key] : undefined) ?? enUs[key];
  if (value === undefined) return key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

export function useI18n(): I18nApi {
  return useSyncExternalStore(subscribe, getApi);
}

function getApi(): I18nApi {
  return api;
}

function createApi(): I18nApi {
  return { language, languageSetting: setting, setLanguageSetting, t };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function applySetting(): void {
  const nextLanguage = setting === "auto" ? resolveSystemLanguage() : setting;
  const languageChanged = nextLanguage !== language;
  // An explicit pick that resolves to the same language (auto zh-CN → 简体中文)
  // must still refresh subscribers, or the setting control shows a stale value.
  const settingChanged = api.languageSetting !== setting;
  language = nextLanguage;
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
  if (languageChanged || settingChanged) {
    api = createApi();
    for (const listener of listeners) listener();
  }
}

function loadSetting(): LanguageSetting {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguageSetting(saved)) return saved;
  } catch {
    // No storage yet (tests, first paint); follow the system language.
  }
  return "auto";
}

if (typeof window !== "undefined") {
  // Other windows of the same app write the same localStorage key.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const saved = event.newValue;
    if (isLanguageSetting(saved) && saved !== setting) {
      setting = saved;
      applySetting();
    }
  });
  // Auto mode follows the OS while the app is open.
  window.addEventListener("languagechange", () => {
    if (setting === "auto") applySetting();
  });
}

applySetting();
