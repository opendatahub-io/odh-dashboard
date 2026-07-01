import React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { getSecrets } from '#~/api/k8s/secrets';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import useFetchState, {
  FetchStateCallbackPromise,
  NotReadyError,
  FetchState,
} from '#~/utilities/useFetchState';

export const useExistingSecrets = (
  namespace: string,
  enabled: boolean,
): FetchState<SecretKind[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SecretKind[]>>(
    (opts) => {
      if (!enabled) {
        return Promise.reject(new NotReadyError('Hook is disabled'));
      }

      if (!namespace) {
        return Promise.reject(new NotReadyError('No namespace provided'));
      }

      return getSecrets(namespace, opts).then((secrets) =>
        secrets.filter((secret) => secret.type === 'Opaque' && !isConnection(secret)),
      );
    },
    [namespace, enabled],
  );

  return useFetchState(callback, []);
};
