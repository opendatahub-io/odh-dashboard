/* eslint-disable camelcase */
import { renderHook, act } from '@testing-library/react';
import * as React from 'react';
import { DropEvent } from '@patternfly/react-core';
import useSourceManagement from '~/app/Chatbot/hooks/useSourceManagement';
import { uploadSource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings, FileUploadResult } from '~/app/types';

// Mock external dependencies
jest.mock('~/app/services/llamaStackService');
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUploadSource = uploadSource as jest.MockedFunction<typeof uploadSource>;
const mockUseContext = React.useContext as jest.MockedFunction<typeof React.useContext>;

describe('useSourceManagement', () => {
  const mockOnShowSuccessAlert = jest.fn();
  const mockOnShowErrorAlert = jest.fn();
  const mockNamespace = { name: 'test-namespace' };

  const mockSourceSettings: ChatbotSourceSettings = {
    vectorStore: 'test-vector-store',
    embeddingModel: 'test-embedding-model',
    maxChunkLength: 1000,
    chunkOverlap: 100,
    delimiter: '\n\n',
  };

  const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  const mockDropEvent = {} as DropEvent;

  const mockUploadResult: FileUploadResult = {
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseContext.mockReturnValue({ namespace: mockNamespace });
    mockUploadSource.mockResolvedValue(mockUploadResult);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      expect(result.current.selectedSource).toEqual([]);
      expect(result.current.selectedSourceSettings).toBeNull();
      expect(result.current.isSourceSettingsOpen).toBe(false);
      expect(result.current.isRawUploaded).toBe(false);
    });
  });

  describe('handleSourceDrop', () => {
    it('should set selected source when files are dropped', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      expect(result.current.selectedSource).toEqual([mockFile]);
    });

    it('should handle text files without extraction for now', async () => {
      const textContent = 'This is test file content';
      const textFile = new File([textContent], 'test.txt', { type: 'text/plain' });

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [textFile]);
      });

      expect(result.current.selectedSource).toEqual([textFile]);
    });

    it('should handle binary files', async () => {
      const binaryFile = new File(['binary data'], 'test.pdf', { type: 'application/pdf' });

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [binaryFile]);
      });

      expect(result.current.selectedSource).toEqual([binaryFile]);
    });

    it('should handle multiple files being dropped', async () => {
      const mockFile2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile, mockFile2]);
      });

      expect(result.current.selectedSource).toEqual([mockFile, mockFile2]);
    });

    it('should open source settings modal after delay when source is selected', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      expect(result.current.isSourceSettingsOpen).toBe(false);

      // Fast-forward the timer
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isSourceSettingsOpen).toBe(true);
    });
  });

  describe('removeUploadedSource', () => {
    it('should clear all source-related state', () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set some initial state
      act(() => {
        result.current.setSelectedSourceSettings(mockSourceSettings);
      });

      act(() => {
        result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      // Verify state is set
      expect(result.current.selectedSource).toEqual([mockFile]);
      expect(result.current.selectedSourceSettings).toEqual(mockSourceSettings);

      // Remove uploaded source
      act(() => {
        result.current.removeUploadedSource();
      });

      expect(result.current.selectedSource).toEqual([]);
      expect(result.current.selectedSourceSettings).toBeNull();
    });
  });

  describe('handleSourceSettingsSubmit', () => {
    beforeEach(async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      return { result };
    });

    it('should upload source successfully with valid settings and namespace', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set up file first
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).toHaveBeenCalledWith(mockFile, mockSourceSettings, 'test-namespace');
      expect(result.current.selectedSourceSettings).toEqual(mockSourceSettings);
      expect(result.current.isSourceSettingsOpen).toBe(false);
      expect(mockOnShowSuccessAlert).toHaveBeenCalled();
      expect(mockOnShowErrorAlert).not.toHaveBeenCalled();
    });

    it('should handle upload failure and show error alert', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockUploadSource.mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set up file first
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).toHaveBeenCalledWith(mockFile, mockSourceSettings, 'test-namespace');
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should throw error when namespace is missing', async () => {
      mockUseContext.mockReturnValue({ namespace: undefined });

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set up file first
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
    });

    it('should throw error when namespace name is empty', async () => {
      mockUseContext.mockReturnValue({ namespace: { name: '' } });

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set up file first
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
    });

    it('should clear source when settings is null', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set up file first
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      expect(result.current.selectedSource).toEqual([mockFile]);

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(null);
      });

      expect(result.current.selectedSource).toEqual([]);
      expect(result.current.selectedSourceSettings).toBeNull();
      expect(result.current.isSourceSettingsOpen).toBe(false);
      expect(mockUploadSource).not.toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).not.toHaveBeenCalled();
    });

    it('should handle empty selectedSource array gracefully', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      expect(result.current.selectedSource).toEqual([]);

      // This should now handle the case where selectedSource[0] is undefined
      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).not.toHaveBeenCalled();
      // Should call error alert due to "No file selected" error
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
    });

    it('should clear selectedSourceSettings when settings is null', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set up initial state
      act(() => {
        result.current.setSelectedSourceSettings(mockSourceSettings);
      });

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      expect(result.current.selectedSourceSettings).toEqual(mockSourceSettings);
      expect(result.current.selectedSource).toEqual([mockFile]);

      // Submit with null settings
      await act(async () => {
        await result.current.handleSourceSettingsSubmit(null);
      });

      // Verify all state is cleared consistently
      expect(result.current.selectedSource).toEqual([]);
      expect(result.current.selectedSourceSettings).toBeNull();
      expect(result.current.isSourceSettingsOpen).toBe(false);
    });
  });

  describe('useEffect timer behavior', () => {
    it('should not open modal when selectedSource is empty', () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      expect(result.current.isSourceSettingsOpen).toBe(false);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isSourceSettingsOpen).toBe(false);
    });

    it('should cleanup timer when selectedSource changes before timeout', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Set first file
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      // Advance timer partially
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Set different file before timer completes
      const mockFile2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile2]);
      });

      // Complete the original timer
      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(result.current.isSourceSettingsOpen).toBe(false);

      // Complete the new timer
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isSourceSettingsOpen).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle uploadSource with network timeout', async () => {
      mockUploadSource.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockOnShowErrorAlert).toHaveBeenCalled();
    });

    it('should handle partial source settings', async () => {
      const partialSettings: ChatbotSourceSettings = {
        vectorStore: 'test-vector-store',
        embeddingModel: 'test-embedding-model',
        // Missing optional fields
      };

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(partialSettings);
      });

      expect(mockUploadSource).toHaveBeenCalledWith(mockFile, partialSettings, 'test-namespace');
      expect(mockOnShowSuccessAlert).toHaveBeenCalled();
    });

    it('should handle rapid successive file drops', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

      // Drop files in rapid succession
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [file1]);
        await result.current.handleSourceDrop(mockDropEvent, [file2]);
      });

      // Should use the last dropped file
      expect(result.current.selectedSource).toEqual([file2]);
    });
  });
});
