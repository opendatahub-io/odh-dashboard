import React from 'react';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useValidation } from '@odh-dashboard/internal/utilities/useValidation';
import { hardwareProfileValidationSchema } from '@odh-dashboard/internal/concepts/hardwareProfiles/validationUtils';
import type { WizardFormData } from './types';
import { modelSourceStepSchema, type ModelSourceStepData } from './steps/ModelSourceStep';
import { modelFormatFieldSchema } from './fields/ModelFormatField';
import { externalRouteFieldSchema, type ExternalRouteFieldData } from './fields/ExternalRouteField';
import {
  anonymousAccessFieldSchema,
  type AnonymousAccessFieldData,
} from './fields/AnonymousAccessField';
import {
  tokenAuthenticationFieldSchema,
  type TokenAuthenticationFieldData,
} from './fields/TokenAuthenticationField';
import { numReplicasFieldSchema, type NumReplicasFieldData } from './fields/NumReplicasField';
import { runtimeArgsFieldSchema, type RuntimeArgsFieldData } from './fields/RuntimeArgsField';
import {
  environmentVariablesFieldSchema,
  hasInvalidEnvironmentVariableNames,
  type EnvironmentVariablesFieldData,
} from './fields/EnvironmentVariablesField';
import {
  ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
} from './fields/ModelServerTemplateSelectField';

export type ModelDeploymentWizardValidation = {
  modelSource: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  hardwareProfile: ReturnType<typeof useValidation>;
  externalRoute: ReturnType<typeof useZodFormValidation<ExternalRouteFieldData>>;
  anonymousAccess: ReturnType<typeof useZodFormValidation<AnonymousAccessFieldData>>;
  tokenAuthentication: ReturnType<typeof useZodFormValidation<TokenAuthenticationFieldData>>;
  numReplicas: ReturnType<typeof useZodFormValidation<NumReplicasFieldData>>;
  runtimeArgs: ReturnType<typeof useZodFormValidation<RuntimeArgsFieldData>>;
  environmentVariables: ReturnType<typeof useZodFormValidation<EnvironmentVariablesFieldData>>;
  modelServer: ReturnType<typeof useZodFormValidation<ModelServerSelectFieldData>>;
  isModelSourceStepValid: boolean;
  isModelDeploymentStepValid: boolean;
  isAdvancedSettingsStepValid: boolean;
};

export const useModelDeploymentWizardValidation = (
  state: WizardFormData['state'],
): ModelDeploymentWizardValidation => {
  // Step 1: Model Source
  const modelSourceStepValidationData: Partial<ModelSourceStepData> = React.useMemo(
    () => ({
      modelType: state.modelType.data,
      modelLocationData: state.modelLocationData.data,
      createConnectionData: state.createConnectionData.data,
    }),
    [state.modelType, state.modelLocationData.data, state.createConnectionData.data],
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

  const modelServerValidation = useZodFormValidation(
    state.modelServer.data,
    modelServerSelectFieldSchema,
  );

  // Step 3: Advanced Options
  const externalRouteValidation = useZodFormValidation(
    state.externalRoute.data,
    externalRouteFieldSchema,
  );

  const anonymousAccessValidation = useZodFormValidation(
    state.anonymousAccess.data,
    anonymousAccessFieldSchema,
  );

  const tokenAuthenticationValidation = useZodFormValidation(
    state.tokenAuthentication.data,
    tokenAuthenticationFieldSchema,
  );

  const numReplicasValidation = useZodFormValidation(
    state.numReplicas.data,
    numReplicasFieldSchema,
  );

  const runtimeArgsValidation = useZodFormValidation(
    state.runtimeArgs.data,
    runtimeArgsFieldSchema,
  );

  const environmentVariablesValidation = useZodFormValidation(
    state.environmentVariables.data,
    environmentVariablesFieldSchema,
  );

  // Step validation
  const isModelSourceStepValid =
    modelSourceStepValidation.getFieldValidation(undefined, true).length === 0;
  const isModelDeploymentStepValid =
    isK8sNameDescriptionDataValid(state.k8sNameDesc.data) &&
    Object.keys(hardwareProfileValidation.getAllValidationIssues()).length === 0 &&
    Object.keys(modelFormatValidation.getAllValidationIssues()).length === 0 &&
    numReplicasValidation.getFieldValidation(undefined, true).length === 0 &&
    modelServerValidation.getFieldValidation(undefined, true).length === 0;
  const isAdvancedSettingsStepValid =
    externalRouteValidation.getFieldValidation(undefined, true).length === 0 &&
    anonymousAccessValidation.getFieldValidation(undefined, true).length === 0 &&
    tokenAuthenticationValidation.getFieldValidation(undefined, true).length === 0 &&
    !hasInvalidEnvironmentVariableNames(state.environmentVariables.data);
  return {
    modelSource: modelSourceStepValidation,
    hardwareProfile: hardwareProfileValidation,
    externalRoute: externalRouteValidation,
    anonymousAccess: anonymousAccessValidation,
    modelServer: modelServerValidation,
    tokenAuthentication: tokenAuthenticationValidation,
    numReplicas: numReplicasValidation,
    runtimeArgs: runtimeArgsValidation,
    environmentVariables: environmentVariablesValidation,
    isModelSourceStepValid,
    isModelDeploymentStepValid,
    isAdvancedSettingsStepValid,
  };
};
