import { useNamespaceSelector, type UseNamespaceSelectorArgs } from 'mod-arch-core';

const PERSISTENCE_OPTIONS = {
  storeLastNamespace: true,
} satisfies UseNamespaceSelectorArgs;

export function useNamespaceSelectorWithPersistence(): ReturnType<typeof useNamespaceSelector> {
  return useNamespaceSelector(PERSISTENCE_OPTIONS);
}
