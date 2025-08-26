import React from 'react';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import type { ModelDeploymentWizardData } from './useDeploymentWizard';
import { modelSourceStepSchema, type ModelSourceStepData } from './steps/ModelSourceStep';

export type ModelDeploymentWizardValidation = {
  modelSource: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  isModelSourceStepValid: boolean;
  // modelDeploymentStep: ReturnType<typeof useZodFormValidation<ModelDeploymentStepData>>;
  isModelDeploymentStepValid: boolean;
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

  return {
    modelSource: modelSourceStepValidation,
    isModelSourceStepValid:
      modelSourceStepValidation.getFieldValidation(undefined, true).length === 0,
    // modelDeploymentStep: modelDeploymentStepValidation,
    isModelDeploymentStepValid: !!(
      data.k8sNameDesc && isK8sNameDescriptionDataValid(data.k8sNameDesc)
    ),
  };
};
