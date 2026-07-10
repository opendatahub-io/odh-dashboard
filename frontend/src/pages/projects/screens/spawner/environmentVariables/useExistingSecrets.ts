import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { type SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { SecretModel } from '#~/api/models';
import { isConnection } from '#~/concepts/connectionTypes/utils';

/**
 * Hook to fetch existing Opaque secrets in a namespace, excluding Connection secrets.
 * Supports lazy loading through the enabled parameter.
 *
 * @param namespace - The Kubernetes namespace to query
 * @param enabled - Whether to actually fetch the secrets (false prevents the query)
 * @returns [data, loaded, error, refresh] tuple compatible with useFetchState pattern
 */
export const useExistingSecrets = (
  namespace: string,
  enabled: boolean,
): FetchState<SecretKind[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SecretKind[]>>(async () => {
    if (!enabled) {
      return Promise.reject(new NotReadyError('Fetching is disabled'));
    }

    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace provided'));
    }

    // Query all secrets in the namespace (no label selector)
    const result = await k8sListResource<SecretKind>({
      model: SecretModel,
      queryOptions: { ns: namespace },
    });

    // Filter to only Opaque secrets that are not Connections
    const filteredSecrets = result.items.filter((secret: SecretKind) => {
      // Only include Opaque type secrets
      if (secret.type !== 'Opaque') {
        return false;
      }

      // Exclude Connection secrets
      if (isConnection(secret)) {
        return false;
      }

      return true;
    });

    return filteredSecrets;
  }, [namespace, enabled]);

  return useFetchState(callback, []);
};
