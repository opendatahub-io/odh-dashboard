/* eslint-disable camelcase */
import { act, RenderHookResult } from '@testing-library/react';
import * as React from 'react';
import useSourceManagement, {
  UseSourceManagementReturn,
} from '~/app/Chatbot/hooks/useSourceManagement';
import { uploadSource } from '~/app/services/llamaStackService';
import { FileModel } from '~/app/types';
import {
  mockNamespace,
  mockSourceSettings,
  mockFile,
  mockDropEvent,
  mockUploadResult,
  renderHookWithLoadingState,
  simulateLoadingComplete,
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
const { useGenAiAPI } = jest.requireMock('~/app/hooks/useGenAiAPI');
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

const { default: useFileUploadWithPolling } = jest.requireMock(
  '~/app/Chatbot/hooks/useFileUploadWithPolling',
);
const mockUseFileUploadWithPolling = useFileUploadWithPolling as jest.Mock;

describe('useSourceManagement - RAG Auto-Enable', () => {
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

  const uploadFileFlow = async (
    result: RenderHookResult<
      UseSourceManagementReturn,
      { uploadedFiles: FileModel[]; isFilesLoading: boolean }
    >['result'],
  ) => {
    await act(async () => {
      await result.current.handleSourceDrop(mockDropEvent, [mockFile]);
      jest.advanceTimersByTime(100);
    });
    await act(async () => {
      await result.current.handleSourceSettingsSubmit(mockSourceSettings);
    });
  };

  it('should set autoEnableRag to true after a successful file upload', async () => {
    const mockOnFileUploadComplete = jest.fn();
    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
      onFileUploadComplete: mockOnFileUploadComplete,
    });

    simulateLoadingComplete(rerender);
    expect(result.current.autoEnableRag).toBe(false);

    await uploadFileFlow(result);

    expect(result.current.autoEnableRag).toBe(true);
    expect(mockOnShowSuccessAlert).toHaveBeenCalled();
  });

  it('should set autoEnableRag to true even when files already existed before the upload', async () => {
    const mockOnFileUploadComplete = jest.fn();
    const existingFile = { id: 'existing-file' } as unknown as FileModel;

    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
      onFileUploadComplete: mockOnFileUploadComplete,
    });

    simulateLoadingComplete(rerender, [existingFile]);
    expect(result.current.autoEnableRag).toBe(false);

    await uploadFileFlow(result);

    expect(result.current.autoEnableRag).toBe(true);
    expect(mockOnShowSuccessAlert).toHaveBeenCalled();
  });

  it('should set autoEnableRag to true again after it has been reset', async () => {
    const mockOnFileUploadComplete = jest.fn();
    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
      onFileUploadComplete: mockOnFileUploadComplete,
    });

    simulateLoadingComplete(rerender);

    await uploadFileFlow(result);
    expect(result.current.autoEnableRag).toBe(true);

    act(() => {
      result.current.setAutoEnableRag(false);
    });
    expect(result.current.autoEnableRag).toBe(false);

    const mockFile2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
    await act(async () => {
      await result.current.handleSourceDrop(mockDropEvent, [mockFile2]);
      jest.advanceTimersByTime(100);
    });

    await act(async () => {
      await result.current.handleSourceSettingsSubmit(mockSourceSettings);
    });

    expect(result.current.autoEnableRag).toBe(true);
  });

  it('should not set autoEnableRag if all uploads fail', async () => {
    mockUploadFile.mockResolvedValue({
      success: false,
      error: 'Upload failed',
    });

    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
    });

    simulateLoadingComplete(rerender);

    await uploadFileFlow(result);

    expect(result.current.autoEnableRag).toBe(false);
    expect(mockOnShowErrorAlert).toHaveBeenCalled();
  });
});
