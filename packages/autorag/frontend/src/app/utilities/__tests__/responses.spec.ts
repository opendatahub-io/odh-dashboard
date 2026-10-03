/* eslint-disable camelcase */
import type { AutoragPattern } from '~/app/types/autoragPattern';
import {
  getPatternStoreProvider,
  getResponsesUnavailableReason,
  isResponsesProvider,
  normalizeStoreBindingProviderType,
  resolveDatabaseSecretName,
} from '~/app/utilities/responses';

describe('resolveDatabaseSecretName', () => {
  it('should prefer a nonempty canonical database secret name', () => {
    expect(
      resolveDatabaseSecretName({
        db_secret_name: ' canonical-db ',
        vector_db_secret_name: 'legacy-db',
      }),
    ).toBe('canonical-db');
  });

  it('should fall back to a nonempty legacy database secret name', () => {
    expect(
      resolveDatabaseSecretName({ db_secret_name: '  ', vector_db_secret_name: ' legacy-db ' }),
    ).toBe('legacy-db');
  });

  it('should ignore non-string and blank values', () => {
    expect(
      resolveDatabaseSecretName({ db_secret_name: 42, vector_db_secret_name: ' ' }),
    ).toBeUndefined();
    expect(resolveDatabaseSecretName(undefined)).toBeUndefined();
  });
});

describe('store binding provider helpers', () => {
  it('should normalize supported provider aliases', () => {
    expect(normalizeStoreBindingProviderType('remote::milvus')).toBe('milvus');
    expect(normalizeStoreBindingProviderType('remote::pgvector')).toBe('pgvector');
    expect(normalizeStoreBindingProviderType('neo4j')).toBe('neo4j');
  });

  it('should prefer the canonical store binding over the legacy binding', () => {
    expect(
      getPatternStoreProvider({
        settings: {
          store_binding: { provider_type: 'neo4j' },
          vector_store_binding: { provider_type: 'milvus' },
        },
      } as AutoragPattern),
    ).toBe('neo4j');
  });

  it('should only allow Milvus and pgvector for Responses', () => {
    expect(isResponsesProvider('milvus')).toBe(true);
    expect(isResponsesProvider('pgvector')).toBe(true);
    expect(isResponsesProvider('neo4j')).toBe(false);
    expect(isResponsesProvider(undefined)).toBe(false);
  });
});

describe('getResponsesUnavailableReason', () => {
  const pattern = {
    settings: {
      store_binding: { provider_type: 'milvus', collection_name: 'collection' },
      embedding: { model_id: 'embedding-model' },
    },
  } as AutoragPattern;

  it.each([
    [{}, 'database-secret'],
    [{ db_secret_name: 'db' }, 'maas-secret'],
  ])('reports missing runtime secret: %s', (parameters, reason) => {
    expect(getResponsesUnavailableReason(parameters, pattern)).toBe(reason);
  });

  it('reports unsupported provider, collection, and embedding model', () => {
    expect(
      getResponsesUnavailableReason({ db_secret_name: 'db', maas_secret_name: 'maas' }, {
        ...pattern,
        settings: { ...pattern.settings, store_binding: { provider_type: 'neo4j' } },
      } as AutoragPattern),
    ).toBe('unsupported-provider');
    expect(
      getResponsesUnavailableReason({ db_secret_name: 'db', maas_secret_name: 'maas' }, {
        ...pattern,
        settings: { ...pattern.settings, store_binding: { provider_type: 'milvus' } },
      } as AutoragPattern),
    ).toBe('collection');
    expect(
      getResponsesUnavailableReason({ db_secret_name: 'db', maas_secret_name: 'maas' }, {
        ...pattern,
        settings: { ...pattern.settings, embedding: { model_id: ' ' } },
      } as AutoragPattern),
    ).toBe('embedding-model');
  });
});
/* eslint-enable camelcase */
