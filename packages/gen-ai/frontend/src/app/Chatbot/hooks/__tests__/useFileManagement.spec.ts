/* eslint-disable camelcase */
import { renderHook, act, waitFor } from '@testing-library/react';
import * as React from 'react';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import useFileManagement, { DELETE_EVENT_NAME } from '~/app/Chatbot/hooks/useFileManagement';
import {
  deleteVectorStoreFile,
  listVectorStores,
  listVectorStoreFiles,
} from '~/app/services/llamaStackService';
import { VectorStoreFile } from '~/app/types';
import {
  createMockVectorStore,
  createMockVectorStoreFile,
  createMockDeleteResponse,
  waitForLoadingComplete,
  TEST_CONSTANTS,
} from './testUtils';

// Mock external dependencies
jest.mock('~/app/services/llamaStackService');
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockGetVectorStores = listVectorStores as jest.Mock;
const mockListVectorStoreFiles = listVectorStoreFiles as jest.Mock;
const mockDeleteVectorStoreFile = deleteVectorStoreFile as jest.Mock;
const mockFireFormTrackingEvent = fireFormTrackingEvent as jest.MockedFunction<
  typeof fireFormTrackingEvent
>;
const mockUseContext = React.useContext as jest.MockedFunction<typeof React.useContext>;

// Import after mocking
const { useGenAiAPI } = jest.requireMock('~/app/hooks/useGenAiAPI');
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

