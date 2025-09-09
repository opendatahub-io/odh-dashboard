import React from 'react';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useValidation } from '@odh-dashboard/internal/utilities/useValidation';
import { hardwareProfileValidationSchema } from '@odh-dashboard/internal/concepts/hardwareProfiles/validationUtils';
import type { UseModelDeploymentWizardState } from './useDeploymentWizard';
import { modelSourceStepSchema, type ModelSourceStepData } from './steps/ModelSourceStep';
import { modelFormatFieldSchema } from './fields/ModelFormatField';
import {
  advancedSettingsFieldSchema,
  type AdvancedSettingsFieldData,
} from './fields/AdvancedSettingsSelectField';

export type ModelDeploymentWizardValidation = {
  modelSource: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  hardwareProfile: ReturnType<typeof useValidation>;
  advancedSettings: ReturnType<typeof useZodFormValidation<AdvancedSettingsFieldData>>;
  isModelSourceStepValid: boolean;
  isModelDeploymentStepValid: boolean;
  isAdvancedSettingsStepValid: boolean;
};

export const useModelDeploymentWizardValidation = (
  wizardState: UseModelDeploymentWizardState,
): ModelDeploymentWizardValidation => {
  const { state } = wizardState;
  // Step 1: Model Source
  const modelSourceStepValidationData: Partial<ModelSourceStepData> = React.useMemo(
    () => ({
      modelType: state.modelType.data,
      modelLocationData: state.modelLocationData.data,
    }),
    [state.modelType, state.modelLocationData.data],
  );

  const modelSourceStepValidation = useZodFormValidation(
    modelSourceStepValidationData,
    modelSourceStepSchema,
  );

  const advancedSettingsValidation = useZodFormValidation(
    wizardState.data.advancedSettingsField,
    advancedSettingsFieldSchema,
  );

  // Step 2: Model Deployment
  const hardwareProfileValidation = useValidation(
    state.hardwareProfileConfig.formData,
    hardwareProfileValidationSchema,
  );
  const modelFormatValidation = useValidation(
    {
      type: state.modelType.data,
      format: state.modelFormatState.modelFormat,
    },
    modelFormatFieldSchema,
  );

  // Step validation
  const isModelSourceStepValid =
    modelSourceStepValidation.getFieldValidation(undefined, true).length === 0;
  const isModelDeploymentStepValid =
    isK8sNameDescriptionDataValid(state.k8sNameDesc.data) &&
    Object.keys(hardwareProfileValidation.getAllValidationIssues()).length === 0 &&
    Object.keys(modelFormatValidation.getAllValidationIssues()).length === 0;

  return {
    modelSource: modelSourceStepValidation,
    hardwareProfile: hardwareProfileValidation,
    advancedSettings: advancedSettingsValidation,
    isModelSourceStepValid,
    isModelDeploymentStepValid,
    isAdvancedSettingsStepValid:
      advancedSettingsValidation.getFieldValidation(undefined, true).length === 0,
  };
};
