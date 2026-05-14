import React from 'react';
import { z } from 'zod';
import type { WizardField, WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { isModelServerTemplateField } from '@odh-dashboard/model-serving/types/form-data';
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
} from '@odh-dashboard/internal/k8sTypes';
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
 * Active for all deployments except generative non-legacy which is behind a feature flag.
 */
export const isKServeServingRuntimeFieldActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const modelType = wizardState.modelType?.data;
  const vLLMDeploymentOnMaaSEnabled = wizardState.devFeatureFlags?.vLLMDeploymentOnMaaS;

  if (modelType?.type === ServingRuntimeModelType.PREDICTIVE) {
    return true;
  }
  if (vLLMDeploymentOnMaaSEnabled === true) {
    if (modelType?.type === ServingRuntimeModelType.GENERATIVE && modelType.legacyVLLM === true) {
      return true;
    }
  }
  if (vLLMDeploymentOnMaaSEnabled === false) {
    if (modelType?.type === ServingRuntimeModelType.GENERATIVE) {
      return true;
    }
  }

  return false;
};

// External data hook

export const useKServeServingRuntimeExternalData = (
  dependencies?: KServeServingRuntimeDependencies,
): {
  data: KServeServingRuntimeExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const { data: modelServingClusterSettings } = useModelServingClusterSettings();

  const formData = React.useMemo(
    () => ({
      modelType: { data: dependencies?.modelType },
      devFeatureFlags: { vLLMDeploymentOnMaaS: dependencies?.vLLMDeploymentOnMaaS },
    }),
    [dependencies?.modelType, dependencies?.vLLMDeploymentOnMaaS],
  );

  const modelServerOverrides = useWizardFieldOverrides(isModelServerTemplateField, formData);

  return React.useMemo(() => {
    const extraOptions = modelServerOverrides.flatMap((override) => override.extraOptions ?? []);
    const suggestion = modelServerOverrides.reduce<ModelServerOption | undefined>(
      (acc, override) => acc ?? override.suggestion?.(modelServingClusterSettings),
      undefined,
    );

    return {
      data: { extraOptions, suggestion },
      loaded: true,
    };
  }, [modelServerOverrides, modelServingClusterSettings]);
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
  formId: 'modelServer',
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
  shouldResetOnDependencyChange: (prevDependencies, newDependencies) => {
    return prevDependencies.modelType?.type !== newDependencies.modelType?.type;
  },
  component: KServeServingRuntimeField,
  externalDataHook: useKServeServingRuntimeExternalData,
};
