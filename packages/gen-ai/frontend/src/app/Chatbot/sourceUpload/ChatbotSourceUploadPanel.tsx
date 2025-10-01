import React, { useRef, useState } from 'react';
import { AlertGroup, Button, type DropEvent } from '@patternfly/react-core';
import { FileIcon } from '@patternfly/react-icons';
import { FileWithSettings } from '~/app/Chatbot/hooks/useSourceManagement';
import { initializeFileProgress } from './utils';
import { UploadedFileItem } from './UploadedFileItem';

type ChatbotSourceUploadPanelProps = {
  successAlert?: React.ReactElement;
  errorAlert?: React.ReactElement;
  handleSourceDrop: (event: DropEvent, sources: File[]) => void;
  removeUploadedSource: (sourceName: string) => void;
  filesWithSettings: FileWithSettings[];
};

const ChatbotSourceUploadPanel: React.FC<ChatbotSourceUploadPanelProps> = ({
  successAlert,
  errorAlert,
  handleSourceDrop,
  removeUploadedSource,
  filesWithSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});

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
      initializeFileProgress(files, setFileProgress);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      handleSourceDrop(e as DropEvent, files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      initializeFileProgress(files, setFileProgress);
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

      <div
        className={`pf-v6-c-multiple-file-upload pf-m-horizontal ${
          isDragOver ? 'pf-v6-u-border-color-primary pf-v6-u-background-color-primary-50' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="pf-v6-c-multiple-file-upload__main">
          <div className="pf-v6-c-multiple-file-upload__title">
            <div className="pf-v6-c-multiple-file-upload__title-icon">
              <FileIcon aria-hidden="true" />
            </div>
            <div className="pf-v6-c-multiple-file-upload__title-text">
              Drag and drop files here or upload
            </div>
          </div>
          <div className="pf-v6-c-multiple-file-upload__upload">
            <Button variant="secondary" onClick={handleUploadClick}>
              Upload
            </Button>
          </div>
          <div className="pf-v6-c-multiple-file-upload__info">
            Accepted file types: PDF, DOC, CSV
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.csv"
            multiple
            onChange={handleFileSelect}
            hidden
            aria-label="File upload input"
          />
        </div>
      </div>

      {filesWithSettings.map((fileWithSettings) => {
        const progress =
          fileWithSettings.status === 'uploading'
            ? fileProgress[fileWithSettings.file.name] || 0
            : fileWithSettings.status === 'uploaded'
              ? 100
              : fileWithSettings.status === 'failed'
                ? 100
                : 0;

        return (
          <UploadedFileItem
            key={fileWithSettings.file.name}
            file={fileWithSettings.file}
            progress={progress}
            status={fileWithSettings.status}
            onRemove={(fileName) => {
              removeUploadedSource(fileName);
            }}
          />
        );
      })}
    </>
  );
};

export { ChatbotSourceUploadPanel };
