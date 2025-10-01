import { MetadataAnnotation, type SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import type { LLMInferenceServiceKind } from '../types';

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
