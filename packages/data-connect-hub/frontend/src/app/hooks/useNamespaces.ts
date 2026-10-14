import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import { getNamespaces } from '~/app/api/k8s';
import { NamespaceKind } from '~/app/types';

export const useNamespaces = (
  fetchEnabled = true,
): [NamespaceKind[], boolean, Error | undefined] => {
  const callback = React.useCallback<FetchStateCallbackPromise<NamespaceKind[]>>(
    (opts: APIOptions) => (fetchEnabled ? getNamespaces('')(opts) : Promise.resolve([])),
    [fetchEnabled],
  );
  const [namespaces, loaded, error] = useFetchState<NamespaceKind[]>(callback, []);

  return [namespaces, loaded, error];
};
