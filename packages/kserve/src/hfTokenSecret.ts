import type { HuggingFaceApiKeyFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import {
  HF_TOKEN_ENV_NAME,
  HF_TOKEN_SECRET_ANNOTATION,
  isDashboardManagedHfTokenEnvVar,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

export {
  resolveHfTokenSecretName,
  resolveHfTokenServiceAccountName,
} from '@odh-dashboard/model-serving/shared/hfTokenSecret';

/**
 * Prefer SA + annotation (Option 1). Fall back to legacy env secretKeyRef for older deploys.
 */
export const extractHuggingFaceApiKey = (
  deployment: InferenceServiceKind,
): HuggingFaceApiKeyFieldData | null => {
  const annotatedSecretName = deployment.metadata.annotations?.[HF_TOKEN_SECRET_ANNOTATION];
  if (annotatedSecretName) {
    return {
      token: '',
      configuredSecretName: annotatedSecretName,
    };
  }

  const hfEnv = deployment.spec.predictor.model?.env?.find(isDashboardManagedHfTokenEnvVar);
  if (!hfEnv?.valueFrom?.secretKeyRef?.name) {
    return null;
  }

  return {
    token: '',
    configuredSecretName: hfEnv.valueFrom.secretKeyRef.name,
  };
};

/**
 * KServe Option 1: set predictor.serviceAccountName and record the secret annotation.
 * Removes any legacy HF_TOKEN env var from the model container.
 */
export const applyHfTokenServiceAccount = (
  inferenceService: InferenceServiceKind,
  secretName?: string,
  serviceAccountName?: string,
): InferenceServiceKind => {
  if (!secretName || !serviceAccountName) {
    return inferenceService;
  }

  const result = structuredClone(inferenceService);
  result.metadata.annotations = {
    ...result.metadata.annotations,
    [HF_TOKEN_SECRET_ANNOTATION]: secretName,
  };
  result.spec.predictor.serviceAccountName = serviceAccountName;

  const existingEnv = result.spec.predictor.model?.env ?? [];
  const envWithoutHfToken = existingEnv.filter((envVar) => envVar.name !== HF_TOKEN_ENV_NAME);
  if (result.spec.predictor.model) {
    result.spec.predictor.model = {
      ...result.spec.predictor.model,
      env: envWithoutHfToken,
    };
    if (envWithoutHfToken.length === 0) {
      delete result.spec.predictor.model.env;
    }
  }

  return result;
};
