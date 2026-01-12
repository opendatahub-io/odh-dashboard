import React from 'react';
import { z } from 'zod';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { useValidation } from '@odh-dashboard/internal/utilities/useValidation';
import { hardwareProfileValidationSchema } from '@odh-dashboard/internal/concepts/hardwareProfiles/validationUtils';
import type { WizardField, WizardFormData } from './types';
import { modelSourceStepSchema, type ModelSourceStepData } from './steps/ModelSourceStep';
import { externalRouteFieldSchema } from './fields/ExternalRouteField';
import { tokenAuthenticationFieldSchema } from './fields/TokenAuthenticationField';
import { numReplicasFieldSchema, type NumReplicasFieldData } from './fields/NumReplicasField';
import { runtimeArgsFieldSchema } from './fields/RuntimeArgsField';
import { environmentVariablesFieldSchema } from './fields/EnvironmentVariablesField';
import {
  ModelServerSelectFieldData,
  modelServerSelectFieldSchema,
} from './fields/ModelServerTemplateSelectField';
import { modelFormatFieldSchema, type ModelFormatFieldData } from './fields/ModelFormatField';
import { isValidProjectName } from './fields/ProjectSection';

export type ModelDeploymentWizardValidation = {
  modelSource: ReturnType<typeof useZodFormValidation<ModelSourceStepData>>;
  hardwareProfile: ReturnType<typeof useValidation>;
  numReplicas: ReturnType<typeof useZodFormValidation<NumReplicasFieldData>>;
  modelServer: ReturnType<typeof useZodFormValidation<ModelServerSelectFieldData>>;
  modelFormat: ReturnType<typeof useZodFormValidation<ModelFormatFieldData>>;
  isModelSourceStepValid: boolean;
  isModelDeploymentStepValid: boolean;
  isAdvancedSettingsStepValid: boolean;
};

export const useModelDeploymentWizardValidation = (
  state: WizardFormData['state'],
  fields: WizardField<unknown>[] = [],
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

  const modelServerValidation = useZodFormValidation(
    state.modelServer.data,
    modelServerSelectFieldSchema,
  );

  const modelFormatValidation = useZodFormValidation(
    state.modelFormatState.modelFormat,
    modelFormatFieldSchema,
  );

  const numReplicasValidation = useZodFormValidation(
    state.numReplicas.data,
    numReplicasFieldSchema,
  );

  // Step 3: Advanced Options
  const step3Fields = fields.filter((field) => field.step === 'advancedOptions');
  const advancedOptionsValidation = useZodFormValidation(
    {
      externalRoute: state.externalRoute.data,
      tokenAuthentication: state.tokenAuthentication.data,
      runtimeArgs: state.runtimeArgs.data,
      environmentVariables: state.environmentVariables.data,
      ...step3Fields.reduce<Record<string, unknown>>((acc, field) => {
        acc[field.id] = state[field.id];
        return acc;
      }, {}),
    },
    z.object({
      externalRoute: externalRouteFieldSchema,
      tokenAuthentication: tokenAuthenticationFieldSchema,
      runtimeArgs: runtimeArgsFieldSchema,
      environmentVariables: environmentVariablesFieldSchema,
      ...step3Fields.reduce<Record<string, z.ZodTypeAny>>((acc, field) => {
        if (field.reducerFunctions.validationSchema) {
          acc[field.id] = field.reducerFunctions.validationSchema;
        }
        return acc;
      }, {}),
    }),
  );

  // Step validation
  const isModelSourceStepValid =
    modelSourceStepValidation.getFieldValidation(undefined, true).length === 0;
  const isModelDeploymentStepValid =
    isValidProjectName(
      state.project.initialProjectName ?? state.project.projectName ?? undefined,
    ) &&
    isK8sNameDescriptionDataValid(state.k8sNameDesc.data) &&
    Object.keys(hardwareProfileValidation.getAllValidationIssues()).length === 0 &&
    numReplicasValidation.getFieldValidation(undefined, true).length === 0 &&
    modelServerValidation.getFieldValidation(undefined, true).length === 0 &&
    (!state.modelFormatState.isVisible ||
      modelFormatValidation.getFieldValidation(undefined, true).length === 0);
  const isAdvancedSettingsStepValid =
    advancedOptionsValidation.getFieldValidation(undefined, true).length === 0;
  return {
    modelSource: modelSourceStepValidation,
    hardwareProfile: hardwareProfileValidation,
    modelServer: modelServerValidation,
    modelFormat: modelFormatValidation,
    numReplicas: numReplicasValidation,
    isModelSourceStepValid,
    isModelDeploymentStepValid,
    isAdvancedSettingsStepValid,
  };
};
