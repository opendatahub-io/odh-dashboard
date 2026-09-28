import { getGeneratedSecretName } from '@odh-dashboard/k8s-core';
import type { K8sAPIOptions, SecretKind } from '@odh-dashboard/k8s-core';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import type { HuggingFaceApiKeyFieldData } from './wizard-fields';
import {
  HF_TOKEN_DASHBOARD_LABEL,
  HF_TOKEN_ENV_NAME,
  isDashboardManagedHfTokenSecret,
} from './hfTokenConstants';

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
