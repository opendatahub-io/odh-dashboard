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

export const getPatternCollectionName = (pattern?: AutoragPattern): string | undefined => {
  const binding = pattern?.settings.store_binding ?? pattern?.settings.vector_store_binding;
  const collection = binding?.collection_name;
  return typeof collection === 'string' && collection.trim() !== '' ? collection.trim() : undefined;
};

export const getPatternEmbeddingModel = (pattern?: AutoragPattern): string | undefined => {
  const model = pattern?.settings.embedding.model_id;
  return typeof model === 'string' && model.trim() !== '' ? model.trim() : undefined;
};

export const isResponsesProvider = (provider?: AutoragProviderType): boolean =>
  provider === 'milvus' || provider === 'pgvector';

export type ResponsesUnavailableReason =
  'database-secret' | 'maas-secret' | 'unsupported-provider' | 'collection' | 'embedding-model';

export const getResponsesUnavailableReason = (
  parameters: Record<string, unknown> | undefined,
  pattern?: AutoragPattern,
): ResponsesUnavailableReason | undefined => {
  if (!resolveDatabaseSecretName(parameters)) {
    return 'database-secret';
  }
  if (!resolveMaaSSecretName(parameters)) {
    return 'maas-secret';
  }
  if (!isResponsesProvider(getPatternStoreProvider(pattern))) {
    return 'unsupported-provider';
  }
  if (!getPatternCollectionName(pattern)) {
    return 'collection';
  }
  if (!getPatternEmbeddingModel(pattern)) {
    return 'embedding-model';
  }
  return undefined;
};

export const canUseResponsesForPattern = (
  parameters: Record<string, unknown> | undefined,
  pattern?: AutoragPattern,
): boolean => getResponsesUnavailableReason(parameters, pattern) === undefined;
