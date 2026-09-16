import { getGeneratedSecretName } from '@odh-dashboard/k8s-core';
import type { K8sAPIOptions, SecretKind } from '@odh-dashboard/k8s-core';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import type { HuggingFaceApiKeyFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import {
  HF_TOKEN_DASHBOARD_LABEL,
  HF_TOKEN_ENV_NAME,
  isDashboardManagedHfTokenEnvVar,
  isDashboardManagedHfTokenSecret,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

const mergeHfTokenIntoExistingSecret = (existingSecret: SecretKind, token: string): SecretKind => ({
  ...existingSecret,
  metadata: {
    ...existingSecret.metadata,
    labels: {
      ...existingSecret.metadata.labels,
      [HF_TOKEN_DASHBOARD_LABEL]: 'true',
    },
  },
  stringData: {
    [HF_TOKEN_ENV_NAME]: token,
  },
});

export const assembleHfTokenSecret = (
  namespace: string,
  token: string,
  secretName?: string,
): SecretKind => ({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: secretName ?? getGeneratedSecretName(),
    namespace,
    labels: {
      [HF_TOKEN_DASHBOARD_LABEL]: 'true',
    },
  },
  stringData: {
    [HF_TOKEN_ENV_NAME]: token,
  },
});

export const resolveHfTokenSecretName = async (
  namespace: string,
  huggingFaceApiKey?: HuggingFaceApiKeyFieldData,
  opts?: K8sAPIOptions,
): Promise<string | undefined> => {
  if (!huggingFaceApiKey) {
    return undefined;
  }

  const trimmedToken = huggingFaceApiKey.token.trim();
  if (trimmedToken) {
    if (huggingFaceApiKey.configuredSecretName) {
      const existingSecret = await getSecret(
        namespace,
        huggingFaceApiKey.configuredSecretName,
        opts,
      );
      if (!isDashboardManagedHfTokenSecret(existingSecret)) {
        const createdSecret = await createSecret(
          assembleHfTokenSecret(namespace, trimmedToken),
          opts,
        );
        return createdSecret.metadata.name;
      }
      const replacedSecret = await replaceSecret(
        mergeHfTokenIntoExistingSecret(existingSecret, trimmedToken),
        opts,
      );
      return replacedSecret.metadata.name;
    }

    const createdSecret = await createSecret(assembleHfTokenSecret(namespace, trimmedToken), opts);
    return createdSecret.metadata.name;
  }

  return huggingFaceApiKey.configuredSecretName;
};

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
