import React from 'react';
import { z } from 'zod';
import type { WizardField, WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { isModelServerTemplateFieldOverride } from '@odh-dashboard/model-serving/components/deploymentWizard/types';
import { useWizardFieldOverrides } from '@odh-dashboard/model-serving/components/deploymentWizard/dynamicFormUtils';
import ModelServerTemplateSelectField, {
  type ModelServerOption,
  type ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
  getAcceleratorIdentifierFromHardwareProfile,
} from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
import { useModelServingClusterSettings } from '@odh-dashboard/model-serving/concepts/useModelServingClusterSettings';
import type { ModelTypeFieldData } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelTypeSelectField';
import type {
  HardwareProfileKind,
  SupportedModelFormats,
  TemplateKind,
} from '@odh-dashboard/k8s-core';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeFromTemplate,
  getServingRuntimeVersion,
} from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import { useProfileIdentifiers } from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';

// Types

type KServeServingRuntimeDependencies = {
  modelServerTemplates?: TemplateKind[];
  modelFormat?: SupportedModelFormats;
  hardwareProfile?: HardwareProfileKind;
  modelType?: ModelTypeFieldData;
  vLLMDeploymentOnMaaS?: boolean;
};

export type KServeServingRuntimeExternalData = {
  extraOptions: ModelServerOption[];
  suggestion?: ModelServerOption;
};

export type KServeServingRuntimeFieldValue = {
  data?: ModelServerSelectFieldData;
};

export type KServeServingRuntimeFieldType = WizardField<
  KServeServingRuntimeFieldValue,
  KServeServingRuntimeExternalData,
  KServeServingRuntimeDependencies
>;

/**
 * Determines if the KServe serving runtime field should be active in the wizard.
 *
 * Activation logic:
 * - PREDICTIVE models: Always active (use traditional KServe serving runtimes)
 * - GENERATIVE models with LLMInferenceServiceConfig flow available (vLLMDeploymentOnMaaS=true):
 *   - Active ONLY if legacyVLLM=true (user opted for legacy vLLM deployment path)
 *   - Inactive if legacyVLLM=false (uses LLMInferenceServiceConfig-based deployment instead)
 * - GENERATIVE models without LLMInferenceServiceConfig flow (vLLMDeploymentOnMaaS=false):
 *   - Always active (LLMInferenceServiceConfig not available, must use KServe serving runtime)
 *
 * @param wizardState Current wizard form state
 * @returns true if the KServe serving runtime field should be shown
 */
export const isKServeServingRuntimeFieldActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const modelType = wizardState.modelType?.data;
  const vLLMDeploymentOnMaaSEnabled = wizardState.devFeatureFlags?.vLLMDeploymentOnMaaS;

  // Predictive models always use KServe serving runtimes
  if (modelType?.type === ServingRuntimeModelType.PREDICTIVE) {
    return true;
  }

  // Generative models with LLMInferenceServiceConfig flow enabled: only show if using legacy vLLM
  if (vLLMDeploymentOnMaaSEnabled === true) {
    if (modelType?.type === ServingRuntimeModelType.GENERATIVE && modelType.legacyVLLM === true) {
      return true;
    }
  }

  // Generative models without LLMInferenceServiceConfig flow: always show (no alternative)
  if (!vLLMDeploymentOnMaaSEnabled) {
    if (modelType?.type === ServingRuntimeModelType.GENERATIVE) {
      return true;
    }
  }

  return false;
};

// External data hook

/**
 * External data hook for KServe serving runtime field.
 * Fetches wizard field overrides from extensions and computes suggestions.
 *
 * @param dependencies Dependencies needed to resolve overrides and suggestions
 * @returns External data object with extraOptions, suggestion, loaded state, and optional error
 */
