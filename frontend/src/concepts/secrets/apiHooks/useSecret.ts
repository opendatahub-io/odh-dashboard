import * as React from 'react';
import useFetchState, { FetchStateCallbackPromise, NotReadyError } from '~/utilities/useFetchState';
import { getSecret } from '~/api';
import { SecretKind } from '~/k8sTypes';

const useSecret = (name: string | null, namespace: string) => {
  const callback = React.useCallback<FetchStateCallbackPromise<SecretKind | null>>(
    (opts) => {
      if (!name) {
        return Promise.reject(new NotReadyError('Secret name is missing'));
      }
      return getSecret(namespace, name, opts);
    },
    [name, namespace],
  );

  return useFetchState(callback, null);
};

export default useSecret;
