import type { ThemeMode, ThemePresetId } from "../../../contracts/desktop-state";
import { useI18n } from "../../i18n";
import { t } from "../../i18n";
import { SettingsSelect, SettingsSwitch } from "./settings-controls";
import { SettingsGroup, SettingsRow } from "./settings-utils";
import type { CSSProperties } from "react";
import { themePreset, themePresets, themeSwatches, themeTokensFor } from "../../../contracts/theme";
import { useActiveTheme } from "../../ui/active-theme";

interface SettingsAppearanceSectionProps {
  readonly themeMode: ThemeMode;
  readonly themePresetId: ThemePresetId;
  readonly onSetThemeMode: (mode: ThemeMode) => void;
  readonly onSetThemePresetId: (presetId: ThemePresetId) => void;
  readonly enableTransparency: boolean;
  readonly onSetEnableTransparency: (enabled: boolean) => void;
}

export function SettingsAppearanceSection({
  themeMode,
  themePresetId,
  onSetThemeMode,
  onSetThemePresetId,
  enableTransparency,
  onSetEnableTransparency,
}: SettingsAppearanceSectionProps) {
  const { t } = useI18n();
  const themeModes: readonly { readonly mode: ThemeMode; readonly label: string }[] = [
    { mode: "system", label: t("settings.appearance.system") },
    { mode: "light", label: t("settings.appearance.light") },
    { mode: "dark", label: t("settings.appearance.dark") },
  ];
  const activePreset = themePreset(themePresetId);
  const presetDescription = themePresetDescription(themePresetId);
  const { variant } = useActiveTheme();
  return (
    <>
      <SettingsGroup title={t("settings.appearance.theme")} plain>
        <div
          aria-label={t("settings.appearance.themeModeLabel")}
          className="theme-mode-tiles"
          role="radiogroup"
          style={tilePalette(themePresetId)}
        >
          {themeModes.map((option) => (
            <label className="theme-mode-tile" key={option.mode}>
              <input
                checked={themeMode === option.mode}
                name="theme-mode"
                type="radio"
                onChange={() => onSetThemeMode(option.mode)}
              />
              <span
                aria-hidden="true"
                className={`theme-mode-tile__preview theme-mode-tile__preview--${option.mode}`}
              >
                <span className="theme-mode-tile__window">
                  <span className="theme-mode-tile__line theme-mode-tile__line--title" />
                  <span className="theme-mode-tile__line" />
                  <span className="theme-mode-tile__line" />
                </span>
              </span>
              <span className="theme-mode-tile__label">{option.label}</span>
            </label>
          ))}
        </div>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          title={t("settings.appearance.language")}
          description={t("settings.appearance.languageDescription")}
        >
          <LanguageSelect />
        </SettingsRow>
        <SettingsRow title={t("settings.appearance.colorPreset")} description={presetDescription}>
          <span className="settings-preset-control">
            <span aria-hidden="true" className="settings-preset-swatches">
              {themeSwatches(themePresetId, variant).map((swatch, index) => (
                <span key={index} style={{ background: swatch }} />
              ))}
            </span>
            <SettingsSelect
              label={t("settings.appearance.colorPresetLabel")}
              options={themePresets.map((preset) => ({ value: preset.id, label: preset.name }))}
              value={themePresetId}
              onChange={onSetThemePresetId}
            />
          </span>
        </SettingsRow>
        <SettingsRow
          title={t("settings.appearance.transparency")}
          description={t("settings.appearance.transparencyDescription")}
        >
          <SettingsSwitch
            checked={enableTransparency}
            label={t("settings.appearance.transparency")}
            onChange={onSetEnableTransparency}
          />
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}

/** Preset descriptions live in the renderer so contracts stay language-free. */
function themePresetDescription(presetId: ThemePresetId): string {
  switch (presetId) {
    case "default":
      return t("settings.themePreset.default");
    case "catppuccin":
      return t("settings.themePreset.catppuccin");
    case "tokyo-night":
      return t("settings.themePreset.tokyoNight");
    case "nord":
      return t("settings.themePreset.nord");
    case "dracula":
      return t("settings.themePreset.dracula");
    case "gruvbox":
      return t("settings.themePreset.gruvbox");
    case "github":
      return t("settings.themePreset.github");
    case "vscode":
      return t("settings.themePreset.vscode");
  }
}

function LanguageSelect() {
  const { t, languageSetting, setLanguageSetting } = useI18n();
  return (
    <SettingsSelect
      label={t("settings.appearance.language")}
      value={languageSetting}
      options={[
        { value: "auto", label: t("settings.appearance.system") },
        { value: "en-US", label: "English" },
        { value: "zh-CN", label: "简体中文" },
      ]}
      onChange={(value) => {
        if (value === "auto" || value === "en-US" || value === "zh-CN") {
          setLanguageSetting(value);
        }
      }}
    />
  );
}

function tilePalette(presetId: ThemePresetId): CSSProperties {
  const light = themeTokensFor(presetId, "light");
  const dark = themeTokensFor(presetId, "dark");
  return {
    "--tile-light-bg": light["--sidebar"],
    "--tile-light-window": light["--main"],
    "--tile-light-line": light["--line-strong"],
    "--tile-dark-bg": dark["--sidebar"],
    "--tile-dark-window": dark["--main"],
    "--tile-dark-line": dark["--line-strong"],
  } as CSSProperties;
}
