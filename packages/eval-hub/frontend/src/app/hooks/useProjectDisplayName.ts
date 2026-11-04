import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';

export const useProjectDisplayName = (namespace?: string): string => {
  const { namespaces } = useNamespaceSelectorWithPersistence();
  const record = namespaces.find((ns) => ns.name === namespace);
  return record?.displayName || namespace || '';
};
