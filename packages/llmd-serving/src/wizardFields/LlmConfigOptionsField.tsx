import React from 'react';
import { z } from 'zod';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import ModelServerTemplateSelectField, {
  ModelServerOption,
  ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
} from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import {
  isUnsupportedUnaccepted,
  RUNTIME_VERSION_ANNOTATION,
} from '@odh-dashboard/model-serving/concepts/versions';
import { useFetchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';
import { LLMInferenceServiceConfigKind } from '../types';
import { isLLMInferenceServiceActive, isSimpleLLMInferenceService } from '../formUtils';

// External data hook

export type LLMConfigOptionsData = {
  configs: LLMInferenceServiceConfigKind[];
};

export const useLLMConfigOptions = (): {
  data: LLMConfigOptionsData;
  loaded: boolean;
  loadError?: Error;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const {
    data: llmInferenceServiceConfigs,
    loaded,
    error,
  } = useFetchLLMInferenceServiceConfigs(dashboardNamespace);

  const llmEnabledConfigs = React.useMemo(
    () =>
      llmInferenceServiceConfigs.filter(
        (config) =>
          config.metadata.annotations?.['opendatahub.io/disabled'] !== 'true' &&
          !isUnsupportedUnaccepted(config),
      ),
    [llmInferenceServiceConfigs],
  );

  return React.useMemo(
    () => ({
      data: {
        configs: llmEnabledConfigs,
      },
      loaded,
      loadError: error,
    }),
    [llmEnabledConfigs, loaded, error],
  );
};

// Field

const getOptionFromLLMInferenceServiceConfig = (
  llmInferenceServiceConfig: LLMInferenceServiceConfigKind,
  hardwareProfile?: HardwareProfileKind,
): ModelServerOption => {
  const isCompatible = hardwareProfile?.spec.identifiers?.some((identifier) =>
    isCompatibleWithIdentifier(identifier.identifier, llmInferenceServiceConfig),
  );
  return {
    name: llmInferenceServiceConfig.metadata.name,
    namespace: llmInferenceServiceConfig.metadata.namespace,
    label: getDisplayNameFromK8sResource(llmInferenceServiceConfig),
    version: llmInferenceServiceConfig.metadata.annotations?.[RUNTIME_VERSION_ANNOTATION],
    template: llmInferenceServiceConfig,
    compatibleWithHardwareProfile: isCompatible,
  };
};

const getOptions = (
  externalData?: LLMConfigOptionsData,
  hardwareProfile?: HardwareProfileKind,
): ModelServerOption[] => {
  const result: ModelServerOption[] = [];
  result.push(
    ...(externalData?.configs.map((config) =>
      getOptionFromLLMInferenceServiceConfig(config, hardwareProfile),
    ) ?? []),
  );
  return result;
};

const computeSuggestion = (options: ModelServerOption[]): ModelServerOption | undefined => {
  if (options.length === 1) {
    return options[0];
  }

  const compatibleOptions = options.filter((option) => option.compatibleWithHardwareProfile);
  if (compatibleOptions.length === 1) {
    return compatibleOptions[0];
  }

  return undefined;
};

export type LLMConfigOptionsFieldValue = {
  data?: ModelServerSelectFieldData;
};

export type LLMConfigOptionsFieldType = WizardField<
  LLMConfigOptionsFieldValue,
  LLMConfigOptionsData,
  { hardwareProfile?: HardwareProfileKind }
>;

const LLMConfigOptionsField: LLMConfigOptionsFieldType['component'] = ({
  value,
  onChange,
  externalData,
  dependencies,
  isEditing,
}) => {
  const options = React.useMemo(
    () => getOptions(externalData?.data, dependencies?.hardwareProfile),
    [externalData?.data, dependencies?.hardwareProfile],
  );

  return (
    <ModelServerTemplateSelectField
      label="Accelerator configuration"
      helperText="Select the hardware accelerator configuration for this deployment."
      modelServerState={{
        data: value?.data,
        setData: (data: ModelServerSelectFieldData) => onChange({ data }),
        options,
      }}
      isEditing={isEditing}
    />
  );
};

// When llmdTemplates disabled: show for ALL llm-d methods (single-node fallback)
export const LLMConfigOptionsFieldNoTemplates: LLMConfigOptionsFieldType = {
  id: 'llmd-serving/modelServer',
  step: 'modelDeployment',
  type: 'replacement',
  stateKey: 'modelServer',
  isActive: isLLMInferenceServiceActive,
  reducerFunctions: {
    resolveDependencies: (formData) => ({
      hardwareProfile: formData.hardwareProfileConfig.formData.selectedProfile,
    }),
    setFieldData: (value: LLMConfigOptionsFieldValue) => value,
    getInitialFieldData: (
      existingFieldData?: LLMConfigOptionsFieldValue,
      externalData?: LLMConfigOptionsData,
      dependencies?: { hardwareProfile?: HardwareProfileKind },
    ): LLMConfigOptionsFieldValue => {
      if (existingFieldData) {
        return existingFieldData;
      }

      const options = getOptions(externalData, dependencies?.hardwareProfile);
      const suggestion = computeSuggestion(options);

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
  component: LLMConfigOptionsField,
  externalDataHook: useLLMConfigOptions,
};

// When llmdTemplates enabled: show only for simple vLLM (non-llm-d), topology fields handle the rest
export const LLMConfigOptionsFieldWithTemplates: LLMConfigOptionsFieldType = {
  ...LLMConfigOptionsFieldNoTemplates,
  isActive: isSimpleLLMInferenceService,
};
