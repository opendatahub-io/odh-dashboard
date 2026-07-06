/* eslint-disable camelcase */
import { waitFor } from '@testing-library/react';
import { VectorStore, VectorStoreFile, FileUploadResult, ChatbotSourceSettings } from '~/app/types';

/**
 * Test data factories for creating mock objects
 */

/**
 * Creates a mock VectorStore object with optional overrides
 */
export const createMockVectorStore = (overrides?: Partial<VectorStore>): VectorStore => ({
  id: 'vs-123',
  name: 'Test Vector Store',
  object: 'vector_store',
  created_at: 1234567890,
  last_active_at: 1234567890,
  file_counts: {
    cancelled: 0,
    completed: 2,
    failed: 0,
    in_progress: 0,
    total: 2,
  },
  metadata: {
    provider_id: 'test-provider',
  },
  status: 'completed',
  usage_bytes: 1024,
  ...overrides,
});

/**
 * Creates a mock VectorStoreFile object with optional overrides
 */
export const createMockVectorStoreFile = (
  overrides?: Partial<VectorStoreFile>,
): VectorStoreFile => ({
  id: 'file-123',
  object: 'vector_store.file',
  bytes: 512,
  usage_bytes: 512,
  created_at: 1234567890,
  filename: 'test-file.txt',
  purpose: 'assistants',
  status: 'completed',
  vector_store_id: 'vs-123',
  chunking_strategy: {
    type: 'auto',
  },
  attributes: {},
  ...overrides,
});

/**
 * Creates a mock FileUploadResult object with optional overrides
 */
export const createMockFileUploadResult = (
  overrides?: Partial<FileUploadResult>,
): FileUploadResult => ({
  file_id: 'file-123',
  vector_store_file: createMockVectorStoreFile(),
  ...overrides,
});

/**
 * Creates a mock ChatbotSourceSettings object with optional overrides
 */
export const createMockSourceSettings = (
  overrides?: Partial<ChatbotSourceSettings>,
): ChatbotSourceSettings => ({
  vectorStore: 'test-vector-store',
  embeddingModel: 'test-embedding-model',
  maxChunkLength: 1000,
  chunkOverlap: 100,
  delimiter: '\n\n',
  ...overrides,
});

/**
 * Creates a mock delete response for vector store file deletion
 */
export const createMockDeleteResponse = (
  fileId = 'file-123',
): { deleted: boolean; id: string; object: string } => ({
  deleted: true,
  id: fileId,
  object: 'vector_store.file.deleted',
});

/**
 * Test helper functions
 */

/**
 * Waits for a loading state to complete
 * @param result - The hook result object containing isLoading state
 */
export const waitForLoadingComplete = async (result: {
  current: { isLoading: boolean };
}): Promise<void> => {
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
};

/**
 * Common test constants
 */
export const TEST_CONSTANTS = {
  NAMESPACE: 'test-namespace',
  VECTOR_STORE_ID: 'vs-123',
  FILE_ID_1: 'file-123',
  FILE_ID_2: 'file-456',
} as const;
