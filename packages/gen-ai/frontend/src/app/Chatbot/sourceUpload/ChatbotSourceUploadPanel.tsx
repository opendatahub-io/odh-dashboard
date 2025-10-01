import React, { useRef, useState } from 'react';
import {
  AlertGroup,
  Button,
  Card,
  CardBody,
  Flex,
  FlexItem,
  type DropEvent,
} from '@patternfly/react-core';
import { FileIcon, TimesIcon } from '@patternfly/react-icons';
import { ChatbotSourceSettings } from '~/app/types';

type ChatbotSourceUploadPanelProps = {
  successAlert?: React.ReactElement;
  errorAlert?: React.ReactElement;
  handleSourceDrop: (event: DropEvent, sources: File[]) => void;
  removeUploadedSource: (sourceName: string) => void;
  selectedSource: File[];
  selectedSourceSettings: ChatbotSourceSettings | null;
  setSelectedSourceSettings: (settings: ChatbotSourceSettings | null) => void;
};

const ChatbotSourceUploadPanel: React.FC<ChatbotSourceUploadPanelProps> = ({
  successAlert,
  errorAlert,
  handleSourceDrop,
  selectedSource,
  selectedSourceSettings,
  removeUploadedSource,
  setSelectedSourceSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Pass the original drag event as DropEvent
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handleSourceDrop(e as DropEvent, files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Pass the change event as DropEvent
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      handleSourceDrop(e as any, files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <AlertGroup hasAnimations isToast isLiveRegion>
        {successAlert}
        {errorAlert}
      </AlertGroup>

      <Card
        className={`pf-v6-u-border-style-dashed pf-v6-u-border-2 ${
          isDragOver
            ? 'pf-v6-u-border-color-primary pf-v6-u-background-color-primary-50'
            : 'pf-v6-u-border-color-200'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardBody className="pf-v6-u-p-lg">
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem flex={{ default: 'flex_1' }}>
              <Flex alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <FileIcon className="pf-v6-u-mr-md pf-v6-u-color-200" />
                </FlexItem>
                <FlexItem>
                  <span>Drag and drop files here or upload</span>
                </FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" onClick={handleUploadClick}>
                Upload
              </Button>
            </FlexItem>
          </Flex>

          <div className="pf-v6-u-mt-md">
            <small className="pf-v6-u-color-200">Accepted file types: PDF, DOC, CSV</small>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.csv"
            onChange={handleFileSelect}
            hidden
            aria-label="File upload input"
          />
        </CardBody>
      </Card>

      {selectedSourceSettings &&
        selectedSource.map((file) => (
          <Card key={file.name} className="pf-v6-u-mt-md">
            <CardBody>
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>
                      <FileIcon className="pf-v6-u-mr-sm pf-v6-u-color-200" />
                    </FlexItem>
                    <FlexItem>
                      <span className="pf-v6-u-font-size-sm">{file.name}</span>
                    </FlexItem>
                  </Flex>
                </FlexItem>
                <FlexItem>
                  <Button
                    variant="plain"
                    onClick={() => {
                      removeUploadedSource(file.name);
                      setSelectedSourceSettings(null);
                    }}
                    aria-label={`Remove ${file.name}`}
                  >
                    <TimesIcon />
                  </Button>
                </FlexItem>
              </Flex>
            </CardBody>
          </Card>
        ))}
    </>
  );
};

export { ChatbotSourceUploadPanel };
