/* eslint-disable arrow-body-style */
/* eslint-disable camelcase */
import * as React from 'react';
import { DropEvent } from '@patternfly/react-core';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { ChatbotSourceSettings, FileModel } from '~/app/types';
import { FILE_UPLOAD_CONFIG } from '~/app/Chatbot/const';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useFileUploadWithPolling from './useFileUploadWithPolling';

export type FileStatus = 'pending' | 'configured' | 'uploading' | 'uploaded' | 'failed';

export interface FileWithSettings {
  id: string;
  file: File;
  settings: ChatbotSourceSettings | null;
  status: FileStatus;
}

export interface UseSourceManagementReturn {
  selectedSourceSettings: ChatbotSourceSettings | null;
  isSourceSettingsOpen: boolean;
  isRawUploaded: boolean;
  filesWithSettings: FileWithSettings[];
  currentFileForSettings: File | null;
  pendingFiles: File[];
  isUploading: boolean;
  uploadProgress: { current: number; total: number };
  setIsRawUploaded: (isRawUploaded: boolean) => void;
  handleSourceDrop: (event: DropEvent, source: File[]) => Promise<void>;
  removeUploadedSource: (fileName: string) => void;
  handleSourceSettingsSubmit: (settings: ChatbotSourceSettings | null) => Promise<void>;
  handleModalClose: () => void;
  setIsSourceSettingsOpen: (open: boolean) => void;
  setSelectedSourceSettings: (settings: ChatbotSourceSettings | null) => void;
}

export interface UseSourceManagementProps {
  onShowSuccessAlert: () => void;
  onShowErrorAlert: (message?: string, title?: string) => void;
  onFileUploadComplete?: () => void;
  uploadedFiles?: FileModel[];
  isFilesLoading?: boolean;
}

const UPLOAD_EVENT_NAME = 'Playground RAG Upload File';

