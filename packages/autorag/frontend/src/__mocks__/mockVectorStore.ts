import { LlamaStackVectorStoreProvider, LlamaStackVectorStoreProvidersResponse } from '~/app/types';

type MockVectorStoreProviderOptions = {
  provider_id?: string;
  provider_type?: string;
};

export const mockVectorStoreProvider = ({
  // eslint-disable-next-line camelcase
  provider_id = 'milvus',
  // eslint-disable-next-line camelcase
  provider_type = 'remote::milvus',
}: MockVectorStoreProviderOptions = {}): LlamaStackVectorStoreProvider => ({
  // eslint-disable-next-line camelcase
  provider_id,
  // eslint-disable-next-line camelcase
  provider_type,
});

export const mockVectorStoreProvidersResponse = (
  providers?: LlamaStackVectorStoreProvider[],
): LlamaStackVectorStoreProvidersResponse => ({
  // eslint-disable-next-line camelcase
  vector_store_providers: providers ?? [mockVectorStoreProvider()],
});
