import { getGeneratedSecretName } from '@odh-dashboard/k8s-core';
import type { K8sAPIOptions, SecretKind } from '@odh-dashboard/k8s-core';
import { createSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import type { HuggingFaceApiKeyFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { HF_TOKEN_ENV_NAME } from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

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
      'opendatahub.io/dashboard': 'true',
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
    const secret = assembleHfTokenSecret(
      namespace,
      trimmedToken,
      huggingFaceApiKey.configuredSecretName,
    );
    const createdSecret = huggingFaceApiKey.configuredSecretName
      ? await replaceSecret(secret, opts)
      : await createSecret(secret, opts);
    return createdSecret.metadata.name;
  }

  return huggingFaceApiKey.configuredSecretName;
};

export const extractHuggingFaceApiKeyFromEnv = (
  deployment: InferenceServiceKind,
): HuggingFaceApiKeyFieldData | null => {
  const hfEnv = deployment.spec.predictor.model?.env?.find(
    (envVar) =>
      envVar.name === HF_TOKEN_ENV_NAME && envVar.valueFrom?.secretKeyRef?.name !== undefined,
  );

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
