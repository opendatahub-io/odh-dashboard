import {
  useFetchState,
  APIOptions,
  FetchStateCallbackPromise,
  FetchStateRefreshPromise,
} from 'mod-arch-core';
import React from 'react';
import { getNamespaces } from '~/app/api/k8s';
import { NamespaceKind } from '~/app/types';

export const useNamespaces = (): [
  NamespaceKind[],
  boolean,
  Error | undefined,
  FetchStateRefreshPromise<NamespaceKind[]>,
] => {
  const callback = React.useCallback<FetchStateCallbackPromise<NamespaceKind[]>>(
    (opts: APIOptions) => getNamespaces('')(opts),
    [],
  );
  const [namespaces, loaded, error, refresh] = useFetchState<NamespaceKind[]>(callback, []);

  return [namespaces, loaded, error, refresh];
};
