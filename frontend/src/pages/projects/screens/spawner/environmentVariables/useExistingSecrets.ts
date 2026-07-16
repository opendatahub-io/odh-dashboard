import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getSecrets } from '#~/api';

export const isExistingSecret = (secret: SecretKind): boolean =>
  secret.type === 'Opaque' &&
  !secret.metadata.annotations?.['opendatahub.io/connection-type'] &&
  !secret.metadata.annotations?.['opendatahub.io/connection-type-protocol'] &&
  !secret.metadata.annotations?.['opendatahub.io/connection-type-ref'];

export const useExistingSecrets = (
  namespace: string,
  enabled: boolean,
): [secrets: SecretKind[], loaded: boolean, error: Error | undefined, refresh: () => void] => {
  const callback = React.useCallback(() => {
    if (!enabled) {
      return Promise.reject(new NotReadyError('Existing secret option not selected'));
    }
    return getSecrets(namespace).then((secrets) => secrets.filter(isExistingSecret));
  }, [namespace, enabled]);

  return useFetchState(callback, []);
};