const useSourceManagement = ({
  onShowSuccessAlert,
  onShowErrorAlert,
  onFileUploadComplete,
  uploadedFiles = [],
  isFilesLoading = false,
}: UseSourceManagementProps): UseSourceManagementReturn => {
  const { apiAvailable } = useGenAiAPI();
  const { uploadFile } = useFileUploadWithPolling();

  // Use constants from shared configuration
  const { MAX_FILE_SIZE, MAX_FILES_IN_VECTOR_STORE } = FILE_UPLOAD_CONFIG;
  const [selectedSourceSettings, setSelectedSourceSettings] =
    React.useState<ChatbotSourceSettings | null>(null);
  const [isRawUploaded, setIsRawUploaded] = React.useState(false);
  const [isSourceSettingsOpen, setIsSourceSettingsOpen] = React.useState(false);
  const [filesWithSettings, setFilesWithSettings] = React.useState<FileWithSettings[]>([]);
  const [currentFileForSettings, setCurrentFileForSettings] = React.useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState({ current: 0, total: 0 });
  // Track if the page initially loaded with no files
  const [hadNoFilesInitially, setHadNoFilesInitially] = React.useState<boolean | null>(null);
  // Track if we've already auto-enabled RAG (so we only do it once)
  const [hasAutoEnabledRag, setHasAutoEnabledRag] = React.useState(false);
  // Track the previous loading state to detect when loading completes
  const prevIsLoadingRef = React.useRef<boolean | null>(null);
  // Track if we should skip processing (e.g., during upload)
  const skipProcessingRef = React.useRef(false);

  // Track the initial file state on first load
  React.useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    const isNowLoaded = wasLoading === true && !isFilesLoading;

    // Update the ref for next render
    prevIsLoadingRef.current = isFilesLoading;

    // Only set initial state when we've just completed the first load (transition from loading to loaded)
    if (hadNoFilesInitially === null && isNowLoaded) {
      const noFilesExist = uploadedFiles.length === 0;
      setHadNoFilesInitially(noFilesExist);
    }
  }, [uploadedFiles, hadNoFilesInitially, isFilesLoading]);

  // Helper function to find all pending files
  const findPendingFiles = React.useCallback(
    (files: FileWithSettings[]): File[] =>
      files
        .filter((fileWithSettings) => fileWithSettings.status === 'pending')
        .map((fileWithSettings) => fileWithSettings.file),
    [],
  );

  // Process pending files whenever filesWithSettings changes
  // Inlined directly in useEffect to avoid dependency loop issues
  React.useEffect(() => {
    if (skipProcessingRef.current) {
      return;
    }

    const pendingFilesList = findPendingFiles(filesWithSettings);
    if (pendingFilesList.length > 0) {
      setPendingFiles(pendingFilesList);
      setCurrentFileForSettings(pendingFilesList[0]);
      setIsSourceSettingsOpen(true);
    } else {
      setPendingFiles([]);
      setCurrentFileForSettings(null);
      setIsSourceSettingsOpen(false);
    }
  }, [filesWithSettings, findPendingFiles]);

  const handleSourceDrop = React.useCallback(
    async (event: DropEvent, source: File[]) => {
      // Filter files by size - silently skip oversized files
      const validSizeFiles = source.filter((file) => file.size <= MAX_FILE_SIZE);

      // If no valid files remain, return early
      if (validSizeFiles.length === 0) {
        return;
      }

      // Check total file count limit (only count successfully uploaded files from API)
      const currentTotalFiles = uploadedFiles.length;
      const availableSlots = MAX_FILES_IN_VECTOR_STORE - currentTotalFiles;

      if (availableSlots <= 0) {
        onShowErrorAlert(
          `Cannot upload more files. The vector store already contains the maximum of ${MAX_FILES_IN_VECTOR_STORE} files.`,
          'File Upload Error',
        );
        return;
      }

      const filesToUpload = validSizeFiles.slice(0, availableSlots);
      const skippedCount = validSizeFiles.length - filesToUpload.length;

      if (skippedCount > 0) {
        onShowErrorAlert(
          'The maximum file number of 10 has been reached. Some files might not have been uploaded.',
          'File limit met',
        );
      }

      // Add only files within the limit to filesWithSettings with pending status
      const newFilesWithSettings: FileWithSettings[] = filesToUpload.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        settings: null,
        status: 'pending',
      }));

      setFilesWithSettings((prev) => [...prev, ...newFilesWithSettings]);
      // processPendingFiles will be called automatically via useEffect when filesWithSettings updates
    },
    [uploadedFiles, MAX_FILE_SIZE, MAX_FILES_IN_VECTOR_STORE, onShowErrorAlert],
  );

  const removeUploadedSource = React.useCallback(
    (fileName: string) => {
      setFilesWithSettings((prev) =>
        prev.filter((fileWithSettings) => fileWithSettings.file.name !== fileName),
      );

      // If the removed file was the current file for settings, clear it
      if (currentFileForSettings?.name === fileName) {
        setCurrentFileForSettings(null);
        setIsSourceSettingsOpen(false);
      }
      // processPendingFiles will be called automatically via useEffect when filesWithSettings updates
    },
    [currentFileForSettings],
  );

  const handleSourceSettingsSubmit = React.useCallback(
    async (settings: ChatbotSourceSettings | null) => {
      setSelectedSourceSettings(settings);
      setIsSourceSettingsOpen(false);

      if (settings && pendingFiles.length > 0) {
        if (!apiAvailable) {
          onShowErrorAlert('API is not available', 'File Upload Error');
          return;
        }

        // Skip processing while uploading to prevent modal from reopening
        skipProcessingRef.current = true;
        setIsUploading(true);
        setUploadProgress({ current: 0, total: pendingFiles.length });

        // Upload files sequentially to avoid API overload
        let successCount = 0;
        let failureCount = 0;
        const errors: string[] = [];

        try {
          // Update all pending files status to uploading
          setFilesWithSettings((prev) =>
            prev.map((fileWithSettings) =>
              pendingFiles.some((pendingFile) => pendingFile.name === fileWithSettings.file.name)
                ? { ...fileWithSettings, settings, status: 'uploading' }
                : fileWithSettings,
            ),
          );

          for (let i = 0; i < pendingFiles.length; i++) {
            const file = pendingFiles[i];
            setUploadProgress({ current: i + 1, total: pendingFiles.length });

            // Update status to uploading before starting
            setFilesWithSettings((prev) =>
              prev.map((fileWithSettings) =>
                fileWithSettings.file.name === file.name
                  ? { ...fileWithSettings, status: 'uploading' }
                  : fileWithSettings,
              ),
            );

            const result = await uploadFile(file, settings);

            // Update state based on result
            if (result.success) {
              // Mark as uploaded - will be auto-removed after 5 seconds by UploadedFileItem
              setFilesWithSettings((prev) =>
                prev.map((fileWithSettings) =>
                  fileWithSettings.file.name === file.name
                    ? { ...fileWithSettings, status: 'uploaded' }
                    : fileWithSettings,
                ),
              );
              fireFormTrackingEvent(UPLOAD_EVENT_NAME, {
                outcome: TrackingOutcome.submit,
                success: true,
                chunkSize: settings.maxChunkLength,
                chunkOverlap: settings.chunkOverlap,
                delimiter: settings.delimiter,
              });
              successCount++;
            } else {
              // Remove failed file immediately from tracking array
              setFilesWithSettings((prev) =>
                prev.filter((fileWithSettings) => fileWithSettings.file.name !== file.name),
              );
              fireFormTrackingEvent(UPLOAD_EVENT_NAME, {
                outcome: TrackingOutcome.submit,
                success: false,
                error: result.error,
              });
              errors.push(`${file.name}: ${result.error}`);
              failureCount++;
            }
          }

          // Show appropriate success/error messages
          if (successCount > 0 && failureCount === 0) {
            onShowSuccessAlert();
          } else if (successCount > 0 && failureCount > 0) {
            onShowErrorAlert(
              `${successCount} file(s) uploaded successfully, ${failureCount} failed. Errors: ${errors.join('; ')}`,
              'File Upload Error',
            );
          } else {
            onShowErrorAlert(
              `All uploads failed. Errors: ${errors.join('; ')}`,
              'File Upload Error',
            );
          }

          // Auto-enable RAG toggle only once, on first successful upload, if page initially had no files
          if (successCount > 0 && hadNoFilesInitially === true && !hasAutoEnabledRag) {
            setIsRawUploaded(true);
            setHasAutoEnabledRag(true);
          }

          // Refresh the uploaded files list
          onFileUploadComplete?.();
        } finally {
          setIsUploading(false);
          setUploadProgress({ current: 0, total: 0 });
          // Re-enable processing after upload completes (even on error)
          skipProcessingRef.current = false;
        }
      } else if (!settings) {
        // User cancelled - remove all pending files
        pendingFiles.forEach((file) => {
          removeUploadedSource(file.name);
        });
      }

      // Clear pending files - processPendingFiles will be called automatically via useEffect
      setPendingFiles([]);
    },
    [
      pendingFiles,
      apiAvailable,
      onFileUploadComplete,
      onShowErrorAlert,
      uploadFile,
      onShowSuccessAlert,
      removeUploadedSource,
      hadNoFilesInitially,
      hasAutoEnabledRag,
    ],
  );

  const handleModalClose = React.useCallback(() => {
    // Remove pending/configured files if user closes modal without submitting
    if (pendingFiles.length > 0) {
      pendingFiles.forEach((file) => {
        const fileWithSettings = filesWithSettings.find(
          (fileWithSettingsItem) => fileWithSettingsItem.file.name === file.name,
        );

        if (
          fileWithSettings &&
          (fileWithSettings.status === 'pending' || fileWithSettings.status === 'configured')
        ) {
          removeUploadedSource(file.name);
        }
      });
    }

    fireFormTrackingEvent(UPLOAD_EVENT_NAME, {
      outcome: TrackingOutcome.cancel,
    });

    setIsSourceSettingsOpen(false);
    setCurrentFileForSettings(null);
    setPendingFiles([]);
    // processPendingFiles will be called automatically via useEffect when filesWithSettings updates
  }, [pendingFiles, filesWithSettings, removeUploadedSource]);

  return {
    selectedSourceSettings,
    isSourceSettingsOpen,
    isRawUploaded,
    filesWithSettings,
    currentFileForSettings,
    pendingFiles,
    isUploading,
    uploadProgress,
    setIsRawUploaded,
    handleSourceDrop,
    removeUploadedSource,
    handleSourceSettingsSubmit,
    handleModalClose,
    setIsSourceSettingsOpen,
    setSelectedSourceSettings,
  };
};

export default useSourceManagement;
