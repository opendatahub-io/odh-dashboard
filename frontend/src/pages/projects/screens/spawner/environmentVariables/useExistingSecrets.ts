import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetchState, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { getSecrets } from '#~/api';

const CONNECTION_ANNOTATION_KEYS = [
  'opendatahub.io/connection-type',
  'opendatahub.io/connection-type-protocol',
  'opendatahub.io/connection-type-ref',
];

const isConnectionSecret = (secret: SecretKind): boolean => {
  const { annotations } = secret.metadata;
  if (!annotations) {
    return false;
  }
  return CONNECTION_ANNOTATION_KEYS.some((key) => key in annotations);
};

export const useExistingSecrets = (
  namespace: string,
  enabled: boolean,
): [secrets: SecretKind[], loaded: boolean, error: Error | undefined, refresh: () => void] => {
  const callback = React.useCallback(() => {
    if (!enabled) {
      return Promise.reject(new NotReadyError('Existing secrets not enabled'));
    }
    return getSecrets(namespace).then((secrets) =>
      secrets.filter((secret) => secret.type === 'Opaque' && !isConnectionSecret(secret)),
    );
  }, [namespace, enabled]);

  return useFetchState(callback, []);
};
