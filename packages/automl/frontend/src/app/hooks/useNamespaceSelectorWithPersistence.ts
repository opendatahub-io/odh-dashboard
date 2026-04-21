import { useNamespaceSelector, type UseNamespaceSelectorArgs } from 'mod-arch-core';

/** Shared options when AutoML should remember the selected namespace (host + standalone). */
const NAMESPACE_SELECTOR_WITH_PERSISTENCE_OPTIONS = {
  storeLastNamespace: true,
} satisfies UseNamespaceSelectorArgs;

/**
 * Wraps `useNamespaceSelector` with the persistence options used across AutoML so updates stay aligned.
 */
export function useNamespaceSelectorWithPersistence(): ReturnType<typeof useNamespaceSelector> {
  return useNamespaceSelector(NAMESPACE_SELECTOR_WITH_PERSISTENCE_OPTIONS);
}
