import React from 'react';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import type { WizardFormData } from './types';
import { modelSourceStepSchema, type ModelSourceStepData } from './steps/ModelSourceStep';
import { externalRouteFieldSchema, type ExternalRouteFieldData } from './fields/ExternalRouteField';
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
import { modelFormatFieldSchema, type ModelFormatFieldData } from './fields/ModelFormatField';
import { isValidProjectName } from './fields/ProjectSection';

export type ModelDeploymentWizardValidation = {
  modelSource: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  externalRoute: ReturnType<typeof useZodFormValidation<ExternalRouteFieldData>>;
  tokenAuthentication: ReturnType<typeof useZodFormValidation<TokenAuthenticationFieldData>>;
  numReplicas: ReturnType<typeof useZodFormValidation<NumReplicasFieldData>>;
  runtimeArgs: ReturnType<typeof useZodFormValidation<RuntimeArgsFieldData>>;
  environmentVariables: ReturnType<typeof useZodFormValidation<EnvironmentVariablesFieldData>>;
  modelServer: ReturnType<typeof useZodFormValidation<ModelServerSelectFieldData>>;
  modelFormat: ReturnType<typeof useZodFormValidation<ModelFormatFieldData>>;
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
  const hardwareProfileValidated = state.hardwareProfileOptions.validateHardwareProfileForm();

  const modelServerValidation = useZodFormValidation(
    state.modelServer.data,
    modelServerSelectFieldSchema,
  );

  const modelFormatValidation = useZodFormValidation(
    state.modelFormatState.modelFormat,
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
    isValidProjectName(
      state.project.initialProjectName ?? state.project.projectName ?? undefined,
    ) &&
    isK8sNameDescriptionDataValid(state.k8sNameDesc.data) &&
    hardwareProfileValidated &&
    numReplicasValidation.getFieldValidation(undefined, true).length === 0 &&
    modelServerValidation.getFieldValidation(undefined, true).length === 0 &&
    (!state.modelFormatState.isVisible ||
      modelFormatValidation.getFieldValidation(undefined, true).length === 0);
  const isAdvancedSettingsStepValid =
    externalRouteValidation.getFieldValidation(undefined, true).length === 0 &&
    tokenAuthenticationValidation.getFieldValidation(undefined, true).length === 0 &&
    !hasInvalidEnvironmentVariableNames(state.environmentVariables.data);
  return {
    modelSource: modelSourceStepValidation,
    externalRoute: externalRouteValidation,
    modelServer: modelServerValidation,
    modelFormat: modelFormatValidation,
    tokenAuthentication: tokenAuthenticationValidation,
    numReplicas: numReplicasValidation,
    runtimeArgs: runtimeArgsValidation,
    environmentVariables: environmentVariablesValidation,
    isModelSourceStepValid,
    isModelDeploymentStepValid,
    isAdvancedSettingsStepValid,
  };
};
