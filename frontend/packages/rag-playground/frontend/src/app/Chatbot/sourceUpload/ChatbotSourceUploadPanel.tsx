import React from 'react';
import {
  AlertGroup,
  DrawerPanelBody,
  DrawerPanelContent,
  type DropEvent,
  MultipleFileUpload,
  MultipleFileUploadMain,
  MultipleFileUploadStatusItem,
  Title,
} from '@patternfly/react-core';
import { FileIcon } from '@patternfly/react-icons';
import { ChatbotSourceSettings } from './ChatbotSourceSettingsModal';

type ChatbotSourceUploadPanelProps = {
  alert?: React.ReactElement;
  handleSourceDrop: (event: DropEvent, sources: File[]) => void;
  removeUploadedSource: (sourceName: string) => void;
  selectedSource: File[];
  selectedSourceSettings: ChatbotSourceSettings | null;
  setSelectedSourceSettings: (settings: ChatbotSourceSettings | null) => void;
};

const ChatbotSourceUploadPanel: React.FC<ChatbotSourceUploadPanelProps> = ({
  alert,
  handleSourceDrop,
  selectedSource,
  selectedSourceSettings,
  removeUploadedSource,
  setSelectedSourceSettings,
}) => (
  <DrawerPanelContent isResizable defaultSize="400px" minSize="300px">
    <AlertGroup hasAnimations isToast isLiveRegion>
      {alert}
    </AlertGroup>
    <DrawerPanelBody>
      <Title
        headingLevel="h5"
        style={{ fontWeight: 'bold', marginBottom: 'var(--pf-t--global--spacer--2xl)' }}
      >
        Sources
      </Title>
      <MultipleFileUpload
        onFileDrop={handleSourceDrop}
        dropzoneProps={{
          accept: {
            'application/msword': ['.doc'],
            'application/pdf': ['.pdf'],
          },
          maxFiles: 1,
        }}
        aria-label="Source upload area"
      >
        <MultipleFileUploadMain
          browseButtonText="Add"
          titleIcon={<FileIcon />}
          titleText="Drag and drop file here"
          titleTextSeparator="or"
          infoText="Upload a PDF or DOC file to be used in retrieval."
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
              aria-label={`Uploaded file: ${file.name}`}
            />
          ))}
      </MultipleFileUpload>
    </DrawerPanelBody>
  </DrawerPanelContent>
);

export { ChatbotSourceUploadPanel };
