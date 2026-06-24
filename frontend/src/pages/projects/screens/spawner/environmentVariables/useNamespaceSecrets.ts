import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
  NotReadyError,
} from '#~/utilities/useFetch';
import { SecretModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';

const CONNECTION_ANNOTATIONS = [
  'opendatahub.io/connection-type-protocol',
  'opendatahub.io/connection-type-ref',
];

const isConnectionSecret = (secret: SecretKind): boolean => {
  const { annotations } = secret.metadata;
  if (!annotations) {
    return false;
  }
  return CONNECTION_ANNOTATIONS.some((key) => key in annotations);
};

const useNamespaceSecrets = (
  namespace: string,
  enabled: boolean,
): FetchStateObject<SecretKind[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SecretKind[]>>(
    async (opts) => {
      if (!namespace || !enabled) {
        return Promise.reject(new NotReadyError('Namespace secrets not enabled'));
      }

      const result = await k8sListResource<SecretKind>(
        applyK8sAPIOptions(
          {
            model: SecretModel,
            queryOptions: { ns: namespace },
          },
          opts,
        ),
      );

      return result.items
        .filter((secret) => secret.type === 'Opaque')
        .filter((secret) => !isConnectionSecret(secret));
    },
    [namespace, enabled],
  );

  return useFetch(callback, []);
};

export default useNamespaceSecrets;
