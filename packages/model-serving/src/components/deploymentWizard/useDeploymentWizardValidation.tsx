import React from 'react';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import type { ModelDeploymentWizardData } from './useDeploymentWizard';
import { modelSourceStepSchema, type ModelSourceStepData } from './steps/ModelSourceStep';
import {
  advancedSettingsFieldSchema,
  type AdvancedSettingsFieldData,
} from './fields/AdvancedSettingsSelectField';

export type ModelDeploymentWizardValidation = {
  modelSource: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  advancedSettings: ReturnType<typeof useZodFormValidation<AdvancedSettingsFieldData>>;
  isModelSourceStepValid: boolean;
  isModelDeploymentStepValid: boolean;
  isAdvancedSettingsStepValid: boolean;
};

export const useModelDeploymentWizardValidation = (
  data: ModelDeploymentWizardData,
): ModelDeploymentWizardValidation => {
  const modelSourceStepValidationData: Partial<ModelSourceStepData> = React.useMemo(
    () => ({
      modelType: data.modelTypeField,
    }),
    [data.modelTypeField],
  );

  const modelSourceStepValidation = useZodFormValidation(
    modelSourceStepValidationData,
    modelSourceStepSchema,
  );

  const advancedSettingsValidation = useZodFormValidation(
    data.advancedSettingsField,
    advancedSettingsFieldSchema,
  );

  return {
    modelSource: modelSourceStepValidation,
    advancedSettings: advancedSettingsValidation,
    isModelSourceStepValid:
      modelSourceStepValidation.getFieldValidation(undefined, true).length === 0,
    isModelDeploymentStepValid: !!(
      data.k8sNameDesc && isK8sNameDescriptionDataValid(data.k8sNameDesc)
    ),
    isAdvancedSettingsStepValid:
      advancedSettingsValidation.getFieldValidation(undefined, true).length === 0,
  };
};
