import { MetadataAnnotation, type SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import type { LLMdContainer, LLMInferenceServiceKind } from '../types';

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
