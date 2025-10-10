import { MetadataAnnotation, type SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import type { LLMdContainer, LLMInferenceServiceKind, LLMdDeployment } from '../types';
import {
  ModelLocationData,
  ModelLocationType,
} from '../../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';

export const applyModelLocation = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelLocation: string,
): LLMInferenceServiceKind => {
  const result = structuredClone(llmdInferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    [MetadataAnnotation.ConnectionName]: modelLocation,
  };
  return result;
};

export const extractModelFormat = (): SupportedModelFormats | null => {
  return null;
};

/**
 * Helper function to ensure the main container exists and return a cloned service with the container
 */
const structuredCloneWithMainContainer = (
  llmdInferenceService: LLMInferenceServiceKind,
): {
  result: LLMInferenceServiceKind;
  mainContainer: LLMdContainer;
} => {
  const result = structuredClone(llmdInferenceService);
  if (!result.spec.template) {
    result.spec.template = {
      containers: [],
    };
  }
  let mainContainer = result.spec.template.containers?.find(
    (container) => container.name === 'main',
  );
  if (!mainContainer) {
    mainContainer = {
      name: 'main',
    };
    result.spec.template.containers?.push(mainContainer);
  }
  return { result, mainContainer };
};

export const applyModelArgs = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelArgs?: string[],
): LLMInferenceServiceKind => {
  if (!modelArgs) {
    return llmdInferenceService;
  }
  const { result, mainContainer } = structuredCloneWithMainContainer(llmdInferenceService);
  mainContainer.args = modelArgs;
  return result;
};

export const applyModelEnvVars = (
  llmdInferenceService: LLMInferenceServiceKind,
  modelEnvVars?: { name: string; value: string }[],
): LLMInferenceServiceKind => {
  if (!modelEnvVars) {
    return llmdInferenceService;
  }
  const { result, mainContainer } = structuredCloneWithMainContainer(llmdInferenceService);
  mainContainer.env = modelEnvVars;
  return result;
};

export const extractRuntimeArgs = (
  llmdDeployment: LLMdDeployment,
): { enabled: boolean; args: string[] } | null => {
  const args =
    llmdDeployment.model.spec.template?.containers?.find((container) => container.name === 'main')
      ?.args || [];
  return {
    enabled: args.length > 0,
    args,
  };
};

export const extractEnvironmentVariables = (
  llmdDeployment: LLMdDeployment,
): { enabled: boolean; variables: { name: string; value: string }[] } | null => {
  const envVars =
    llmdDeployment.model.spec.template?.containers?.find((container) => container.name === 'main')
      ?.env || [];
  return {
    enabled: envVars.length > 0,
    variables: envVars.map((envVar) => ({
      name: envVar.name,
      value: String(envVar.value || ''),
    })),
  };
};

export const extractModelLocationData = (
  llmdDeployment: LLMdDeployment,
): ModelLocationData | null => {
  const connectionName =
    llmdDeployment.model.metadata.annotations?.[MetadataAnnotation.ConnectionName];

  if (connectionName) {
    return {
      type: ModelLocationType.EXISTING,
      connection: connectionName,
      fieldValues: {},
      additionalFields: {},
    };
  }

  return null;
};
