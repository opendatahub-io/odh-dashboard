/* eslint-disable camelcase */
import { renderHook, RenderHookResult } from '@testing-library/react';
import { DropEvent } from '@patternfly/react-core';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { ChatbotSourceSettings, FileUploadResult, FileModel } from '~/app/types';

// Type for the hook props (not exported from useSourceManagement)
export type UseSourceManagementProps = {
  onShowSuccessAlert: () => void;
  onShowErrorAlert: (message?: string, title?: string) => void;
  onFileUploadComplete?: () => void;
  uploadedFiles?: FileModel[];
  isFilesLoading?: boolean;
};

// Mock data fixtures
export const mockNamespace = { name: 'test-namespace' };

export const mockSourceSettings: ChatbotSourceSettings = {
  vectorStore: 'test-vector-store',
  embeddingModel: 'test-embedding-model',
  maxChunkLength: 1000,
  chunkOverlap: 100,
  delimiter: '\n\n',
};

export const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
export const mockDropEvent = {} as DropEvent;

export const mockUploadResult: FileUploadResult = {
  file_id: 'file-123',
  vector_store_file: {
    id: 'vs-file-123',
    object: 'vector_store.file',
    created_at: 1234567890,
    vector_store_id: 'test-vector-store',
    status: 'completed',
    usage_bytes: 1024,
    chunking_strategy: {
      type: 'static',
      static: {
        max_chunk_size_tokens: 1000,
        chunk_overlap_tokens: 100,
      },
    },
    attributes: {
      description: 'Test file',
    },
  },
};

export const createMockFileModel = (overrides?: Partial<FileModel>): FileModel => ({
  id: 'existing-file-1',
  object: 'file',
  bytes: 1024,
  created_at: 1234567890,
  filename: 'existing.txt',
  purpose: 'assistants',
  status: 'completed',
  expires_at: 0,
  status_details: '',
  ...overrides,
});

// Helper type for rendering with loading state
type RenderWithLoadingStateOptions = {
  uploadedFiles?: FileModel[];
  isFilesLoading?: boolean;
  additionalProps?: Partial<UseSourceManagementProps>;
};

// Helper function to render hook with loading state simulation
export const renderHookWithLoadingState = (
  useSourceManagement: (props: UseSourceManagementProps) => UseSourceManagementReturn,
  mockCallbacks: {
    onShowSuccessAlert: jest.Mock;
    onShowErrorAlert: jest.Mock;
    onFileUploadComplete?: jest.Mock;
  },
  options: RenderWithLoadingStateOptions = {},
): RenderHookResult<
  UseSourceManagementReturn,
  { uploadedFiles: FileModel[]; isFilesLoading: boolean }
> => {
  const { uploadedFiles = [], isFilesLoading = true, additionalProps = {} } = options;

  return renderHook(
    ({
      uploadedFiles: files,
      isFilesLoading: loading,
    }: {
      uploadedFiles: FileModel[];
      isFilesLoading: boolean;
    }) =>
      useSourceManagement({
        onShowSuccessAlert: mockCallbacks.onShowSuccessAlert,
        onShowErrorAlert: mockCallbacks.onShowErrorAlert,
        onFileUploadComplete: mockCallbacks.onFileUploadComplete,
        uploadedFiles: files,
        isFilesLoading: loading,
        ...additionalProps,
      }),
    {
      initialProps: {
        uploadedFiles,
        isFilesLoading,
      },
    },
  );
};

// Helper to simulate complete loading cycle (loading -> loaded)
export const simulateLoadingComplete = (
  rerender: (props: { uploadedFiles: FileModel[]; isFilesLoading: boolean }) => void,
  uploadedFiles: FileModel[] = [],
): void => {
  rerender({
    uploadedFiles,
    isFilesLoading: false,
  });
};

// Helper to advance timers (commonly used pattern)
export const advanceTimersAndProcess = (ms = 100): void => {
  jest.advanceTimersByTime(ms);
};
