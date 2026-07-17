import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, {
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { listSecrets } from '#~/api/k8s/secrets';
import { isExistingSecretEligible } from './existingSecretUtils';

export const useExistingSecrets = (
  namespace: string,
  enabled: boolean,
): [secrets: SecretKind[], loaded: boolean, error: Error | undefined] => {
  const call = React.useCallback<FetchStateCallbackPromise<SecretKind[]>>(
    async (opts) => {
      if (!enabled || !namespace) {
        return Promise.reject(new NotReadyError('Not enabled or no namespace'));
      }
      const allSecrets = await listSecrets(namespace, opts);
      return allSecrets.filter(isExistingSecretEligible);
    },
    [namespace, enabled],
  );
  return useFetchState(call, []);
};
