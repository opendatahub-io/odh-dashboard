import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { SecretModel } from '#~/api/models';
import { SecretKind } from '#~/k8sTypes';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';

const CONNECTION_ANNOTATION_KEYS = [
  'opendatahub.io/connection-type-protocol',
  'opendatahub.io/connection-type-ref',
];

export const isConnectionSecret = (secret: SecretKind): boolean =>
  CONNECTION_ANNOTATION_KEYS.some((key) => key in (secret.metadata.annotations ?? {}));

export const useExistingSecrets = (namespace?: string): FetchState<SecretKind[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SecretKind[]>>(async () => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    const result = await k8sListResource<SecretKind>({
      model: SecretModel,
      queryOptions: { ns: namespace },
    });

    return result.items.filter((secret) => secret.type === 'Opaque' && !isConnectionSecret(secret));
  }, [namespace]);

  return useFetchState(callback, []);
};
