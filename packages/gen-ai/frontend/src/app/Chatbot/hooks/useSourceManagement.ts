/* eslint-disable arrow-body-style */
/* eslint-disable camelcase */
import * as React from 'react';
import { DropEvent } from '@patternfly/react-core';
import { uploadSource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings, FileModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';

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
  setIsRawUploaded: (isRawUploaded: boolean) => void;
  handleSourceDrop: (event: DropEvent, source: File[]) => Promise<void>;
  removeUploadedSource: (fileName: string) => void;
  handleSourceSettingsSubmit: (settings: ChatbotSourceSettings | null) => Promise<void>;
  handleModalClose: () => void;
  setIsSourceSettingsOpen: (open: boolean) => void;
  setSelectedSourceSettings: (settings: ChatbotSourceSettings | null) => void;
}

interface UseSourceManagementProps {
  onShowSuccessAlert: () => void;
  onShowErrorAlert: (message?: string) => void;
  onFileUploadComplete?: () => void;
  uploadedFiles?: FileModel[];
}

const useSourceManagement = ({
  onShowSuccessAlert,
  onShowErrorAlert,
  onFileUploadComplete,
  uploadedFiles = [],
}: UseSourceManagementProps): UseSourceManagementReturn => {
  const { namespace } = React.useContext(GenAiContext);

  // Constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const MAX_FILES_IN_VECTOR_STORE = 10; // Maximum number of files allowed in vector store
  const [selectedSourceSettings, setSelectedSourceSettings] =
    React.useState<ChatbotSourceSettings | null>(null);
  const [isRawUploaded, setIsRawUploaded] = React.useState(false);
  const [isSourceSettingsOpen, setIsSourceSettingsOpen] = React.useState(false);
  const [filesWithSettings, setFilesWithSettings] = React.useState<FileWithSettings[]>([]);
  const [currentFileForSettings, setCurrentFileForSettings] = React.useState<File | null>(null);

  // Helper function to find the next pending file
  const findNextPendingFile = React.useCallback((files: FileWithSettings[]): File | null => {
    const pendingFile = files.find((fileWithSettings) => fileWithSettings.status === 'pending');
    return pendingFile ? pendingFile.file : null;
  }, []);

  // Helper function to process the next file in queue
  const processNextFile = React.useCallback(() => {
    setFilesWithSettings((currentFiles) => {
      const nextFile = findNextPendingFile(currentFiles);
      if (nextFile) {
        setCurrentFileForSettings(nextFile);
        setIsSourceSettingsOpen(true);
      } else {
        setCurrentFileForSettings(null);
        setIsSourceSettingsOpen(false);
      }
      return currentFiles;
    });
  }, [findNextPendingFile]);

  const handleSourceDrop = React.useCallback(
    async (event: DropEvent, source: File[]) => {
      // Filter files by size - silently skip oversized files
      const validSizeFiles = source.filter((file) => file.size <= MAX_FILE_SIZE);

      // If no valid files remain, return early
      if (validSizeFiles.length === 0) {
        return;
      }

      // Check total file count limit (API files + current queue + new files)
      const currentTotalFiles = uploadedFiles.length + filesWithSettings.length;
      const availableSlots = MAX_FILES_IN_VECTOR_STORE - currentTotalFiles;

      if (availableSlots <= 0) {
        onShowErrorAlert(
          `Cannot upload more files. The vector store already contains the maximum of ${MAX_FILES_IN_VECTOR_STORE} files.`,
        );
        return;
      }

      const filesToUpload = validSizeFiles.slice(0, availableSlots);
      const skippedCount = validSizeFiles.length - filesToUpload.length;

      if (skippedCount > 0) {
        const remainingSlots = availableSlots;
        onShowErrorAlert(
          `Only ${remainingSlots} file${remainingSlots === 1 ? '' : 's'} can be uploaded. ${skippedCount} file${skippedCount === 1 ? ' was' : 's were'} skipped to stay within the ${MAX_FILES_IN_VECTOR_STORE} file limit.`,
        );
      }

      // Add only files within the limit to filesWithSettings with pending status
      const newFilesWithSettings: FileWithSettings[] = filesToUpload.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        settings: null,
        status: 'pending',
      }));

      setFilesWithSettings((prev) => {
        return [...prev, ...newFilesWithSettings];
      });

      // Process the first file in the queue
      if (filesToUpload.length > 0) {
        // Small delay to allow state to update before processing
        setTimeout(() => {
          processNextFile();
        }, 100);
      }
    },
    [
      uploadedFiles,
      filesWithSettings,
      MAX_FILE_SIZE,
      MAX_FILES_IN_VECTOR_STORE,
      onShowErrorAlert,
      processNextFile,
    ],
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

      // Process the next file in queue after state update
      setTimeout(() => {
        processNextFile();
      }, 100);
    },
    [currentFileForSettings, processNextFile],
  );

  const handleSourceSettingsSubmit = React.useCallback(
    async (settings: ChatbotSourceSettings | null) => {
      setSelectedSourceSettings(settings);
      setIsSourceSettingsOpen(false);

      if (settings && currentFileForSettings) {
        try {
          if (!namespace?.name) {
            throw new Error('Namespace is required for file upload');
          }

          // Update the file status to uploading
          setFilesWithSettings((prev) =>
            prev.map((fileWithSettings) =>
              fileWithSettings.file.name === currentFileForSettings.name
                ? { ...fileWithSettings, settings, status: 'uploading' }
                : fileWithSettings,
            ),
          );

          await uploadSource(currentFileForSettings, settings, namespace.name);

          // Update the file status to uploaded
          setFilesWithSettings((prev) =>
            prev.map((fileWithSettings) =>
              fileWithSettings.file.name === currentFileForSettings.name
                ? { ...fileWithSettings, status: 'uploaded' }
                : fileWithSettings,
            ),
          );

          onShowSuccessAlert();

          // Refresh the uploaded files list
          onFileUploadComplete?.();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Upload failed:', error);

          // Update the file status to failed
          setFilesWithSettings((prev) =>
            prev.map((fileWithSettings) =>
              fileWithSettings.file.name === currentFileForSettings.name
                ? { ...fileWithSettings, status: 'failed' }
                : fileWithSettings,
            ),
          );

          // Extract error message from the error object
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          onShowErrorAlert(errorMessage);
        }
      } else if (!settings) {
        // User cancelled - remove the file
        if (currentFileForSettings) {
          removeUploadedSource(currentFileForSettings.name);
        }
      }

      // Process the next file in queue
      setTimeout(() => {
        processNextFile();
      }, 100);
    },
    [
      currentFileForSettings,
      onShowSuccessAlert,
      onShowErrorAlert,
      onFileUploadComplete,
      namespace?.name,
      removeUploadedSource,
      processNextFile,
    ],
  );

  const handleModalClose = React.useCallback(() => {
    // Remove the current file if user closes modal without submitting
    if (currentFileForSettings) {
      // Only remove files that haven't been uploaded yet (pending/configured status)
      const currentFileWithSettings = filesWithSettings.find(
        (fileWithSettings) => fileWithSettings.file.name === currentFileForSettings.name,
      );

      if (
        currentFileWithSettings &&
        (currentFileWithSettings.status === 'pending' ||
          currentFileWithSettings.status === 'configured')
      ) {
        removeUploadedSource(currentFileForSettings.name);
      }
    }

    setIsSourceSettingsOpen(false);
    setCurrentFileForSettings(null);

    // Process the next file in queue
    setTimeout(() => {
      processNextFile();
    }, 100);
  }, [currentFileForSettings, filesWithSettings, removeUploadedSource, processNextFile]);

  return {
    selectedSourceSettings,
    isSourceSettingsOpen,
    isRawUploaded,
    filesWithSettings,
    currentFileForSettings,
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
