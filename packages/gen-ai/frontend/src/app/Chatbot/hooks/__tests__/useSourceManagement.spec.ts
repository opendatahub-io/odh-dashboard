/* eslint-disable camelcase */
import { renderHook, act } from '@testing-library/react';
import * as React from 'react';
import useSourceManagement from '~/app/Chatbot/hooks/useSourceManagement';
import { uploadSource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings } from '~/app/types';
import {
  mockNamespace,
  mockSourceSettings,
  mockFile,
  mockDropEvent,
  mockUploadResult,
} from './useSourceManagement.test-utils';

// Mock external dependencies
jest.mock('~/app/services/llamaStackService');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/Chatbot/hooks/useFileUploadWithPolling');
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUploadSource = uploadSource as jest.Mock;
const mockUseContext = React.useContext as jest.MockedFunction<typeof React.useContext>;

// Import after mocking
const { useGenAiAPI } = jest.requireMock('~/app/hooks/useGenAiAPI');
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

const { default: useFileUploadWithPolling } = jest.requireMock(
  '~/app/Chatbot/hooks/useFileUploadWithPolling',
);
const mockUseFileUploadWithPolling = useFileUploadWithPolling as jest.Mock;

describe('useSourceManagement', () => {
  const mockOnShowSuccessAlert = jest.fn();
  const mockOnShowErrorAlert = jest.fn();
  let mockUploadFile: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseContext.mockReturnValue({ namespace: mockNamespace });
    mockUploadSource.mockResolvedValue(mockUploadResult);

    const mockGetFileUploadStatus = jest.fn().mockResolvedValue({
      status: 'completed',
      job_id: 'test-job-id',
    });

    // Mock useGenAiAPI to return the API object with mocked functions
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: {
        uploadSource: mockUploadSource,
        getFileUploadStatus: mockGetFileUploadStatus,
      },
    });

    // Mock useFileUploadWithPolling to return a simple mock that resolves immediately
    mockUploadFile = jest.fn().mockResolvedValue({ success: true });
    mockUseFileUploadWithPolling.mockReturnValue({
      uploadFile: mockUploadFile,
      uploadState: { fileName: '', status: 'idle' },
      isUploading: false,
      cancelUpload: jest.fn(),
    });
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

      // Check that uploadFile was called (from useFileUploadWithPolling)
      expect(mockUploadFile).toHaveBeenCalledWith(mockFile, mockSourceSettings);

      expect(result.current.selectedSourceSettings).toEqual(mockSourceSettings);
      expect(result.current.isSourceSettingsOpen).toBe(false);
      expect(mockOnShowSuccessAlert).toHaveBeenCalled();
      expect(mockOnShowErrorAlert).not.toHaveBeenCalled();

      // Check that file status was updated to uploaded
      expect(result.current.filesWithSettings[0].status).toBe('uploaded');
    });

    it('should handle upload failure and show error alert', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock uploadFile to fail
      mockUploadFile.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      });

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

      // Check that uploadFile was called
      expect(mockUploadFile).toHaveBeenCalledWith(mockFile, mockSourceSettings);
      expect(mockOnShowErrorAlert).toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();

      // Check that file status was updated to failed
      expect(result.current.filesWithSettings[0].status).toBe('failed');
      consoleErrorSpy.mockRestore();
    });

    it('should handle error when API is not available', async () => {
      mockUseGenAiAPI.mockReturnValue({
        apiAvailable: false,
        api: {
          uploadSource: mockUploadSource,
        },
      });

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

      // When API is not available, uploadFile should not be called
      expect(mockUploadFile).not.toHaveBeenCalled();
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
      expect(mockUploadFile).not.toHaveBeenCalled();
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

      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(mockOnShowErrorAlert).not.toHaveBeenCalled();
      expect(mockOnShowSuccessAlert).not.toHaveBeenCalled();
    });
  });

  describe('additional behaviors', () => {
    it('should not open modal when no files are pending after timer', () => {
      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      act(() => jest.advanceTimersByTime(100));
      expect(result.current.isSourceSettingsOpen).toBe(false);
    });

    it('should handle partial source settings without optional fields', async () => {
      const partialSettings: ChatbotSourceSettings = {
        vectorStore: 'test-vector-store',
        embeddingModel: 'test-embedding-model',
      };

      const { result } = renderHook(() =>
        useSourceManagement({
          onShowSuccessAlert: mockOnShowSuccessAlert,
          onShowErrorAlert: mockOnShowErrorAlert,
        }),
      );

      await act(async () => {
        await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        await result.current.handleSourceSettingsSubmit(partialSettings);
      });

      // Check that uploadFile was called with partial settings
      expect(mockUploadFile).toHaveBeenCalledWith(mockFile, partialSettings);
      expect(mockOnShowSuccessAlert).toHaveBeenCalled();
    });
  });
});
