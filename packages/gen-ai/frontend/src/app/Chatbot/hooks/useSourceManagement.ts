/* eslint-disable camelcase */
import * as React from 'react';
import { DropEvent } from '@patternfly/react-core';
import { uploadSource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings } from '~/app/types';

export interface UseSourceManagementReturn {
  selectedSource: File[];
  selectedSourceSettings: ChatbotSourceSettings | null;
  isSourceSettingsOpen: boolean;
  extractedText: string;
  isRawUploaded: boolean;
  setIsRawUploaded: (isRawUploaded: boolean) => void;
  handleSourceDrop: (event: DropEvent, source: File[]) => Promise<void>;
  removeUploadedSource: () => void;
  handleSourceSettingsSubmit: (settings: ChatbotSourceSettings | null) => Promise<void>;
  setIsSourceSettingsOpen: (open: boolean) => void;
  setSelectedSourceSettings: (settings: ChatbotSourceSettings | null) => void;
}

interface UseSourceManagementProps {
  onShowSuccessAlert: () => void;
  onShowErrorAlert: () => void;
}

const useSourceManagement = ({
  onShowSuccessAlert,
  onShowErrorAlert,
}: UseSourceManagementProps): UseSourceManagementReturn => {
  const [selectedSource, setSelectedSource] = React.useState<File[]>([]);

  const [selectedSourceSettings, setSelectedSourceSettings] =
    React.useState<ChatbotSourceSettings | null>(null);
  const [isRawUploaded, setIsRawUploaded] = React.useState(false);
  const [isSourceSettingsOpen, setIsSourceSettingsOpen] = React.useState(false);
  const [extractedText, setExtractedText] = React.useState<string>('');

  // Open source settings modal when source is selected with slight delay to prevent flicker
  React.useEffect(() => {
    if (selectedSource.length > 0) {
      // Small delay to allow file processing to complete before opening modal
      const timer = setTimeout(() => {
        setIsSourceSettingsOpen(true);
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [selectedSource]);

  const handleSourceDrop = React.useCallback(async (event: DropEvent, source: File[]) => {
    setSelectedSource(source);
  }, []);

  const removeUploadedSource = React.useCallback(() => {
    setExtractedText('');
    setSelectedSource([]);
    setSelectedSourceSettings(null);
  }, []);

  const handleSourceSettingsSubmit = React.useCallback(
    async (settings: ChatbotSourceSettings | null) => {
      setSelectedSourceSettings(settings);
      setIsSourceSettingsOpen(false);

      if (settings) {
        try {
          await uploadSource(selectedSource[0], settings);
          onShowSuccessAlert();
        } catch {
          onShowErrorAlert();
        }
      } else {
        setSelectedSource([]);
        setExtractedText('');
      }
    },
    [selectedSource, onShowSuccessAlert, onShowErrorAlert],
  );

  return {
    selectedSource,
    selectedSourceSettings,
    isSourceSettingsOpen,
    isRawUploaded,
    setIsRawUploaded,
    extractedText,
    handleSourceDrop,
    removeUploadedSource,
    handleSourceSettingsSubmit,
    setIsSourceSettingsOpen,
    setSelectedSourceSettings,
  };
};

export default useSourceManagement;
