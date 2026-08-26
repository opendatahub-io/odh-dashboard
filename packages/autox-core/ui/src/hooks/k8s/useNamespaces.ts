import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import type { K8sApi, NamespaceKind } from '../../api/k8s';

/**
 * Creates a `useNamespaces` hook bound to a product's own k8s API (as returned by
 * `createK8sApi`).
 */
export function createUseNamespaces(
  getNamespaces: K8sApi['getNamespaces'],
): () => [NamespaceKind[], boolean, Error | undefined] {
  return function useNamespaces(): [NamespaceKind[], boolean, Error | undefined] {
    const callback = React.useCallback<FetchStateCallbackPromise<NamespaceKind[]>>(
      (opts: APIOptions) => getNamespaces('')(opts),
      [],
    );
    const [namespaces, loaded, error] = useFetchState<NamespaceKind[]>(callback, []);

    return [namespaces, loaded, error];
  };
}
