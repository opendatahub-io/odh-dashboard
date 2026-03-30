import { LlamaStackVectorStore, LlamaStackVectorStoresResponse } from '~/app/types';

type MockVectorStoreOptions = {
  id?: string;
  name?: string;
  status?: string;
  provider?: string;
};

export const mockVectorStore = ({
  id = 'vs_00000000-0000-0000-0000-000000000001',
  name = 'test-milvus-store',
  status = 'completed',
  provider = 'milvus',
}: MockVectorStoreOptions = {}): LlamaStackVectorStore => ({
  id,
  name,
  status,
  provider,
});

export const mockVectorStoresResponse = (
  stores?: LlamaStackVectorStore[],
  // eslint-disable-next-line camelcase
): LlamaStackVectorStoresResponse => ({ vector_stores: stores ?? [mockVectorStore()] });
