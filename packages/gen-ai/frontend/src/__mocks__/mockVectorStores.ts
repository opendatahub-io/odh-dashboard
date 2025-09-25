/* eslint-disable camelcase */

import { VectorStore } from '~/app/types';

export const mockVectorStores: VectorStore[] = [
  {
    id: 'vector-store-1',
    name: 'Test Vector Store 1',
    object: 'vector_store',
    created_at: 1755721063,
    last_active_at: 1755721063,
    status: 'completed',
    usage_bytes: 1024000,
    file_counts: {
      cancelled: 0,
      completed: 5,
      failed: 0,
      in_progress: 0,
      total: 5,
    },
    metadata: {
      description: 'Test vector store for unit tests',
      category: 'test',
    },
  },
  {
    id: 'vector-store-2',
    name: 'Test Vector Store 2',
    object: 'vector_store',
    created_at: 1755721064,
    last_active_at: 1755721064,
    status: 'pending',
    usage_bytes: 512000,
    file_counts: {
      cancelled: 0,
      completed: 2,
      failed: 1,
      in_progress: 1,
      total: 4,
    },
    metadata: {
      description: 'Another test vector store',
    },
  },
];
