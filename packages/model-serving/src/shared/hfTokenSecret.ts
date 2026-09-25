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

/**
 * Reads the dashboard-managed HF token Secret name from a ServiceAccount.
 * Skips OpenShift-managed dockercfg/token refs by checking Secret labels + HF_TOKEN key.
 * Propagates auth/API failures; treats missing Secrets as absent.
 */
export const getHfTokenSecretNameFromServiceAccount = async (
  serviceAccountName: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<string | undefined> => {
  const serviceAccount = await getServiceAccount(serviceAccountName, namespace, opts);
  if (serviceAccount.metadata.labels?.[HF_TOKEN_DASHBOARD_LABEL] !== 'true') {
    return undefined;
  }

  const secretNames = (serviceAccount.secrets ?? [])
    .map((secret) => secret.name)
    .filter((name): name is string => Boolean(name));

  for (const name of secretNames) {
    try {
      const secret = await getSecret(namespace, name, opts);
      if (isDashboardManagedHfTokenSecret(secret)) {
        return name;
      }
    } catch (error) {
      if (is404(error)) {
        // Secret may have been deleted out of band; keep scanning other refs.
        continue;
      }
      throw error;
    }
  }

  return undefined;
};

/**
 * Keeps unrelated / OpenShift-managed SA secret refs, drops dangling (404) refs and
 * other dashboard-managed HF token secrets so the SA self-heals after rotations or
 * out-of-band deletes.
 */
const normalizeHfServiceAccountSecrets = async (
  existingSecrets: ServiceAccountKind['secrets'],
  secretName: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<NonNullable<ServiceAccountKind['secrets']>> => {
  const kept: NonNullable<ServiceAccountKind['secrets']> = [];

  for (const ref of existingSecrets ?? []) {
    if (!ref.name || ref.name === secretName) {
      continue;
    }
    try {
      const secret = await getSecret(namespace, ref.name, opts);
      if (isDashboardManagedHfTokenSecret(secret)) {
        continue;
      }
      kept.push({ name: ref.name });
    } catch (error) {
      if (is404(error)) {
        continue;
      }
      // Keep the ref when we cannot inspect it (e.g. 403) rather than mutating blindly.
      kept.push({ name: ref.name });
    }
  }

  return [...kept, { name: secretName }];
};

const secretRefsEqual = (
  left: ServiceAccountKind['secrets'],
  right: ServiceAccountKind['secrets'],
): boolean => {
  const leftNames = (left ?? [])
    .map((secret) => secret.name)
    .filter(Boolean)
    .toSorted();
  const rightNames = (right ?? [])
    .map((secret) => secret.name)
    .filter(Boolean)
    .toSorted();
  return (
    leftNames.length === rightNames.length &&
    leftNames.every((name, index) => name === rightNames[index])
  );
};

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
      try {
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
      } catch (error) {
        if (!is404(error)) {
          throw error;
        }
        // Configured secret was deleted out of band — create a replacement.
        const createdSecret = await createSecret(
          assembleHfTokenSecret(namespace, trimmedToken),
          opts,
        );
        return createdSecret.metadata.name;
      }
    }

    const createdSecret = await createSecret(assembleHfTokenSecret(namespace, trimmedToken), opts);
    return createdSecret.metadata.name;
  }

  return huggingFaceApiKey.configuredSecretName;
};

/**
 * Ensures a ServiceAccount exists that references the HF token Secret (KServe Option 1).
 * SA name is derived from the deployment k8s name: `{deployment}-hf-sa`.
 *
 * Only mutates ServiceAccounts already labeled as dashboard-managed to avoid clobbering
 * user-owned accounts that happen to share the generated name.
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
    const isDashboardManaged = existing.metadata.labels?.[HF_TOKEN_DASHBOARD_LABEL] === 'true';
    if (!isDashboardManaged) {
      throw new Error(
        `ServiceAccount ${serviceAccountName} already exists in ${namespace} and is not managed by the dashboard`,
      );
    }

    const nextSecrets = await normalizeHfServiceAccountSecrets(
      existing.secrets,
      secretName,
      namespace,
      opts,
    );
    if (secretRefsEqual(existing.secrets, nextSecrets)) {
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
        secrets: nextSecrets,
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
