import React from 'react';
import { z } from 'zod';
import type { WizardField, WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import ModelServerTemplateSelectField, {
  type ModelServerOption,
  type ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
  getAcceleratorIdentifierFromHardwareProfile,
} from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
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
import { LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY } from '../deploymentMethodField';

// Types

type KServeServingRuntimeDependencies = {
  modelServerTemplates?: TemplateKind[];
  modelFormat?: SupportedModelFormats;
  hardwareProfile?: HardwareProfileKind;
  modelType?: ModelTypeFieldData;
  vLLMDeploymentOnMaaS?: boolean;
  deploymentMethod?: string;
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
 * - GENERATIVE models: Active only when the legacy deployment method is selected
 *
 * @param wizardState Current wizard form state
 * @returns true if the KServe serving runtime field should be shown
 */
export const isKServeServingRuntimeFieldActive = (
  wizardState: RecursivePartial<WizardFormData['state']>,
): boolean => {
  const modelType = wizardState.modelType?.data;
  const deploymentMethodOption = wizardState.deploymentMethod?.method;

  // Predictive models always use KServe serving runtimes
  if (modelType?.type === ServingRuntimeModelType.PREDICTIVE) {
    return true;
  }

  // Generative models with LLMInferenceServiceConfig flow enabled: only show if using legacy vLLM
  if (
    modelType?.type === ServingRuntimeModelType.GENERATIVE &&
    deploymentMethodOption === LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY
  ) {
    return true;
  }

  return false;
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
      deploymentMethod: formData.deploymentMethod?.method,
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
    return (
      prevDependencies.modelType?.type !== newDependencies.modelType?.type ||
      prevDependencies.deploymentMethod !== newDependencies.deploymentMethod
    );
  },
  component: KServeServingRuntimeField,
  // externalDataHook: NOT NEEDED - the ServingRuntime Templates currently are from the model format field
};