describe('useFileManagement', () => {
  // Use constants from testUtils
  const { NAMESPACE: TEST_NAMESPACE, VECTOR_STORE_ID, FILE_ID_1, FILE_ID_2 } = TEST_CONSTANTS;
  const mockNamespace = { name: TEST_NAMESPACE };

  // Test data
  const mockVectorStore = createMockVectorStore({ id: VECTOR_STORE_ID });
  const mockVectorStoreFile = createMockVectorStoreFile({
    id: FILE_ID_1,
    vector_store_id: VECTOR_STORE_ID,
  });
  const mockVectorStoreFile2 = createMockVectorStoreFile({
    id: FILE_ID_2,
    bytes: 1024,
    usage_bytes: 1024,
    created_at: 1234567891,
    filename: 'test-file-2.txt',
    vector_store_id: VECTOR_STORE_ID,
    chunking_strategy: {
      type: 'static',
      static: {
        max_chunk_size_tokens: 100,
        chunk_overlap_tokens: 10,
      },
    },
    attributes: {
      description: 'Test description',
    },
  });

  // Helper functions
  const setupSuccessfulMocks = (files: VectorStoreFile[] = [mockVectorStoreFile]) => {
    mockGetVectorStores.mockResolvedValue([mockVectorStore]);
    mockListVectorStoreFiles.mockResolvedValue(files);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContext.mockReturnValue({ namespace: mockNamespace });

    // Mock useGenAiAPI to return the API object with mocked functions
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: {
        listVectorStores: mockGetVectorStores,
        listVectorStoreFiles: mockListVectorStoreFiles,
        deleteVectorStoreFile: mockDeleteVectorStoreFile,
      },
    });
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useFileManagement());

      expect(result.current.files).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Loading starts on mount
      expect(result.current.error).toBe(null);
      expect(result.current.isDeleting).toBe(false);
      expect(result.current.currentVectorStoreId).toBe(null);
    });
  });

  describe('refreshFiles', () => {
    it('should fetch and convert vector store files successfully', async () => {
      setupSuccessfulMocks([mockVectorStoreFile, mockVectorStoreFile2]);

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(mockGetVectorStores).toHaveBeenCalled();
      expect(mockListVectorStoreFiles).toHaveBeenCalledWith({
        vector_store_id: VECTOR_STORE_ID,
        limit: 50,
        order: 'desc',
        filter: 'completed',
      });
      expect(result.current.files).toHaveLength(2);
      expect(result.current.files[0]).toEqual({
        id: FILE_ID_1,
        object: 'vector_store.file',
        bytes: 512,
        created_at: 1234567890,
        filename: 'test-file.txt',
        purpose: 'assistants',
        status: 'completed',
        expires_at: 0,
        status_details: '',
      });
      expect(result.current.currentVectorStoreId).toBe(VECTOR_STORE_ID);
    });

    it('should handle files with missing filename', async () => {
      const fileWithoutName = createMockVectorStoreFile({ filename: undefined });
      setupSuccessfulMocks([fileWithoutName]);

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(result.current.files[0].filename).toBe(`file-${FILE_ID_1}`);
    });

    it('should handle files with last_error', async () => {
      const fileWithError = createMockVectorStoreFile({
        last_error: {
          code: 'ERROR_CODE',
          message: 'Error processing file',
        },
      });
      setupSuccessfulMocks([fileWithError]);

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(result.current.files[0].status_details).toBe('Error processing file');
    });

    it('should handle usage_bytes when bytes is missing', async () => {
      const fileWithUsageBytes = createMockVectorStoreFile({
        bytes: undefined,
        usage_bytes: 2048,
      });
      setupSuccessfulMocks([fileWithUsageBytes]);

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(result.current.files[0].bytes).toBe(2048);
    });

    it('should set empty files when no vector stores are available', async () => {
      mockGetVectorStores.mockResolvedValue([]);

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(mockGetVectorStores).toHaveBeenCalled();
      expect(mockListVectorStoreFiles).not.toHaveBeenCalled();
      expect(result.current.files).toEqual([]);
      expect(result.current.currentVectorStoreId).toBe(null);
    });

    it('should not fetch files when API is not available', async () => {
      mockUseGenAiAPI.mockReturnValue({
        apiAvailable: false,
        api: {
          listVectorStores: mockGetVectorStores,
          listVectorStoreFiles: mockListVectorStoreFiles,
          deleteVectorStoreFile: mockDeleteVectorStoreFile,
        },
      });

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(mockGetVectorStores).not.toHaveBeenCalled();
      expect(mockListVectorStoreFiles).not.toHaveBeenCalled();
      expect(result.current.files).toEqual([]);
    });

    it('should handle errors when fetching vector stores fails', async () => {
      const errorMessage = 'Failed to fetch vector stores';
      const mockOnShowErrorAlert = jest.fn();
      mockGetVectorStores.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useFileManagement({ onShowErrorAlert: mockOnShowErrorAlert }),
      );
      await waitForLoadingComplete(result);

      expect(result.current.error).toBe(errorMessage);
      expect(mockOnShowErrorAlert).toHaveBeenCalledWith(errorMessage, 'File Fetch Error');
    });

    it('should handle errors when fetching files fails', async () => {
      const errorMessage = 'Failed to fetch files';
      const mockOnShowErrorAlert = jest.fn();
      mockGetVectorStores.mockResolvedValue([mockVectorStore]);
      mockListVectorStoreFiles.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useFileManagement({ onShowErrorAlert: mockOnShowErrorAlert }),
      );
      await waitForLoadingComplete(result);

      expect(result.current.error).toBe(errorMessage);
      expect(mockOnShowErrorAlert).toHaveBeenCalledWith(errorMessage, 'File Fetch Error');
    });

    it('should handle non-Error objects in catch block', async () => {
      const mockOnShowErrorAlert = jest.fn();
      mockGetVectorStores.mockRejectedValue('String error');

      const { result } = renderHook(() =>
        useFileManagement({ onShowErrorAlert: mockOnShowErrorAlert }),
      );
      await waitForLoadingComplete(result);

      expect(result.current.error).toBe('Failed to fetch files');
      expect(mockOnShowErrorAlert).toHaveBeenCalledWith(
        'Failed to fetch files',
        'File Fetch Error',
      );
    });

    it('should allow manual refresh', async () => {
      setupSuccessfulMocks();

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(mockGetVectorStores).toHaveBeenCalledTimes(1);

      // Update mock data for second fetch
      const updatedFile = createMockVectorStoreFile({ filename: 'updated-file.txt' });
      mockListVectorStoreFiles.mockResolvedValue([updatedFile]);

      await act(async () => {
        await result.current.refreshFiles();
      });
      await waitForLoadingComplete(result);

      expect(mockGetVectorStores).toHaveBeenCalledTimes(2);
      expect(result.current.files[0].filename).toBe('updated-file.txt');
    });
  });

  describe('deleteFileById', () => {
    it('should delete a file successfully', async () => {
      const mockOnShowDeleteSuccessAlert = jest.fn();
      setupSuccessfulMocks([mockVectorStoreFile, mockVectorStoreFile2]);
      mockDeleteVectorStoreFile.mockResolvedValue(createMockDeleteResponse(FILE_ID_1));

      const { result } = renderHook(() =>
        useFileManagement({ onShowDeleteSuccessAlert: mockOnShowDeleteSuccessAlert }),
      );
      await waitForLoadingComplete(result);

      expect(result.current.files).toHaveLength(2);

      await act(async () => {
        await result.current.deleteFileById(FILE_ID_1);
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockDeleteVectorStoreFile).toHaveBeenCalledWith(
        {},
        {
          vector_store_id: VECTOR_STORE_ID,
          file_id: FILE_ID_1,
        },
      );
      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].id).toBe(FILE_ID_2);
      expect(mockOnShowDeleteSuccessAlert).toHaveBeenCalled();
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(DELETE_EVENT_NAME, {
        outcome: TrackingOutcome.submit,
        success: true,
      });
    });

    it('should not delete when namespace is not available', async () => {
      mockUseContext.mockReturnValue({ namespace: undefined });

      const { result } = renderHook(() => useFileManagement());

      await act(async () => {
        await result.current.deleteFileById(FILE_ID_1);
      });

      expect(mockDeleteVectorStoreFile).not.toHaveBeenCalled();
    });

    it('should not delete when currentVectorStoreId is not available', async () => {
      mockGetVectorStores.mockResolvedValue([]);

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      await act(async () => {
        await result.current.deleteFileById(FILE_ID_1);
      });

      expect(mockDeleteVectorStoreFile).not.toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const errorMessage = 'Failed to delete file';
      const mockOnShowErrorAlert = jest.fn();
      setupSuccessfulMocks();
      mockDeleteVectorStoreFile.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useFileManagement({ onShowErrorAlert: mockOnShowErrorAlert }),
      );
      await waitForLoadingComplete(result);

      await act(async () => {
        await result.current.deleteFileById(FILE_ID_1);
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(mockOnShowErrorAlert).toHaveBeenCalledWith(errorMessage, 'File Delete Error');
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(DELETE_EVENT_NAME, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: errorMessage,
      });
      // File should still be in the list since delete failed
      expect(result.current.files).toHaveLength(1);
    });

    it('should handle non-Error objects in delete catch block', async () => {
      const mockOnShowErrorAlert = jest.fn();
      setupSuccessfulMocks();
      mockDeleteVectorStoreFile.mockRejectedValue('String error');

      const { result } = renderHook(() =>
        useFileManagement({ onShowErrorAlert: mockOnShowErrorAlert }),
      );
      await waitForLoadingComplete(result);

      await act(async () => {
        await result.current.deleteFileById(FILE_ID_1);
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(result.current.error).toBe('Failed to delete file');
      expect(mockOnShowErrorAlert).toHaveBeenCalledWith(
        'Failed to delete file',
        'File Delete Error',
      );
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(DELETE_EVENT_NAME, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: 'Failed to delete file',
      });
    });

    it('should set isDeleting to true during delete operation', async () => {
      setupSuccessfulMocks();
      mockDeleteVectorStoreFile.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(createMockDeleteResponse(FILE_ID_1));
            }, 100);
          }),
      );

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(result.current.isDeleting).toBe(false);

      act(() => {
        result.current.deleteFileById(FILE_ID_1);
      });

      // Check that isDeleting is true during the operation
      expect(result.current.isDeleting).toBe(true);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe('useEffect - namespace change', () => {
    it('should refresh files when namespace changes', async () => {
      setupSuccessfulMocks();

      const { rerender } = renderHook(() => useFileManagement());

      await waitFor(() => {
        expect(mockGetVectorStores).toHaveBeenCalled();
      });

      // Change namespace
      const newNamespace = { name: 'new-namespace' };
      mockUseContext.mockReturnValue({ namespace: newNamespace });
      mockListVectorStoreFiles.mockResolvedValue([mockVectorStoreFile2]);

      rerender();

      await waitFor(() => {
        expect(mockGetVectorStores).toHaveBeenCalled();
      });
    });
  });

  describe('Return values', () => {
    it('should return all required properties', async () => {
      setupSuccessfulMocks();

      const { result } = renderHook(() => useFileManagement());
      await waitForLoadingComplete(result);

      expect(result.current).toHaveProperty('files');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshFiles');
      expect(result.current).toHaveProperty('deleteFileById');
      expect(result.current).toHaveProperty('isDeleting');
      expect(result.current).toHaveProperty('currentVectorStoreId');
      expect(typeof result.current.refreshFiles).toBe('function');
      expect(typeof result.current.deleteFileById).toBe('function');
    });
  });
});
