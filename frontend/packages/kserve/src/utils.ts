import { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';

export const isModelServingStopped = (inferenceService?: InferenceServiceKind): boolean =>
  inferenceService?.metadata.annotations?.['serving.kserve.io/stop'] === 'true';