export const useKServeServingRuntimeExternalData = (
  dependencies?: KServeServingRuntimeDependencies,
): {
  data: KServeServingRuntimeExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const {
    data: modelServingClusterSettings,
    loaded: modelServingClusterSettingsLoaded,
    error: modelServingClusterSettingsError,
  } = useModelServingClusterSettings();

  const formData = React.useMemo(
    () => ({
      modelType: { data: dependencies?.modelType },
      devFeatureFlags: { vLLMDeploymentOnMaaS: dependencies?.vLLMDeploymentOnMaaS },
    }),
    [dependencies?.modelType, dependencies?.vLLMDeploymentOnMaaS],
  );

  const modelServerOverrides = useWizardFieldOverrides(
    isModelServerTemplateFieldOverride,
    formData,
  );

  return React.useMemo(() => {
    try {
      const extraOptions = modelServerOverrides.flatMap((override) => override.extraOptions ?? []);
      const suggestion = modelServerOverrides.reduce<ModelServerOption | undefined>(
        (acc, override) => acc ?? override.suggestion?.(modelServingClusterSettings),
        undefined,
      );

      return {
        data: { extraOptions, suggestion },
        loaded: modelServingClusterSettingsLoaded,
        loadError: modelServingClusterSettingsError,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading KServe serving runtime external data:', error);
      return {
        data: { extraOptions: [], suggestion: undefined },
        loaded: modelServingClusterSettingsLoaded,
        loadError: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }, [
    modelServerOverrides,
    modelServingClusterSettings,
    modelServingClusterSettingsLoaded,
    modelServingClusterSettingsError,
  ]);
};

const computeSuggestion = (
  templates?: TemplateKind[],
  modelFormat?: SupportedModelFormats,
  hardwareProfile?: HardwareProfileKind,
): ModelServerOption | undefined => {
  let filtered = templates;

  if (modelFormat) {
    filtered = filtered?.filter((template) =>
      getServingRuntimeFromTemplate(template)?.spec.supportedModelFormats?.some(
        (format) => format.name === modelFormat.name && format.version === modelFormat.version,
      ),
    );
  }

  const accelerator = getAcceleratorIdentifierFromHardwareProfile(hardwareProfile);
  if (accelerator) {
    filtered = filtered?.filter((template) =>
      isCompatibleWithIdentifier(accelerator, getServingRuntimeFromTemplate(template)),
    );
  }

  if (filtered?.length === 1) {
    const suggestedTemplate = filtered[0];
    return {
      name: suggestedTemplate.metadata.name,
      namespace: suggestedTemplate.metadata.namespace,
      label: getServingRuntimeDisplayNameFromTemplate(suggestedTemplate),
      template: suggestedTemplate,
    };
  }
  return undefined;
};

// Component

const KServeServingRuntimeField: KServeServingRuntimeFieldType['component'] = ({
  value,
  onChange,
  externalData,
  dependencies,
  isEditing,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const profileIdentifiers = useProfileIdentifiers(dependencies?.hardwareProfile);

  const options = React.useMemo((): ModelServerOption[] => {
    const result: ModelServerOption[] = [];

    result.push(...(externalData?.data.extraOptions ?? []));

    result.push(
      ...(dependencies?.modelServerTemplates?.map(
        (template) =>
          ({
            name: template.metadata.name,
            namespace: template.metadata.namespace,
            label: getServingRuntimeDisplayNameFromTemplate(template),
            version: getServingRuntimeVersion(template),
            compatibleWithHardwareProfile: profileIdentifiers.some((identifier) =>
              isCompatibleWithIdentifier(identifier, getServingRuntimeFromTemplate(template)),
            ),
            scope: template.metadata.namespace === dashboardNamespace ? 'global' : 'project',
            template,
          } satisfies ModelServerOption),
      ) ?? []),
    );

    return result;
  }, [
    externalData?.data.extraOptions,
    dependencies?.modelServerTemplates,
    dashboardNamespace,
    profileIdentifiers,
  ]);

  return (
    <ModelServerTemplateSelectField
      label="Deployment resource"
      modelServerState={{
        data: value?.data,
        setData: (data: ModelServerSelectFieldData) => onChange({ data }),
        options,
      }}
      isEditing={isEditing}
    />
  );
};

// WizardField definition

export const KServeServingRuntimeFieldWizardField: KServeServingRuntimeFieldType = {
  id: 'kserve/modelServer',
  step: 'modelDeployment',
  type: 'replacement',
  stateKey: 'modelServer',
  isActive: isKServeServingRuntimeFieldActive,
  reducerFunctions: {
    resolveDependencies: (formData) => ({
      modelServerTemplates: formData.modelFormatState.templatesFilteredForModelType,
      modelFormat: formData.modelFormatState.modelFormat,
      hardwareProfile: formData.hardwareProfileConfig.formData.selectedProfile,
      modelType: formData.modelType.data,
      vLLMDeploymentOnMaaS: formData.devFeatureFlags?.vLLMDeploymentOnMaaS,
    }),
    setFieldData: (value: KServeServingRuntimeFieldValue) => value,
    getInitialFieldData: (
      existingFieldData?: KServeServingRuntimeFieldValue,
      externalData?: KServeServingRuntimeExternalData,
      dependencies?: KServeServingRuntimeDependencies,
    ): KServeServingRuntimeFieldValue => {
      if (existingFieldData?.data?.selection) {
        return existingFieldData;
      }

      if (externalData?.suggestion) {
        return {
          data: {
            selection: externalData.suggestion,
            autoSelect: true,
            suggestion: externalData.suggestion,
          },
        };
      }

      const suggestion = computeSuggestion(
        dependencies?.modelServerTemplates,
        dependencies?.modelFormat,
        dependencies?.hardwareProfile,
      );
      if (suggestion) {
        return {
          data: {
            selection: suggestion,
            autoSelect: true,
            suggestion,
          },
        };
      }

      return { data: { autoSelect: false } };
    },
    validationSchema: z.object({
      data: modelServerSelectFieldSchema,
    }),
  },
  /**
   * Determines when the field should reset to its initial value.
   *
   * The serving runtime selection is reset ONLY when the model type changes
   * (predictive ↔ generative), because different model types use different
   * serving runtime templates.
   *
   * The field does NOT reset on modelFormat or hardwareProfile changes.
   * While these affect which templates are compatible and which gets suggested,
   * they don't fundamentally change the available template set, so we preserve
   * the user's selection if they already made one.
   *
   * @param prevDependencies Previous dependency values
   * @param newDependencies New dependency values
   * @returns true if the field should reset, false to preserve current value
   */
  shouldResetOnDependencyChange: (prevDependencies, newDependencies) => {
    return prevDependencies.modelType?.type !== newDependencies.modelType?.type;
  },
  component: KServeServingRuntimeField,
  externalDataHook: useKServeServingRuntimeExternalData,
};
