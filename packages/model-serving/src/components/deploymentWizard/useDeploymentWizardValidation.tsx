import React from 'react';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useValidation } from '@odh-dashboard/internal/utilities/useValidation';
import { hardwareProfileValidationSchema } from '@odh-dashboard/internal/concepts/hardwareProfiles/validationUtils';
import type { UseModelDeploymentWizardState } from './useDeploymentWizard';
import { modelSourceStepSchema, type ModelSourceStepData } from './steps/ModelSourceStep';
import { modelFormatFieldSchema } from './fields/ModelFormatField';
import { externalRouteFieldSchema, type ExternalRouteFieldData } from './fields/ExternalRouteField';
import {
  tokenAuthenticationFieldSchema,
  type TokenAuthenticationFieldData,
} from './fields/TokenAuthenticationField';
import { numReplicasFieldSchema, type NumReplicasFieldData } from './fields/NumReplicasField';

export type ModelDeploymentWizardValidation = {
  modelSource: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  hardwareProfile: ReturnType<typeof useValidation>;
  externalRoute: ReturnType<typeof useZodFormValidation<ExternalRouteFieldData>>;
  tokenAuthentication: ReturnType<typeof useZodFormValidation<TokenAuthenticationFieldData>>;
  numReplicas: ReturnType<typeof useZodFormValidation<NumReplicasFieldData>>;
  isModelSourceStepValid: boolean;
  isModelDeploymentStepValid: boolean;
  isAdvancedSettingsStepValid: boolean;
};

export const useModelDeploymentWizardValidation = (
  state: UseModelDeploymentWizardState['state'],
): ModelDeploymentWizardValidation => {
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

  // Step 3: Advanced Options
  const externalRouteValidation = useZodFormValidation(
    state.externalRoute.data,
    externalRouteFieldSchema,
  );

  const tokenAuthenticationValidation = useZodFormValidation(
    state.tokenAuthentication.data,
    tokenAuthenticationFieldSchema,
  );

  const numReplicasValidation = useZodFormValidation(
    state.numReplicas.data,
    numReplicasFieldSchema,
  );

  // Step validation
  const isModelSourceStepValid =
    modelSourceStepValidation.getFieldValidation(undefined, true).length === 0;
  const isModelDeploymentStepValid =
    isK8sNameDescriptionDataValid(state.k8sNameDesc.data) &&
    Object.keys(hardwareProfileValidation.getAllValidationIssues()).length === 0 &&
    Object.keys(modelFormatValidation.getAllValidationIssues()).length === 0 &&
    numReplicasValidation.getFieldValidation(undefined, true).length === 0;
  const isAdvancedSettingsStepValid =
    externalRouteValidation.getFieldValidation(undefined, true).length === 0 &&
    tokenAuthenticationValidation.getFieldValidation(undefined, true).length === 0;

  return {
    modelSource: modelSourceStepValidation,
    hardwareProfile: hardwareProfileValidation,
    externalRoute: externalRouteValidation,
    tokenAuthentication: tokenAuthenticationValidation,
    numReplicas: numReplicasValidation,
    isModelSourceStepValid,
    isModelDeploymentStepValid,
    isAdvancedSettingsStepValid,
  };
};
