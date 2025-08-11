import React from 'react';
import {
  AlertGroup,
  type DropEvent,
  MultipleFileUpload,
  MultipleFileUploadMain,
  MultipleFileUploadStatusItem,
} from '@patternfly/react-core';
import { FileIcon } from '@patternfly/react-icons';
import { ChatbotSourceSettings } from '~/app/types';

type ChatbotSourceUploadPanelProps = {
  successAlert?: React.ReactElement;
  errorAlert?: React.ReactElement;
  handleSourceDrop: (event: DropEvent, sources: File[]) => void;
  removeUploadedSource: (sourceName: string) => void;
  selectedSource: File[];
  selectedSourceSettings: ChatbotSourceSettings | null;
  setSelectedSourceSettings: (settings: ChatbotSourceSettings | null) => void;
  onTextExtracted?: (text: string) => void; // PatternFly handles the extraction
};

const ChatbotSourceUploadPanel: React.FC<ChatbotSourceUploadPanelProps> = ({
  successAlert,
  errorAlert,
  handleSourceDrop,
  selectedSource,
  selectedSourceSettings,
  removeUploadedSource,
  setSelectedSourceSettings,
  onTextExtracted,
}) => (
  <>
    <AlertGroup hasAnimations isToast isLiveRegion>
      {successAlert}
      {errorAlert}
    </AlertGroup>
    <MultipleFileUpload
      onFileDrop={handleSourceDrop}
      dropzoneProps={{
        accept: {
          'application/pdf': ['.pdf'],
          'application/msword': ['.doc'],
          'text/csv': ['.csv'],
        },
        maxFiles: 1,
      }}
      aria-label="Source upload area"
    >
      <MultipleFileUploadMain
        browseButtonText="Upload"
        type="text"
        titleIcon={<FileIcon />}
        titleText="Drag and drop file here"
        titleTextSeparator="or"
        infoText="Accepted file types: PDF, DOC, CSV"
      />
      {selectedSourceSettings &&
        selectedSource.map((file) => (
          <MultipleFileUploadStatusItem
            file={file}
            key={file.name}
            onClearClick={() => {
              removeUploadedSource(file.name);
              setSelectedSourceSettings(null);
            }}
            onReadSuccess={(data) => {
              // PatternFly automatically extracts text content when type="text"
              if (onTextExtracted) {
                onTextExtracted(data);
              }
            }}
            aria-label={`Uploaded file: ${file.name}`}
          />
        ))}
    </MultipleFileUpload>
  </>
);

export { ChatbotSourceUploadPanel };
