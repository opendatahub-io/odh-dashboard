import type { HuggingFaceApiKeyFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import {
  HF_TOKEN_ENV_NAME,
  isDashboardManagedHfTokenEnvVar,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

export { resolveHfTokenSecretName } from '@odh-dashboard/model-serving/shared/hfTokenSecret';

export const extractHuggingFaceApiKeyFromEnv = (
  deployment: InferenceServiceKind,
): HuggingFaceApiKeyFieldData | null => {
  const hfEnv = deployment.spec.predictor.model?.env?.find(isDashboardManagedHfTokenEnvVar);

  if (!hfEnv?.valueFrom?.secretKeyRef?.name) {
    return null;
  }

  return {
    token: '',
    configuredSecretName: hfEnv.valueFrom.secretKeyRef.name,
  };
};

export const applyHfTokenEnvVar = (
  inferenceService: InferenceServiceKind,
  secretName?: string,
): InferenceServiceKind => {
  if (!secretName) {
    return inferenceService;
  }

  const result = structuredClone(inferenceService);
  const existingEnv = result.spec.predictor.model?.env ?? [];
  const envWithoutHfToken = existingEnv.filter((envVar) => envVar.name !== HF_TOKEN_ENV_NAME);

  result.spec.predictor.model = {
    ...result.spec.predictor.model,
    env: [
      ...envWithoutHfToken,
      {
        name: HF_TOKEN_ENV_NAME,
        valueFrom: {
          secretKeyRef: {
            name: secretName,
            key: HF_TOKEN_ENV_NAME,
          },
        },
      },
    ],
  };

  return result;
};
