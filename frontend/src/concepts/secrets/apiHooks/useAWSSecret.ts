import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { DATA_CONNECTION_PREFIX, getSecret } from '~/api';
import { AWSSecretKind, SecretKind } from '~/k8sTypes';

const isAWSSecret = (secret: SecretKind): secret is AWSSecretKind =>
  secret.metadata.name.startsWith(DATA_CONNECTION_PREFIX);

const useAWSSecret = (name: string | null, namespace: string): FetchState<AWSSecretKind | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<AWSSecretKind | null>>(
    (opts) => {
      if (!name) {
        return Promise.reject(new NotReadyError('Secret name is missing'));
      }
      return getSecret(namespace, name, opts).then((secret) => {
        if (isAWSSecret(secret)) {
          return secret;
        }

        throw new Error('Not a valid data connection');
      });
    },
    [name, namespace],
  );

  return useFetchState(callback, null);
};

export default useAWSSecret;
