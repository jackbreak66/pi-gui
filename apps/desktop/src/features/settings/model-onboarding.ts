import type { RuntimeSnapshot } from "@pi-gui/session-driver/runtime-types";
import { t } from "../../i18n";
import { buildModelOptions } from "../conversation/composer-commands";

export type ModelOnboardingSettingsSection = "models" | "providers";

export interface ModelOnboardingNotice {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly actionSection: ModelOnboardingSettingsSection;
}

export interface ModelOnboardingState {
  readonly hasSelectableModels: boolean;
  readonly requiresModelSelection: boolean;
  readonly unselectedModelLabel: string;
  readonly emptyModelTitle: string;
  readonly emptyModelDescription: string;
  readonly notice?: ModelOnboardingNotice;
}

interface ModelSelectionInput {
  readonly provider: string | undefined;
  readonly modelId: string | undefined;
}

export function deriveModelOnboardingState(
  runtime: RuntimeSnapshot | undefined,
  currentSelection: ModelSelectionInput,
): ModelOnboardingState {
  const selectableModels = buildModelOptions(runtime);
  const selectableSet = new Set(
    selectableModels.map((model) => `${model.providerId}:${model.modelId}`),
  );
  const hasSelectableModels = selectableModels.length > 0;
  const connectedProviderCount =
    runtime?.providers.filter((provider) => provider.hasAuth).length ?? 0;
  const settingsDefault = {
    provider: runtime?.settings.defaultProvider,
    modelId: runtime?.settings.defaultModelId,
  };
  const hasDefaultModel = Boolean(settingsDefault.provider && settingsDefault.modelId);
  const defaultModelUsable = isUsableSelection(settingsDefault, selectableSet);
  const hasCurrentSelection = Boolean(currentSelection.provider && currentSelection.modelId);
  const currentSelectionUsable = isUsableSelection(currentSelection, selectableSet);

  if (!hasSelectableModels) {
    return {
      hasSelectableModels: false,
      requiresModelSelection: true,
      unselectedModelLabel: t("onboarding.noModelsAvailable"),
      emptyModelTitle: t("onboarding.noModelsAvailable"),
      emptyModelDescription:
        connectedProviderCount > 0
          ? t("onboarding.noModelsEnableHint")
          : t("onboarding.noModelsConnectHint"),
      notice:
        connectedProviderCount > 0
          ? {
              title: t("onboarding.noModelsAvailable"),
              description: t("onboarding.allModelsDisabled"),
              actionLabel: t("onboarding.openSettingsModels"),
              actionSection: "models",
            }
          : {
              title: t("onboarding.noModelsAvailable"),
              description: t("onboarding.connectProviderFirst"),
              actionLabel: t("onboarding.openSettingsProviders"),
              actionSection: "providers",
            },
    };
  }

  if (hasCurrentSelection && !currentSelectionUsable) {
    return {
      hasSelectableModels: true,
      requiresModelSelection: true,
      unselectedModelLabel: t("onboarding.pickModel"),
      emptyModelTitle: t("onboarding.noModelsAvailable"),
      emptyModelDescription: t("onboarding.pickModel"),
      notice: {
        title: t("onboarding.selectedModelUnavailable"),
        description: hasDefaultModel
          ? t("onboarding.selectedModelGoneUpdateDefault")
          : t("onboarding.selectedModelGoneChooseDefault"),
        actionLabel: t("onboarding.openSettingsModels"),
        actionSection: "models",
      },
    };
  }

  if (!hasDefaultModel) {
    return {
      hasSelectableModels: true,
      requiresModelSelection: !currentSelectionUsable,
      unselectedModelLabel: t("onboarding.pickModel"),
      emptyModelTitle: t("onboarding.noDefaultModelSet"),
      emptyModelDescription: t("onboarding.pickModel"),
      notice: currentSelectionUsable
        ? undefined
        : {
            title: t("onboarding.noDefaultModelSet"),
            description: t("onboarding.setDefaultModelHint"),
            actionLabel: t("onboarding.openSettingsModels"),
            actionSection: "models",
          },
    };
  }

  if (!defaultModelUsable) {
    const defaultLabel = `${settingsDefault.provider}:${settingsDefault.modelId}`;
    return {
      hasSelectableModels: true,
      requiresModelSelection: !currentSelectionUsable,
      unselectedModelLabel: t("onboarding.pickModel"),
      emptyModelTitle: t("onboarding.defaultModelUnavailable"),
      emptyModelDescription: t("onboarding.pickModel"),
      notice: {
        title: t("onboarding.defaultModelUnavailable"),
        description: currentSelectionUsable
          ? t("onboarding.savedDefaultGone", { model: defaultLabel })
          : t("onboarding.savedDefaultGonePick", { model: defaultLabel }),
        actionLabel: t("onboarding.openSettingsModels"),
        actionSection: "models",
      },
    };
  }

  return {
    hasSelectableModels: true,
    requiresModelSelection: false,
    unselectedModelLabel: t("onboarding.pickModel"),
    emptyModelTitle: t("onboarding.noModelsAvailable"),
    emptyModelDescription: t("onboarding.pickModel"),
  };
}

function isUsableSelection(
  selection: ModelSelectionInput,
  selectableSet: ReadonlySet<string>,
): boolean {
  return Boolean(
    selection.provider &&
    selection.modelId &&
    selectableSet.has(`${selection.provider}:${selection.modelId}`),
  );
}
