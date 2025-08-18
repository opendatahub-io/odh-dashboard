/* eslint-disable camelcase */
import * as React from 'react';
import { DropEvent } from '@patternfly/react-core';
import { uploadSource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings } from '~/app/types';
import { extractTextFromFile } from '~/app/utilities/utils';

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

  // Open source settings modal when source is selected
  React.useEffect(() => {
    if (selectedSource.length > 0) {
      setIsSourceSettingsOpen(true);
    }
  }, [selectedSource]);

  const handleSourceDrop = React.useCallback(
    async (event: DropEvent, source: File[]) => {
      setSelectedSource(source);

      if (source.length > 0) {
        try {
          const text = await extractTextFromFile(source[0]);
          setExtractedText(text);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Error extracting text from file:', error);
          onShowErrorAlert();
          // Clear the selected source on error
          setSelectedSource([]);
        }
      }
    },
    [onShowErrorAlert],
  );

  const removeUploadedSource = React.useCallback(() => {
    setExtractedText('');
    setSelectedSource([]);
    setSelectedSourceSettings(null);
  }, []);

  const handleSourceSettingsSubmit = React.useCallback(
    async (settings: ChatbotSourceSettings | null) => {
      setSelectedSourceSettings(settings);
      setIsSourceSettingsOpen(false);

      if (settings && settings.chunkOverlap && settings.maxChunkLength) {
        const source = {
          documents: [
            {
              document_id: selectedSource[0].name,
              content: extractedText,
            },
          ],
        };
        const sourceSettings = {
          embeddingModel: settings.embeddingModel,
          vectorDB: settings.vectorDB,
          delimiter: settings.delimiter,
          chunkOverlap: settings.chunkOverlap,
          maxChunkLength: settings.maxChunkLength,
        };

        try {
          await uploadSource(source, sourceSettings);
          onShowSuccessAlert();
        } catch {
          onShowErrorAlert();
        }
      } else {
        setSelectedSource([]);
        setExtractedText('');
      }
    },
    [selectedSource, extractedText, onShowSuccessAlert, onShowErrorAlert],
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
