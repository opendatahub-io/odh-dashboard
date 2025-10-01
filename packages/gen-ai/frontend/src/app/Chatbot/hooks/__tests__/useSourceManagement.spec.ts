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

      expect(result.current.filesWithSettings).toEqual([]);
      expect(result.current.selectedSourceSettings).toBeNull();
      expect(result.current.isSourceSettingsOpen).toBe(false);
      expect(result.current.isRawUploaded).toBe(false);
      expect(result.current.currentFileForSettings).toBeNull();
    });
  });

  describe('handleSourceDrop', () => {
    it('should add files to filesWithSettings when files are dropped', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      expect(result.current.filesWithSettings).toHaveLength(1);
      expect(result.current.filesWithSettings[0].file).toEqual(mockFile);
      expect(result.current.filesWithSettings[0].status).toBe('pending');
      expect(result.current.filesWithSettings[0].settings).toBeNull();
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

      expect(result.current.filesWithSettings).toHaveLength(1);
      expect(result.current.filesWithSettings[0].file).toEqual(textFile);
      expect(result.current.filesWithSettings[0].status).toBe('pending');
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

      expect(result.current.filesWithSettings).toHaveLength(1);
      expect(result.current.filesWithSettings[0].file).toEqual(binaryFile);
      expect(result.current.filesWithSettings[0].status).toBe('pending');
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

      expect(result.current.filesWithSettings).toHaveLength(2);
      expect(result.current.filesWithSettings[0].file).toEqual(mockFile);
      expect(result.current.filesWithSettings[1].file).toEqual(mockFile2);
      expect(result.current.filesWithSettings[0].status).toBe('pending');
      expect(result.current.filesWithSettings[1].status).toBe('pending');
    });

    it('should open source settings modal after delay when files are dropped', async () => {
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
      expect(result.current.currentFileForSettings).toBeNull();

      // Fast-forward the timer
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isSourceSettingsOpen).toBe(true);
      expect(result.current.currentFileForSettings).toEqual(mockFile);
    });
  });

  describe('removeUploadedSource', () => {
    it('should remove file from filesWithSettings', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Add a file
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      // Verify file is added
      expect(result.current.filesWithSettings).toHaveLength(1);
      expect(result.current.filesWithSettings[0].file).toEqual(mockFile);

      // Remove uploaded source
      act(() => {
        result.current.removeUploadedSource(mockFile.name);
      });

      expect(result.current.filesWithSettings).toHaveLength(0);
    });

    it('should clear currentFileForSettings if removing current file', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      // Add a file and process it
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      });

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.currentFileForSettings).toEqual(mockFile);
      expect(result.current.isSourceSettingsOpen).toBe(true);

      // Remove the current file
      act(() => {
        result.current.removeUploadedSource(mockFile.name);
      });

      expect(result.current.currentFileForSettings).toBeNull();
      expect(result.current.isSourceSettingsOpen).toBe(false);
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

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.currentFileForSettings).toEqual(mockFile);

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).toHaveBeenCalledWith(mockFile, mockSourceSettings, 'test-namespace');
      expect(result.current.selectedSourceSettings).toEqual(mockSourceSettings);
      expect(result.current.isSourceSettingsOpen).toBe(false);
      expect(mockOnShowSuccessAlert).toHaveBeenCalled();
      expect(mockOnShowErrorAlert).not.toHaveBeenCalled();

      // Check that file status was updated to uploaded
      expect(result.current.filesWithSettings[0].status).toBe('uploaded');
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

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).toHaveBeenCalledWith(mockFile, mockSourceSettings, 'test-namespace');
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();

      // Check that file status was updated to failed
      expect(result.current.filesWithSettings[0].status).toBe('failed');
      consoleErrorSpy.mockRestore();
    });

    it('should handle error when namespace is missing', async () => {
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

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
    });

    it('should handle error when namespace name is empty', async () => {
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

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
    });

    it('should remove file when settings is null (user cancels)', async () => {
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

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.filesWithSettings).toHaveLength(1);
      expect(result.current.currentFileForSettings).toEqual(mockFile);

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(null);
      });

      expect(result.current.filesWithSettings).toHaveLength(0);
      expect(result.current.selectedSourceSettings).toBeNull();
      expect(result.current.isSourceSettingsOpen).toBe(false);
      expect(mockUploadSource).not.toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).not.toHaveBeenCalled();
    });

    it('should handle submit when no current file is set', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      expect(result.current.currentFileForSettings).toBeNull();

      // This should handle the case where no current file is set
      await act(async () => {
        await result.current.handleSourceSettingsSubmit(mockSourceSettings);
      });

      expect(mockUploadSource).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).not.toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
    });
  });

  describe('timer behavior', () => {
    it('should not open modal when no files are pending', () => {
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

    it('should process multiple files sequentially', async () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      const mockFile2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

      // Add multiple files
      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile, mockFile2]);
      });

      expect(result.current.filesWithSettings).toHaveLength(2);

      // Fast-forward timer to process first file
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isSourceSettingsOpen).toBe(true);
      expect(result.current.currentFileForSettings).toEqual(mockFile);
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

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
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

      // Fast-forward timer to set current file
      act(() => {
        jest.advanceTimersByTime(100);
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

      // Should accumulate all files
      expect(result.current.filesWithSettings).toHaveLength(2);
      expect(result.current.filesWithSettings[0].file).toEqual(file1);
      expect(result.current.filesWithSettings[1].file).toEqual(file2);
    });
  });
});
