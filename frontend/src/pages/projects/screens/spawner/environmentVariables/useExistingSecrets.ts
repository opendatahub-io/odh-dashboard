import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { isConnection } from '@odh-dashboard/k8s-core';
import useFetchState, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { listOpaqueSecrets, hasProtocolAnnotation } from '#~/api';

const useExistingSecrets = (
  namespace: string,
  enabled: boolean,
): [secrets: SecretKind[], loaded: boolean, error: Error | undefined] => {
  const callback = React.useCallback(() => {
    if (!enabled) {
      return Promise.reject(new NotReadyError('Existing secrets not enabled'));
    }
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }
    return listOpaqueSecrets(namespace).then((secrets) =>
      secrets.filter((secret) => !isConnection(secret) && !hasProtocolAnnotation(secret)),
    );
  }, [namespace, enabled]);

  const [secrets, loaded, error] = useFetchState(callback, []);

  return [secrets, loaded, error];
};

export default useExistingSecrets;
