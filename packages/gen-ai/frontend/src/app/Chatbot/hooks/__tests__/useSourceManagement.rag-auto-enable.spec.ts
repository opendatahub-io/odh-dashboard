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
  createMockFileModel,
  renderHookWithLoadingState,
  simulateLoadingComplete,
} from './useSourceManagement.test-utils';

// Mock external dependencies
jest.mock('~/app/services/llamaStackService');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

const mockUploadSource = uploadSource as jest.Mock;
const mockUseContext = React.useContext as jest.MockedFunction<typeof React.useContext>;
const { useGenAiAPI } = jest.requireMock('~/app/hooks/useGenAiAPI');
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

describe('useSourceManagement - RAG Auto-Enable', () => {
  const mockOnShowSuccessAlert = jest.fn();
  const mockOnShowErrorAlert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseContext.mockReturnValue({ namespace: mockNamespace });
    mockUploadSource.mockResolvedValue(mockUploadResult);
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: { uploadSource: mockUploadSource },
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

  it('should auto-enable RAG toggle when first file is uploaded and page initially had no files', async () => {
    const mockOnFileUploadComplete = jest.fn();
    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
      onFileUploadComplete: mockOnFileUploadComplete,
    });

    simulateLoadingComplete(rerender);
    expect(result.current.isRawUploaded).toBe(false);

    await uploadFileFlow(result);

    expect(result.current.isRawUploaded).toBe(true);
    expect(mockOnShowSuccessAlert).toHaveBeenCalled();
  });

  it('should NOT auto-enable RAG toggle when page initially had files', async () => {
    const mockOnFileUploadComplete = jest.fn();
    const existingFile = createMockFileModel();

    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
      onFileUploadComplete: mockOnFileUploadComplete,
    });

    simulateLoadingComplete(rerender, [existingFile]);
    expect(result.current.isRawUploaded).toBe(false);

    await uploadFileFlow(result);

    expect(result.current.isRawUploaded).toBe(false);
    expect(mockOnShowSuccessAlert).toHaveBeenCalled();
  });

  it('should only auto-enable RAG toggle once', async () => {
    const mockOnFileUploadComplete = jest.fn();
    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
      onFileUploadComplete: mockOnFileUploadComplete,
    });

    simulateLoadingComplete(rerender);

    await uploadFileFlow(result);
    expect(result.current.isRawUploaded).toBe(true);

    act(() => {
      result.current.setIsRawUploaded(false);
    });

    const mockFile2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
    await act(async () => {
      await result.current.handleSourceDrop(mockDropEvent, [mockFile2]);
      jest.advanceTimersByTime(100);
    });

    await act(async () => {
      await result.current.handleSourceSettingsSubmit(mockSourceSettings);
    });

    expect(result.current.isRawUploaded).toBe(false);
  });

  it('should not auto-enable RAG if upload fails', async () => {
    mockUploadSource.mockRejectedValue(new Error('Upload failed'));

    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
    });

    simulateLoadingComplete(rerender);

    await uploadFileFlow(result);

    expect(result.current.isRawUploaded).toBe(false);
    expect(mockOnShowErrorAlert).toHaveBeenCalled();
  });

  it('should wait for files to finish loading before determining initial state', async () => {
    const { result, rerender } = renderHookWithLoadingState(useSourceManagement, {
      onShowSuccessAlert: mockOnShowSuccessAlert,
      onShowErrorAlert: mockOnShowErrorAlert,
    });

    await uploadFileFlow(result);
    expect(result.current.isRawUploaded).toBe(false);

    simulateLoadingComplete(rerender);

    const mockFile2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
    await act(async () => {
      await result.current.handleSourceDrop(mockDropEvent, [mockFile2]);
      jest.advanceTimersByTime(100);
    });

    await act(async () => {
      await result.current.handleSourceSettingsSubmit(mockSourceSettings);
    });

    expect(result.current.isRawUploaded).toBe(true);
  });
});
