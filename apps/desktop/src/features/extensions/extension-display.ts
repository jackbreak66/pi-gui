import type {
  RuntimeExtensionRecord,
  RuntimeSourceScope,
} from "@pi-gui/session-driver/runtime-types";
import { t } from "../../i18n";

export function extensionSourceSummary(extension: RuntimeExtensionRecord): string {
  return `${extensionScopeLabel(extension)} · ${extension.sourceInfo.origin}`;
}

export const PI_GUI_TOOLS_LABEL_KEY = "extension.groupPiGuiTools";
export const PI_ADDONS_LABEL_KEY = "extension.groupPiAddons";

export const PI_GUI_TOOLS_LABEL = "pi-gui tools";
export const PI_ADDONS_LABEL = "Built into pi";

/** Extensions pi-gui itself adds to every session; switched on and off app-wide. */
export function isPiGuiBuiltinExtension(extension: RuntimeExtensionRecord): boolean {
  return (
    extension.sourceInfo.source === "builtin" &&
    extension.sourceInfo.origin === "top-level" &&
    extension.sourceInfo.scope === "temporary"
  );
}

/**
 * pi's own add-ons (MCP, code mode, tool search), named `builtin:<name>`. Their switch writes
 * pi's `extensions` setting, so terminal pi follows it too.
 */
export function isPiAddonExtension(extension: RuntimeExtensionRecord): boolean {
  return extension.sourceInfo.source === "builtin" && extension.path.startsWith("builtin:");
}

export function extensionScopeLabel(extension: RuntimeExtensionRecord): string {
  if (isPiGuiBuiltinExtension(extension)) return PI_GUI_TOOLS_LABEL;
  if (isPiAddonExtension(extension)) return PI_ADDONS_LABEL;
  return extension.sourceInfo.scope;
}

/** Group heading for where a skill or extension was discovered, in the active language. */
export function sourceScopeGroupLabel(scope: RuntimeSourceScope): string {
  switch (scope) {
    case "project":
      return t("extension.groupWorkspace");
    case "user":
      return t("extension.groupUser");
    case "temporary":
      return t("extension.groupThisSession");
  }
}

/** Stable group key, independent of the active language. */
export type ExtensionGroupKey = "pi-gui-tools" | "pi-addons" | "project" | "user" | "temporary";

export function extensionGroupKey(extension: RuntimeExtensionRecord): ExtensionGroupKey {
  if (isPiGuiBuiltinExtension(extension)) return "pi-gui-tools";
  if (isPiAddonExtension(extension)) return "pi-addons";
  return extension.sourceInfo.scope;
}

export function extensionGroupLabelFromKey(key: ExtensionGroupKey): string {
  switch (key) {
    case "pi-gui-tools":
      return t(PI_GUI_TOOLS_LABEL_KEY);
    case "pi-addons":
      return t(PI_ADDONS_LABEL_KEY);
    case "project":
      return t("extension.groupWorkspace");
    case "user":
      return t("extension.groupUser");
    case "temporary":
      return t("extension.groupThisSession");
  }
}

export function extensionGroupLabel(extension: RuntimeExtensionRecord): string {
  return extensionGroupLabelFromKey(extensionGroupKey(extension));
}
