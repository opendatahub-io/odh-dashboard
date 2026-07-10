import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, {
  FetchState,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getOpaqueSecrets } from '#~/api';
import { isConnection } from '#~/concepts/connectionTypes/utils';

const CONNECTION_ANNOTATION_KEYS = [
  'opendatahub.io/connection-type',
  'opendatahub.io/connection-type-ref',
  'opendatahub.io/connection-type-protocol',
] as const;

const isConnectionSecret = (secret: SecretKind): boolean => {
  if (isConnection(secret)) {
    return true;
  }
  const { annotations } = secret.metadata;
  if (!annotations) {
    return false;
  }
  return CONNECTION_ANNOTATION_KEYS.some((key) => key in annotations);
};

export const useExistingSecrets = (
  namespace: string,
  enabled: boolean,
): FetchState<SecretKind[]> => {
  const callback = React.useCallback(() => {
    if (!enabled) {
      return Promise.reject(new NotReadyError('Not enabled'));
    }
    return getOpaqueSecrets(namespace).then((secrets) =>
      secrets.filter((secret) => !isConnectionSecret(secret)),
    );
  }, [namespace, enabled]);

  return useFetchState(callback, []);
};
