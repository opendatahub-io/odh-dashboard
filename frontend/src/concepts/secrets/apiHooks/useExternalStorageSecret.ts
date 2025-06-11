import * as React from 'react';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { getSecret } from '#~/api';
import { SecretKind } from '#~/k8sTypes';

const useExternalStorageSecret = (
  name: string | undefined,
  namespace: string,
): FetchState<SecretKind | null> => {
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

export default useExternalStorageSecret;
