import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { KnownLabels, type SecretKind } from '@odh-dashboard/k8s-core';
import { isConnection } from '@odh-dashboard/k8s-core';
import { SecretModel } from '#~/api/models';
import { useAccessReview } from '#~/api/useAccessReview';
import { ExistingSecretMetadata } from '#~/pages/projects/types';

/**
 * Returns true if the secret was created by the dashboard
 * (has opendatahub.io/dashboard: 'true' label).
 */
const isDashboardSecret = (secret: SecretKind): boolean =>
  secret.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE] === 'true';

/**
 * Fetches all Opaque secrets in a namespace and returns only the ones
 * that are NOT dashboard-created and NOT connection secrets.
 * Strips secret values — only metadata.name and data key names are exposed.
 */
export const fetchExistingSecrets = async (
  namespace: string,
): Promise<ExistingSecretMetadata[]> => {
  const result = await k8sListResource<SecretKind>({
    model: SecretModel,
    queryOptions: { ns: namespace },
  });

  return result.items
    .filter(
      (secret) =>
        (secret.type ?? 'Opaque') === 'Opaque' &&
        !isDashboardSecret(secret) &&
        !isConnection(secret),
    )
    .map((secret) => ({
      name: secret.metadata.name,
      keys: secret.data ? Object.keys(secret.data) : [],
    }));
};

type UseExistingSecretsResult = {
  secrets: ExistingSecretMetadata[];
  loaded: boolean;
  canList: boolean;
  error?: Error;
};

/**
 * Hook that lazily fetches existing (non-dashboard, non-connection) secrets
 * in the given namespace. Includes an RBAC check to verify the user can list secrets.
 *
 * Returns only secret names and their key names — values are never exposed.
 */
export const useExistingSecrets = (namespace: string): UseExistingSecretsResult => {
  const [isAllowed, isAllowedLoaded] = useAccessReview({
    group: '',
    resource: 'secrets',
    verb: 'list',
    namespace,
  });

  const [secrets, setSecrets] = React.useState<ExistingSecretMetadata[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    setSecrets([]);
    setLoaded(false);
    setError(undefined);

    if (!isAllowedLoaded || !isAllowed || !namespace) {
      return;
    }

    let cancelled = false;

    fetchExistingSecrets(namespace)
      .then((result) => {
        if (!cancelled) {
          setSecrets(result);
          setLoaded(true);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [namespace, isAllowed, isAllowedLoaded]);

  const shouldFetch = !!namespace && isAllowed;

  return {
    secrets: shouldFetch ? secrets : [],
    loaded: !namespace || (isAllowedLoaded && (loaded || !isAllowed)),
    canList: isAllowed,
    error,
  };
};
