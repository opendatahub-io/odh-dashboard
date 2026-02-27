import { useFetchState, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getProviders } from '~/app/api/k8s';
import { Provider } from '~/app/types';

type UseProvidersResult = {
  providers: Provider[];
  loaded: boolean;
  loadError: Error | undefined;
};

export const useProviders = (namespace: string): UseProvidersResult => {
  const fetchProviders = React.useCallback<FetchStateCallbackPromise<Provider[]>>(
    (opts) => getProviders('', namespace)(opts),
    [namespace],
  );

  const [providers, loaded, loadError] = useFetchState<Provider[]>(fetchProviders, [], {
    initialPromisePurity: true,
  });

  return { providers, loaded, loadError };
};
