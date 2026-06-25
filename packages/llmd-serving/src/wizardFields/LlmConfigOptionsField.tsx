import React from 'react';
import { z } from 'zod';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import ModelServerTemplateSelectField, {
  ModelServerOption,
  ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
} from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
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
        (config) => config.metadata.annotations?.['opendatahub.io/disabled'] !== 'true',
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
    version: llmInferenceServiceConfig.metadata.annotations?.['opendatahub.io/runtime-version'],
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

      const options = getOptions(externalData, dependencies?.hardwareProfile);

      // if there is only one matching hardware profile, select it
      const matchingHardwareProfileOption = options.filter(
        (option) => option.compatibleWithHardwareProfile,
      );
      if (matchingHardwareProfileOption.length === 1) {
        return {
          data: {
            selection: matchingHardwareProfileOption[0],
            autoSelect: true,
            suggestion: matchingHardwareProfileOption[0],
          },
        };
      }
      // if there is only one option, select it
      if (options.length === 1) {
        return {
          data: {
            selection: options[0],
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
