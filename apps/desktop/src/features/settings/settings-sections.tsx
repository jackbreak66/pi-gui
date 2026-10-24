import type { ReactNode } from "react";
import {
  BellIcon,
  ExtensionIcon,
  KeyboardIcon,
  ModelIcon,
  PlugIcon,
  SettingsIcon,
  SkillIcon,
  SunIcon,
} from "../../ui/icons";
import { t, type TranslationKey } from "../../i18n";

/** Static definition: keys and metadata that never depend on the language. */
interface SettingsSectionSource {
  readonly id: string;
  readonly titleKey: TranslationKey;
  readonly groupKey: TranslationKey;
  readonly icon: ReactNode;
  /** Words people search for that are not in the title, such as the page's row titles. */
  readonly keywords: readonly string[];
  readonly descriptionKey: TranslationKey;
  /** Pages that read or write one workspace's runtime. */
  readonly needsWorkspace: boolean;
}

/** Resolved per render: titles and descriptions in the active language. */
export interface SettingsSectionDefinition {
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly icon: ReactNode;
  readonly keywords: readonly string[];
  readonly description: (workspaceName: string) => string;
  readonly needsWorkspace: boolean;
}

/** Nav order: grouped the way Codex groups its settings, one entry per page. */
export const SETTINGS_SECTIONS = [
  {
    id: "general",
    titleKey: "settings.sections.general",
    groupKey: "settings.sections.groupApp",
    icon: <SettingsIcon />,
    keywords: ["model settings scope", "per repo", "skill slash commands", "terminal", "shell"],
    descriptionKey: "settings.sections.generalDescription",
    needsWorkspace: false,
  },
  {
    id: "appearance",
    titleKey: "settings.sections.appearance",
    groupKey: "settings.sections.groupApp",
    icon: <SunIcon />,
    keywords: [
      "theme",
      "light",
      "dark",
      "system",
      "preset",
      "colors",
      "transparency",
      "language",
      "主题",
      "语言",
    ],
    descriptionKey: "settings.sections.appearanceDescription",
    needsWorkspace: false,
  },
  {
    id: "notifications",
    titleKey: "settings.sections.notifications",
    groupKey: "settings.sections.groupApp",
    icon: <BellIcon />,
    keywords: ["alerts", "background", "completion", "failures", "approval", "macos", "通知"],
    descriptionKey: "settings.sections.notificationsDescription",
    needsWorkspace: false,
  },
  {
    id: "shortcuts",
    titleKey: "settings.sections.shortcuts",
    groupKey: "settings.sections.groupApp",
    icon: <KeyboardIcon />,
    keywords: ["keys", "hotkeys", "keybindings", "快捷键"],
    descriptionKey: "settings.sections.shortcutsDescription",
    needsWorkspace: false,
  },
  {
    id: "providers",
    titleKey: "settings.sections.providers",
    groupKey: "settings.sections.groupAgent",
    icon: <PlugIcon />,
    keywords: ["login", "logout", "oauth", "api key", "auth", "custom endpoint", "登录", "密钥"],
    descriptionKey: "settings.sections.providersDescription",
    needsWorkspace: true,
  },
  {
    id: "models",
    titleKey: "settings.sections.models",
    groupKey: "settings.sections.groupAgent",
    icon: <ModelIcon />,
    keywords: ["default model", "reasoning", "thinking", "enabled models", "模型"],
    descriptionKey: "settings.sections.modelsDescription",
    needsWorkspace: true,
  },
  {
    id: "mcp",
    titleKey: "settings.sections.mcp",
    groupKey: "settings.sections.groupAgent",
    icon: <ExtensionIcon />,
    keywords: ["mcp", "mcp.json", "model context protocol", "servers", "code mode", "codemode"],
    descriptionKey: "settings.sections.mcpDescription",
    needsWorkspace: true,
  },
] as const satisfies readonly SettingsSectionSource[];

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["id"];

/** Skills and extensions live in the settings nav but are their own app views. */
export const CUSTOMIZE_SECTION_ID = "customize";

export const SETTINGS_NAV_ITEMS = [
  ...SETTINGS_SECTIONS,
  {
    id: CUSTOMIZE_SECTION_ID,
    titleKey: "settings.sections.customize",
    groupKey: "settings.sections.groupCustomize",
    icon: <SkillIcon />,
    keywords: ["skills", "extensions", "plugins", "slash commands", "tools", "技能", "扩展"],
    descriptionKey: "settings.sections.customizeDescription",
    needsWorkspace: false,
  },
] as const satisfies readonly SettingsSectionSource[];

export function settingsSectionDefinition(section: SettingsSection): SettingsSectionDefinition {
  const source =
    SETTINGS_SECTIONS.find((definition) => definition.id === section) ?? SETTINGS_SECTIONS[0];
  return resolveSection(source);
}

export function settingsNavItemDefinition(id: string): SettingsSectionDefinition | undefined {
  const source = SETTINGS_NAV_ITEMS.find((definition) => definition.id === id);
  return source ? resolveSection(source) : undefined;
}

function resolveSection(source: SettingsSectionSource): SettingsSectionDefinition {
  return {
    id: source.id,
    title: t(source.titleKey),
    group: t(source.groupKey),
    icon: source.icon,
    keywords: source.keywords,
    description: (workspaceName: string) => t(source.descriptionKey, { workspace: workspaceName }),
    needsWorkspace: source.needsWorkspace,
  };
}

export function sectionTitle(section: SettingsSection): string {
  return settingsSectionDefinition(section).title;
}
