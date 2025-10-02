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
      // Filter out files that are already uploaded (check against API files)
      const uploadedFileNames = uploadedFiles.map((file) => file.filename);
      const newFiles = source.filter((file) => !uploadedFileNames.includes(file.name));

      // Also filter out files that are already in the current queue
      const currentFileNames = filesWithSettings.map(
        (fileWithSettings) => fileWithSettings.file.name,
      );
      const uniqueNewFiles = newFiles.filter((file) => !currentFileNames.includes(file.name));

      if (uniqueNewFiles.length === 0) {
        // All files are duplicates, show error with specific message
        const duplicateCount = source.length;
        const message =
          duplicateCount === 1
            ? 'This file has already been uploaded.'
            : `All ${duplicateCount} files have already been uploaded.`;
        onShowErrorAlert(message);
        return;
      }

      // Add only unique files to filesWithSettings with pending status
      const newFilesWithSettings: FileWithSettings[] = uniqueNewFiles.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        settings: null,
        status: 'pending',
      }));

      setFilesWithSettings((prev) => {
        // Check for duplicates inside the state updater to prevent race conditions
        const existingFileNames = prev.map((fileWithSettings) => fileWithSettings.file.name);
        const trulyUniqueFiles = newFilesWithSettings.filter(
          (newFileWithSettings) => !existingFileNames.includes(newFileWithSettings.file.name),
        );
        return [...prev, ...trulyUniqueFiles];
      });

      // Process the first file in the queue
      if (uniqueNewFiles.length > 0) {
        // Small delay to allow state to update before processing
        setTimeout(() => {
          processNextFile();
        }, 100);
      }
    },
    [processNextFile, uploadedFiles, filesWithSettings, onShowErrorAlert],
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
