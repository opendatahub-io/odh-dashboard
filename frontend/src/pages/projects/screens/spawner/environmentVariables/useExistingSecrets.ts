import * as React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { SecretModel } from '#~/api/models';
import { KnownLabels, SecretKind } from '#~/k8sTypes';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { useAccessReview } from '#~/api/useAccessReview';

const CONNECTION_ANNOTATION_KEYS = [
  'opendatahub.io/connection-type-protocol',
  'opendatahub.io/connection-type-ref',
];

export type SecretSummary = {
  name: string;
  keys: string[];
};

export const isConnectionSecret = (secret: SecretKind): boolean =>
  CONNECTION_ANNOTATION_KEYS.some((key) => key in (secret.metadata.annotations ?? {}));

export const isDashboardSecret = (secret: SecretKind): boolean =>
  secret.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE] === 'true';

export const useListSecretsAllowed = (namespace?: string): [allowed: boolean, loaded: boolean] =>
  useAccessReview(
    {
      group: '',
      resource: 'secrets',
      verb: 'list',
      namespace: namespace ?? '',
    },
    !!namespace,
  );

export const useExistingSecrets = (namespace?: string): FetchState<SecretSummary[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<SecretSummary[]>>(async () => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    const result = await k8sListResource<SecretKind>({
      model: SecretModel,
      queryOptions: { ns: namespace },
    });

    return result.items
      .filter(
        (secret) =>
          secret.type === 'Opaque' && !isConnectionSecret(secret) && !isDashboardSecret(secret),
      )
      .map(
        (secret): SecretSummary => ({
          name: secret.metadata.name,
          keys: secret.data ? Object.keys(secret.data) : [],
        }),
      );
  }, [namespace]);

  return useFetchState(callback, []);
};
