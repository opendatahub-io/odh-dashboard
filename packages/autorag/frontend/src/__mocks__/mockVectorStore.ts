/* eslint-disable camelcase */
import { OgxVectorStoreProvider, OgxVectorStoreProvidersResponse } from '~/app/types';

type MockVectorStoreProviderOptions = {
  provider_id?: string;
  provider_type?: string;
};

export const mockVectorStoreProvider = ({
  provider_id = 'milvus',
  provider_type = 'remote::milvus',
}: MockVectorStoreProviderOptions = {}): OgxVectorStoreProvider => ({
  provider_id,
  provider_type,
});

export const mockVectorStoreProvidersResponse = (
  providers?: OgxVectorStoreProvider[],
): OgxVectorStoreProvidersResponse & { totalProviderCount: number } => {
  const list = providers ?? [mockVectorStoreProvider()];
  return {
    vector_store_providers: list,
    totalProviderCount: list.length,
  };
};
