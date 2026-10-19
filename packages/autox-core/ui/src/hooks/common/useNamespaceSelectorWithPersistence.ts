import { useNamespaceSelector, type UseNamespaceSelectorArgs } from 'mod-arch-core';

/** Shared options so the app remembers the selected namespace (host + standalone). */
const PERSISTENCE_OPTIONS = {
  storeLastNamespace: true,
} satisfies UseNamespaceSelectorArgs;

/**
 * Wraps `useNamespaceSelector` with the persistence options used across AutoX products so
 * namespace-selection updates stay aligned.
 */
export function useNamespaceSelectorWithPersistence(): ReturnType<typeof useNamespaceSelector> {
  return useNamespaceSelector(PERSISTENCE_OPTIONS);
}
