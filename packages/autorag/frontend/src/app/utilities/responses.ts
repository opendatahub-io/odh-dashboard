import type { AutoragPattern, AutoragProviderType } from '~/app/types/autoragPattern';

export const resolveDatabaseSecretName = (
  parameters?: Record<string, unknown>,
): string | undefined => {
  const canonical = parameters?.db_secret_name;
  if (typeof canonical === 'string' && canonical.trim() !== '') {
    return canonical.trim();
  }

  const legacy = parameters?.vector_db_secret_name;
  return typeof legacy === 'string' && legacy.trim() !== '' ? legacy.trim() : undefined;
};

export const resolveMaaSSecretName = (parameters?: Record<string, unknown>): string | undefined => {
  const secretName = parameters?.maas_secret_name;
  return typeof secretName === 'string' && secretName.trim() !== '' ? secretName.trim() : undefined;
};

export const normalizeStoreBindingProviderType = (
  providerType: unknown,
): AutoragProviderType | undefined => {
  switch (providerType) {
    case 'milvus':
    case 'remote::milvus':
      return 'milvus';
    case 'pgvector':
    case 'remote::pgvector':
      return 'pgvector';
    case 'neo4j':
      return 'neo4j';
    default:
      return undefined;
  }
};

export const getPatternStoreProvider = (
  pattern?: AutoragPattern,
): AutoragProviderType | undefined => {
  const binding = pattern?.settings.store_binding ?? pattern?.settings.vector_store_binding;
  return normalizeStoreBindingProviderType(binding?.provider_type);
};

export const isResponsesProvider = (provider?: AutoragProviderType): boolean =>
  provider === 'milvus' || provider === 'pgvector';
