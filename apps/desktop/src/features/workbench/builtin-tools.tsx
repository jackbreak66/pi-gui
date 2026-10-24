import type { ComponentType, ReactNode } from "react";
import { BUILTIN_TOOL_KINDS, type BuiltinToolKind } from "../../../contracts/workbench";
import { DiffIcon, FileIcon, TerminalIcon } from "../../ui/icons";
import { t, type TranslationKey } from "../../i18n";

interface BuiltinToolDefinition {
  /** The icon this tool's tab shows. */
  readonly Icon: ComponentType;
  /** Key that toggles the tool with the platform modifier, when it has one. */
  readonly shortcutKey?: string;
  /** Label key, resolved in the active language at render time. */
  readonly labelKey: TranslationKey;
  /** Description key, shown in the tool chooser. */
  readonly descriptionKey: TranslationKey;
}

/** Presentation for every built-in tool; a missing kind fails the build. */
export const BUILTIN_TOOLS: Record<BuiltinToolKind, BuiltinToolDefinition> = {
  files: {
    labelKey: "workbench.tool.files",
    descriptionKey: "workbench.tool.filesDescription",
    Icon: FileIcon,
  },
  changes: {
    labelKey: "workbench.tool.changes",
    descriptionKey: "workbench.tool.changesDescription",
    Icon: DiffIcon,
    shortcutKey: "R",
  },
  terminal: {
    labelKey: "workbench.tool.terminal",
    descriptionKey: "workbench.tool.terminalDescription",
    Icon: TerminalIcon,
    shortcutKey: "J",
  },
};

export function builtinToolLabel(kind: BuiltinToolKind): string {
  return t(BUILTIN_TOOLS[kind].labelKey);
}

export function builtinToolDescription(kind: BuiltinToolKind): string {
  return t(BUILTIN_TOOLS[kind].descriptionKey);
}

export interface BuiltinToolEntry {
  readonly kind: BuiltinToolKind;
  readonly label: string;
  readonly description: string;
  readonly Icon: ComponentType;
  readonly shortcutKey?: string;
}

/** Chooser order follows the contract's kind list; labels resolve per render. */
export function builtinToolEntries(): readonly BuiltinToolEntry[] {
  return BUILTIN_TOOL_KINDS.map((kind) => {
    const tool = BUILTIN_TOOLS[kind];
    return {
      kind,
      label: builtinToolLabel(kind),
      description: builtinToolDescription(kind),
      Icon: tool.Icon,
      shortcutKey: tool.shortcutKey,
    };
  });
}

/** The composition root supplies one panel per built-in tool; rendered only while selected. */
type BuiltinToolPanels = Record<BuiltinToolKind, () => ReactNode>;

/** Requires a panel for every built-in kind, so a new tool cannot silently render nothing. */
export function renderBuiltinToolPanel(
  kind: BuiltinToolKind,
  panels: BuiltinToolPanels,
): ReactNode {
  return panels[kind]();
}
