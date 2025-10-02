/* eslint-disable camelcase */
import * as React from 'react';
import { DropEvent } from '@patternfly/react-core';
import { uploadSource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';

export type FileStatus = 'pending' | 'configured' | 'uploading' | 'uploaded' | 'failed';

export interface FileWithSettings {
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
  onShowErrorAlert: () => void;
  onFileUploadComplete?: () => void;
}

const useSourceManagement = ({
  onShowSuccessAlert,
  onShowErrorAlert,
  onFileUploadComplete,
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
      // Add files to filesWithSettings with pending status
      const newFilesWithSettings: FileWithSettings[] = source.map((file) => ({
        file,
        settings: null,
        status: 'pending',
      }));

      setFilesWithSettings((prev) => [...prev, ...newFilesWithSettings]);

      // Process the first file in the queue
      if (source.length > 0) {
        // Small delay to allow state to update before processing
        setTimeout(() => {
          processNextFile();
        }, 100);
      }
    },
    [processNextFile],
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
    },
    [currentFileForSettings],
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

          onShowErrorAlert();
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
      removeUploadedSource(currentFileForSettings.name);
    }

    setIsSourceSettingsOpen(false);
    setCurrentFileForSettings(null);

    // Process the next file in queue
    setTimeout(() => {
      processNextFile();
    }, 100);
  }, [currentFileForSettings, removeUploadedSource, processNextFile]);

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
