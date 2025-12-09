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

  const cancelUpload = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Clear all pending timeouts
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
    setUploadState((prev) => ({
      ...prev,
      status: 'failed',
      error: 'Upload cancelled by user',
    }));
  }, []);

  const uploadFile = React.useCallback(
    async (
      file: File,
      settings: ChatbotSourceSettings,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!apiAvailable) {
        const error = 'API is not available';
        setUploadState({
          fileName: file.name,
          status: 'failed',
          error,
        });
        return { success: false, error };
      }

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
          // Wait for poll interval
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(resolve, pollInterval);
            timeoutIdsRef.current.push(timeoutId);

            // Handle abort
            if (signal.aborted) {
              clearTimeout(timeoutId);
              reject(new Error('Upload cancelled'));
            }
          });

          try {
            const statusResponse = await api.getFileUploadStatus({ job_id: jobId });

            if (statusResponse.status === 'completed') {
              setUploadState({
                fileName: file.name,
                status: 'uploaded',
              });
              // Clean up
              abortControllerRef.current = null;
              timeoutIdsRef.current = [];
              return { success: true };
            }

            if (statusResponse.status === 'failed') {
              const error = statusResponse.error || 'Upload failed';
              setUploadState({
                fileName: file.name,
                status: 'failed',
                error,
              });
              // Clean up
              abortControllerRef.current = null;
              timeoutIdsRef.current = [];
              return { success: false, error };
            }

            // Status is 'pending' or 'processing' - continue polling
          } catch (pollError) {
            // On network error, continue retrying until timeout
            if (Date.now() - startTime >= maxPollTime) {
              const error =
                pollError instanceof Error ? pollError.message : 'Failed to check upload status';
              setUploadState({
                fileName: file.name,
                status: 'failed',
                error,
              });
              // Clean up
              abortControllerRef.current = null;
              timeoutIdsRef.current = [];
              return { success: false, error };
            }
            // Continue polling after network error
          }
        }

        // Polling timed out
        const error = 'Upload timed out';
        setUploadState({
          fileName: file.name,
          status: 'failed',
          error,
        });
        // Clean up
        abortControllerRef.current = null;
        timeoutIdsRef.current = [];
        return { success: false, error };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setUploadState({
          fileName: file.name,
          status: 'failed',
          error: errorMessage,
        });
        // Clean up
        abortControllerRef.current = null;
        timeoutIdsRef.current = [];
        return { success: false, error: errorMessage };
      }
    },
    [api, apiAvailable, pollInterval, maxPollTime],
  );

  // Cleanup on unmount
  React.useEffect(
    () => () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    },
    [],
  );

  return {
    uploadFile,
    uploadState,
    isUploading: uploadState.status === 'uploading',
    cancelUpload,
  };
};

export default useFileUploadWithPolling;
