/* eslint-disable camelcase */
import * as React from 'react';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { ChatbotSourceSettings } from '~/app/types';

export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'failed';

export interface FileUploadState {
  fileName: string;
  status: UploadStatus;
  error?: string;
}

export interface UseFileUploadWithPollingOptions {
  pollInterval?: number; // Default: 2000ms (2 seconds)
  maxPollTime?: number; // Default: 600000ms (10 minutes)
}

export interface UseFileUploadWithPollingReturn {
  uploadFile: (
    file: File,
    settings: ChatbotSourceSettings,
  ) => Promise<{ success: boolean; error?: string }>;
  uploadState: FileUploadState;
  isUploading: boolean;
  cancelUpload: () => void;
}

/**
 * Hook for uploading files with polling for async job completion
 *
 * @param options - Configuration options for polling behavior
 * @returns Upload function, state, and cancel function
 *
 * @example
 * const { uploadFile, uploadState, isUploading, cancelUpload } = useFileUploadWithPolling();
 *
 * const handleUpload = async () => {
 *   const result = await uploadFile(file, settings);
 *   if (result.success) {
 *     console.log('Upload successful!');
 *   } else {
 *     console.error('Upload failed:', result.error);
 *   }
 * };
 */
const useFileUploadWithPolling = (
  options: UseFileUploadWithPollingOptions = {},
): UseFileUploadWithPollingReturn => {
  const { api, apiAvailable } = useGenAiAPI();
  const { pollInterval = 2000, maxPollTime = 10 * 60 * 1000 } = options;

  const [uploadState, setUploadState] = React.useState<FileUploadState>({
    fileName: '',
    status: 'idle',
  });

  // Track active upload for cancellation
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const timeoutIdsRef = React.useRef<NodeJS.Timeout[]>([]);

  /**
   * Cleans up all resources: aborts controller and clears all timeouts
   */
  const cleanup = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, []);

  /**
   * Sets error state and returns error result
   */
  const handleError = React.useCallback((fileName: string, error: string) => {
    setUploadState({
      fileName,
      status: 'failed',
      error,
    });
    return { success: false, error };
  }, []);

  /**
   * Waits for poll interval with proper timeout tracking and abort handling
   */
  const waitForPollInterval = React.useCallback(
    (signal: AbortSignal, interval: number): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error('Upload cancelled'));
          return;
        }

        const timeoutId = setTimeout(() => {
          // Remove timeout from tracking array when it completes
          timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
          resolve();
        }, interval);

        // Track timeout for cleanup
        timeoutIdsRef.current.push(timeoutId);

        // Handle abort - clear timeout and remove from tracking
        const abortHandler = () => {
          clearTimeout(timeoutId);
          timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
          reject(new Error('Upload cancelled'));
        };

        signal.addEventListener('abort', abortHandler, { once: true });
      }),
    [],
  );

  const cancelUpload = React.useCallback(() => {
    cleanup();
    setUploadState((prev) => ({
      ...prev,
      status: 'failed',
      error: 'Upload cancelled by user',
    }));
  }, [cleanup]);

  const uploadFile = React.useCallback(
    async (
      file: File,
      settings: ChatbotSourceSettings,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!apiAvailable) {
        return handleError(file.name, 'API is not available');
      }

      // Clean up any previous upload before starting a new one
      cleanup();

      // Reset state for new upload
      setUploadState({
        fileName: file.name,
        status: 'uploading',
      });

      // Create new abort controller for this upload
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      try {
        // Create FormData for multipart/form-data upload
        const formData = new FormData();
        formData.append('file', file);
        if (settings.chunkOverlap) {
          formData.append('chunk_overlap_tokens', String(settings.chunkOverlap));
        }
        if (settings.maxChunkLength) {
          formData.append('max_chunk_size_tokens', String(settings.maxChunkLength));
        }
        formData.append('vector_store_id', settings.vectorStore);

        // Upload file - returns 202 with job_id
        const uploadResponse = await api.uploadSource(formData);
        const jobId = uploadResponse.job_id;

        // Check if cancelled before starting polling
        if (signal.aborted) {
          throw new Error('Upload cancelled');
        }

        // Poll for upload status with fixed interval
        const startTime = Date.now();

        while (Date.now() - startTime < maxPollTime) {
          // Wait for poll interval with proper timeout tracking
          await waitForPollInterval(signal, pollInterval);

          try {
            const statusResponse = await api.getFileUploadStatus({ job_id: jobId });

            if (statusResponse.status === 'completed') {
              setUploadState({
                fileName: file.name,
                status: 'uploaded',
              });
              cleanup();
              return { success: true };
            }

            if (statusResponse.status === 'failed') {
              const error = statusResponse.error || 'Upload failed';
              cleanup();
              return handleError(file.name, error);
            }

            // Status is 'pending' or 'processing' - continue polling
          } catch (pollError) {
            // On network error, continue retrying until timeout
            if (Date.now() - startTime >= maxPollTime) {
              const error =
                pollError instanceof Error ? pollError.message : 'Failed to check upload status';
              cleanup();
              return handleError(file.name, error);
            }
            // Continue polling after network error
          }
        }

        // Polling timed out
        cleanup();
        return handleError(file.name, 'Upload timed out');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        cleanup();
        return handleError(file.name, errorMessage);
      }
    },
    [api, apiAvailable, pollInterval, maxPollTime, cleanup, handleError, waitForPollInterval],
  );

  // Cleanup on unmount
  React.useEffect(() => () => cleanup(), [cleanup]);

  return {
    uploadFile,
    uploadState,
    isUploading: uploadState.status === 'uploading',
    cancelUpload,
  };
};

export default useFileUploadWithPolling;
