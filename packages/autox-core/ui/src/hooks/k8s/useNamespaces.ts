import { useFetchState, APIOptions, FetchStateCallbackPromise } from 'mod-arch-core';
import React from 'react';
import type { NamespaceKind } from '../../api/k8s/types';
import { useAutoXApi } from '../../context/AutoXApiContext';

/**
 * Creates a `useNamespaces` hook bound to a product's own k8s API (as returned by
 * `createK8sApi`).
 */
export function useNamespaces(): [NamespaceKind[], boolean, Error | undefined] {
  const { k8s: k8sApi } = useAutoXApi();
  const callback = React.useCallback<FetchStateCallbackPromise<NamespaceKind[]>>(
    (opts: APIOptions) => k8sApi.getNamespaces('')(opts),
    [k8sApi],
  );
  const [namespaces, loaded, error] = useFetchState<NamespaceKind[]>(callback, []);

  return [namespaces, loaded, error];
}

// Kept local for focused hook tests; product packages use useNamespaces above.
export function createUseNamespaces(
  getNamespaces: (hostPath: string) => (opts: APIOptions) => Promise<NamespaceKind[]>,
): () => [NamespaceKind[], boolean, Error | undefined] {
  return function useProductNamespaces(): [NamespaceKind[], boolean, Error | undefined] {
    const callback = React.useCallback<FetchStateCallbackPromise<NamespaceKind[]>>(
      (opts: APIOptions) => getNamespaces('')(opts),
      // The factory argument is intentionally stable for the lifetime of this hook.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [getNamespaces],
    );
    const [namespaces, loaded, error] = useFetchState<NamespaceKind[]>(callback, []);
    return [namespaces, loaded, error];
  };
}
