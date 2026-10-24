import { expect, test } from "@playwright/test";
import { enUs, type TranslationKey } from "../../src/i18n/en-us";
import { zhCn } from "../../src/i18n/zh-cn";
import {
  getLanguage,
  getLanguageSetting,
  isLanguageSetting,
  languageIds,
  resolveSystemLanguage,
  setLanguageSetting,
  t,
  type LanguageSetting,
} from "../../src/i18n";

/*
 * The i18n store is a module singleton, and this spec runs in Node where
 * localStorage is undefined: switching languages must work without storage
 * (the choice then lasts for this launch), mirroring the browser fallback.
 */

test.afterEach(() => {
  setLanguageSetting("en-US");
  setLanguageSetting("auto");
});

test("the zh dictionary covers every en key and vice versa", () => {
  const enKeys = Object.keys(enUs) as TranslationKey[];
  expect(enKeys.length).toBeGreaterThan(300);
  for (const key of enKeys) {
    expect(zhCn[key], `missing zh translation for ${key}`).toBeTruthy();
  }
  expect(Object.keys(zhCn).sort()).toEqual(enKeys.sort());
});

test("every entry is a non-empty string in both dictionaries", () => {
  for (const [key, value] of Object.entries(enUs)) {
    expect(typeof value, `en ${key}`).toBe("string");
    expect((value as string).length, `en ${key}`).toBeGreaterThan(0);
  }
  for (const [key, value] of Object.entries(zhCn)) {
    expect(typeof value, `zh ${key}`).toBe("string");
    expect((value as string).length, `zh ${key}`).toBeGreaterThan(0);
  }
});

test("interpolation replaces {param} and keeps unknown params verbatim", () => {
  setLanguageSetting("en-US");
  expect(t("composer.mentionCommands", { count: 3 })).toContain("3");
  expect(t("scheduled.everyDays", { count: 5 })).toBe("Every 5 days");
  expect(t("scheduled.everyDays", {})).toBe("Every {count} days");
  expect(t("scheduled.everyDays", { other: "x" })).toBe("Every {count} days");
});

test("switching the setting switches the language immediately, without storage", () => {
  expect(isLanguageSetting("zh-CN")).toBe(true);
  expect(isLanguageSetting("auto")).toBe(true);
  expect(isLanguageSetting("fr-FR")).toBe(false);
  expect(isLanguageSetting(null)).toBe(false);

  setLanguageSetting("zh-CN");
  expect(getLanguageSetting()).toBe("zh-CN");
  expect(getLanguage()).toBe("zh-CN");
  expect(t("scheduled.setUpTask")).toBe("创建定时任务");

  setLanguageSetting("en-US");
  expect(getLanguage()).toBe("en-US");
  expect(t("scheduled.setUpTask")).toBe("Set up scheduled task");
});

test("invalid settings are ignored and auto resolves the OS language", () => {
  setLanguageSetting("zh-CN");
  setLanguageSetting("fr-FR" as LanguageSetting);
  expect(getLanguageSetting()).toBe("zh-CN");

  setLanguageSetting("auto");
  expect(getLanguageSetting()).toBe("auto");
  expect(languageIds).toContain(getLanguage());
});

test("resolveSystemLanguage maps zh* to zh-CN and everything else to en-US", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const withLanguages = (languages: readonly string[]) => {
    Object.defineProperty(globalThis, "navigator", {
      value: { languages, language: languages[0] },
      configurable: true,
    });
  };
  try {
    withLanguages(["zh-TW", "en"]);
    expect(resolveSystemLanguage()).toBe("zh-CN");
    // Any Chinese candidate selects Chinese, not just the first preference.
    withLanguages(["en-US", "zh-CN"]);
    expect(resolveSystemLanguage()).toBe("zh-CN");
    withLanguages(["fr"]);
    expect(resolveSystemLanguage()).toBe("en-US");
    withLanguages([]);
    expect(resolveSystemLanguage()).toBe("en-US");
    // Automated sessions resolve to English so specs can assert English copy.
    Object.defineProperty(globalThis, "navigator", {
      value: { languages: ["zh-CN"], language: "zh-CN", webdriver: true },
      configurable: true,
    });
    expect(resolveSystemLanguage()).toBe("en-US");
  } finally {
    Object.defineProperty(
      globalThis,
      "navigator",
      original ?? { value: undefined, configurable: true },
    );
  }
});

test("an unknown key falls back to itself instead of throwing", () => {
  setLanguageSetting("zh-CN");
  expect(t("totally.missing" as TranslationKey)).toBe("totally.missing");
  setLanguageSetting("en-US");
  expect(t("also.missing" as TranslationKey, { count: 1 })).toBe("also.missing");
});
