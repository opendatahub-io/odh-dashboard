import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';

export const useProjectDisplayName = (namespace?: string): string => {
  const { namespaces } = useNamespaceSelectorWithPersistence();
  return namespaces.find((ns) => ns.name === namespace)?.displayName ?? namespace ?? '';
};
