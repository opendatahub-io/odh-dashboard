import React from 'react';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import ModelServerTemplateSelectField, {
  ModelServerOption,
} from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { HardwareProfileKind } from '@odh-dashboard/internal/k8sTypes';
import { isCompatibleWithIdentifier } from '@odh-dashboard/internal/pages/projects/screens/spawner/spawnerUtils';
import { useFetchLLMInferenceServiceConfigs } from '../api/LLMInferenceServiceConfigs';
import { LLMInferenceServiceConfigKind } from '../types';
import { useModelServingClusterSettings } from '../../../model-serving/src/concepts/useModelServingClusterSettings';
import { LLMD_OPTION } from '../deployments/server';
import { isLLMdActive } from '../utilts';

// External data hook

export type LLMConfigOptionsData = {
  configs: LLMInferenceServiceConfigKind[];
  isLlmdSuggested: boolean;
};

const useLLMConfigOptions = (): {
  data: LLMConfigOptionsData;
  loaded: boolean;
  loadError?: Error;
} => {
  const {
    data: modelServingClusterSettings,
    loaded: modelServingClusterSettingsLoaded,
    error: modelServingClusterSettingsError,
  } = useModelServingClusterSettings();
  const isLLMdDefault = modelServingClusterSettings?.isLLMdDefault ?? false;

  const { dashboardNamespace } = useDashboardNamespace();
  const {
    data: llmInferenceServiceConfigs,
    loaded,
    error,
  } = useFetchLLMInferenceServiceConfigs(dashboardNamespace);

  return React.useMemo(
    () => ({
      data: {
        configs: llmInferenceServiceConfigs,
        isLlmdSuggested: isLLMdDefault,
      },
      loaded: modelServingClusterSettingsLoaded && loaded,
      loadError: modelServingClusterSettingsError || error,
    }),
    [
      llmInferenceServiceConfigs,
      loaded,
      error,
      isLLMdDefault,
      modelServingClusterSettingsLoaded,
      modelServingClusterSettingsError,
    ],
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
    suggested: isCompatible,
  };
};

const getOptions = (
  externalData?: LLMConfigOptionsData,
  hardwareProfile?: HardwareProfileKind,
): ModelServerOption[] => {
  const result: ModelServerOption[] = [];
  result.push({ ...LLMD_OPTION, suggested: externalData?.isLlmdSuggested });
  result.push(
    ...(externalData?.configs.map((config) =>
      getOptionFromLLMInferenceServiceConfig(config, hardwareProfile),
    ) ?? []),
  );
  return result;
};

export type LLMConfigOptionsFieldValue = {
  selection?: ModelServerOption | null;
  autoSelect?: boolean;
};

type LLMConfigOptionsFieldType = WizardField<
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
  const suggestedOption = React.useMemo(() => {
    const suggestedOptions = options.filter((option) => option.suggested);
    if (suggestedOptions.length === 1) {
      return suggestedOptions[0];
    }
    return null;
  }, [options]);

  return (
    <ModelServerTemplateSelectField
      modelServerState={{
        data: value.selection,
        setData: (data) => onChange({ ...value, selection: data ?? undefined }),
        isAutoSelectChecked: value.autoSelect,
        setIsAutoSelectChecked: (isAutoSelectChecked) =>
          isAutoSelectChecked
            ? onChange({
                selection: suggestedOption,
                autoSelect: isAutoSelectChecked,
              })
            : onChange({ selection: null, autoSelect: isAutoSelectChecked }),
        options,
        suggestion: suggestedOption,
      }}
      isEditing={isEditing}
    />
  );
};

export const LLMConfigOptionsFieldWizardField: LLMConfigOptionsFieldType = {
  id: 'modelServer',
  step: 'modelDeployment',
  type: 'replacement',
  isActive: isLLMdActive,
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
      // if (existingFieldData) {
      //   return { selection: existingFieldData };
      // }
      // if llmd is default
      const options = getOptions(externalData, dependencies?.hardwareProfile);

      if (externalData?.isLlmdSuggested) {
        return {
          selection: LLMD_OPTION,
          autoSelect: true,
        };
      }
      // if there is a matching hardware profile, select it
      const matchingHardwareProfileOption = options.find(
        (option) => option.compatibleWithHardwareProfile,
      );
      if (matchingHardwareProfileOption) {
        return {
          selection: matchingHardwareProfileOption,
          autoSelect: true,
        };
      }
      // if there is only one option, select it
      if (options.length === 1) {
        return {
          selection: options[0],
        };
      }
      return { selection: null, autoSelect: false };
    },
    // validationSchema: maasFieldSchema,
  },
  component: LLMConfigOptionsField,
  externalDataHook: useLLMConfigOptions,
};
