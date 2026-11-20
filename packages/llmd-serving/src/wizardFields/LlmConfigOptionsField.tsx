import React from 'react';
import { z } from 'zod';
import type {
  WizardField,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  ModelServerTemplateSelectField,
  ModelServerOption,
  ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
} from '@odh-dashboard/model-serving/shared/wizard-fields';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core/host-api';
import {
  getDisplayNameFromK8sResource,
  isCompatibleWithIdentifier,
  IdentifierResourceType,
} from '@odh-dashboard/k8s-core';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import {
  isUnsupportedUnaccepted,
  RUNTIME_VERSION_ANNOTATION,
} from '@odh-dashboard/model-serving/concepts/versions';
import { useFetchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';
import { LLMInferenceServiceConfigKind } from '../types';
import { isSimpleLLMInferenceService } from '../formUtils';

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

const computeSuggestion = (
  configs: LLMInferenceServiceConfigKind[],
  hardwareProfile?: HardwareProfileKind,
): ModelServerOption | undefined => {
  // Even a sole config needs an accelerator match; CPU, memory, and untyped identifiers do not qualify.
  // A config can match any Accelerator-typed identifier in the hardware profile, not just the first one.
  const accelerators =
    hardwareProfile?.spec.identifiers?.filter(
      (identifier) => identifier.resourceType === IdentifierResourceType.ACCELERATOR,
    ) ?? [];
  // Config-list order wins over accelerator order. With no accelerator identifiers, nothing matches.
  const config = configs.find((candidate) =>
    accelerators.some((identifier) => isCompatibleWithIdentifier(identifier.identifier, candidate)),
  );
  return config ? getOptionFromLLMInferenceServiceConfig(config, hardwareProfile) : undefined;
};

export type LLMConfigOptionsFieldValue = {
  data?: ModelServerSelectFieldData;
};

const getReviewSections = (value: LLMConfigOptionsFieldValue): WizardReviewSection[] => [
  {
    title: 'Model deployment',
    items: [
      {
        key: 'modelServer',
        label: 'Accelerator configuration',
        value: () => value.data?.selection?.label || 'Auto-selected',
      },
    ],
  },
];

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

// Simple vLLM only. llm-d uses AcceleratorConfigField (with or without llmdTemplates).
export const LLMConfigOptionsFieldWizardField: LLMConfigOptionsFieldType = {
  id: 'llmd-serving/modelServer',
  step: 'modelDeployment',
  type: 'replacement',
  stateKey: 'modelServer',
  isActive: isSimpleLLMInferenceService,
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

      const suggestion = computeSuggestion(
        externalData?.configs ?? [],
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
  component: LLMConfigOptionsField,
  externalDataHook: useLLMConfigOptions,
  getReviewSections,
};
