/* eslint-disable camelcase */
import { LlamaStackVectorStoreProvider, LlamaStackVectorStoreProvidersResponse } from '~/app/types';

type MockVectorStoreProviderOptions = {
  provider_id?: string;
  provider_type?: string;
};

export const mockVectorStoreProvider = ({
  provider_id = 'milvus',
  provider_type = 'remote::milvus',
}: MockVectorStoreProviderOptions = {}): LlamaStackVectorStoreProvider => ({
  provider_id,
  provider_type,
});

export const mockVectorStoreProvidersResponse = (
  providers?: LlamaStackVectorStoreProvider[],
): LlamaStackVectorStoreProvidersResponse & { totalProviderCount: number } => {
  const list = providers ?? [mockVectorStoreProvider()];
  return {
    vector_store_providers: list,
    totalProviderCount: list.length,
  };
};
