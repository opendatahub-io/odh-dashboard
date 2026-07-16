import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getSecrets } from '#~/api';
import { filterExistingSecrets } from './existingSecretUtils';

export const useExistingSecrets = (
  namespace: string | undefined,
): [secrets: SecretKind[], loaded: boolean, error: Error | undefined, refresh: () => void] => {
  const callback = React.useCallback(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }
    return getSecrets(namespace).then(filterExistingSecrets);
  }, [namespace]);

  return useFetchState(callback, []);
};
