import { getGeneratedSecretName } from '@odh-dashboard/k8s-core';
import type { K8sAPIOptions, SecretKind, ServiceAccountKind } from '@odh-dashboard/k8s-core';
import { createSecret, getSecret, replaceSecret } from '@odh-dashboard/k8s-core/api/secrets';
import {
  createServiceAccount,
  getServiceAccount,
  replaceServiceAccount,
} from '@odh-dashboard/k8s-core/api/serviceAccounts';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import type { HuggingFaceApiKeyFieldData } from './wizard-fields';
import {
  HF_TOKEN_DASHBOARD_LABEL,
  HF_TOKEN_ENV_NAME,
  getHfTokenServiceAccountName,
  isDashboardManagedHfTokenSecret,
} from './hfTokenConstants';

const is404 = (error: unknown): boolean => getGenericErrorCode(error) === 404;

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

export const assembleHfTokenServiceAccount = (
  name: string,
  namespace: string,
  secretName: string,
): ServiceAccountKind => ({
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  metadata: {
    name,
    namespace,
    labels: {
      [HF_TOKEN_DASHBOARD_LABEL]: 'true',
    },
  },
  secrets: [{ name: secretName }],
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

/**
 * Ensures a ServiceAccount exists that references the HF token Secret (KServe Option 1).
 * SA name is derived from the deployment k8s name: `{deployment}-hf-sa`.
 */
export const resolveHfTokenServiceAccountName = async (
  namespace: string,
  secretName: string | undefined,
  deploymentK8sName: string,
  opts?: K8sAPIOptions,
): Promise<string | undefined> => {
  if (!secretName || !deploymentK8sName) {
    return undefined;
  }

  const serviceAccountName = getHfTokenServiceAccountName(deploymentK8sName);
  const desired = assembleHfTokenServiceAccount(serviceAccountName, namespace, secretName);

  try {
    const existing = await getServiceAccount(serviceAccountName, namespace, opts);
    const hasSecretRef = existing.secrets?.some((secret) => secret.name === secretName);
    if (hasSecretRef) {
      return serviceAccountName;
    }

    const replaced = await replaceServiceAccount(
      {
        ...existing,
        metadata: {
          ...existing.metadata,
          labels: {
            ...existing.metadata.labels,
            [HF_TOKEN_DASHBOARD_LABEL]: 'true',
          },
        },
        secrets: [
          ...(existing.secrets ?? []).filter((secret) => secret.name !== secretName),
          { name: secretName },
        ],
      },
      opts,
    );
    return replaced.metadata.name;
  } catch (error) {
    if (!is404(error)) {
      throw error;
    }
    const created = await createServiceAccount(desired, opts);
    return created.metadata.name;
  }
};
