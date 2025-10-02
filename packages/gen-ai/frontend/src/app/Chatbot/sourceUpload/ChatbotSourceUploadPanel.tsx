import React, { useRef, useState } from 'react';
import { AlertGroup, Button, type DropEvent } from '@patternfly/react-core';
import { FileIcon } from '@patternfly/react-icons';
import { FileWithSettings } from '~/app/Chatbot/hooks/useSourceManagement';
import { UploadedFileItem } from './UploadedFileItem';

type ChatbotSourceUploadPanelProps = {
  successAlert?: React.ReactElement;
  errorAlert?: React.ReactElement;
  handleSourceDrop: (event: DropEvent, sources: File[]) => void | Promise<void>;
  removeUploadedSource: (sourceName: string) => void;
  filesWithSettings: FileWithSettings[];
  uploadedFilesCount?: number;
  maxFilesAllowed?: number;
};

const ChatbotSourceUploadPanel: React.FC<ChatbotSourceUploadPanelProps> = ({
  successAlert,
  errorAlert,
  handleSourceDrop,
  removeUploadedSource,
  filesWithSettings,
  uploadedFilesCount = 0,
  maxFilesAllowed = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Check if we've reached the file limit
  const currentFileCount = uploadedFilesCount + filesWithSettings.length;
  const isAtLimit = currentFileCount >= maxFilesAllowed;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAtLimit) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isAtLimit) {
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      await handleSourceDrop(e as DropEvent, files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAtLimit) {
      return;
    }
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      await handleSourceDrop(e as any, files);
    }
    // Clear the input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleUploadClick = () => {
    if (!isAtLimit) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <AlertGroup hasAnimations isToast isLiveRegion>
        {successAlert}
        {errorAlert}
      </AlertGroup>

      <div
        className={`pf-v6-c-multiple-file-upload pf-m-horizontal ${
          isDragOver && !isAtLimit
            ? 'pf-v6-u-border-color-primary pf-v6-u-background-color-primary-50'
            : ''
        } ${isAtLimit ? 'pf-v6-u-opacity-50' : ''}`}
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
            <Button variant="secondary" onClick={handleUploadClick} isDisabled={isAtLimit}>
              Upload
            </Button>
          </div>
          <div className="pf-v6-c-multiple-file-upload__info">
            Accepted file types: PDF, DOC, CSV (max 10MB per file)
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.csv"
            multiple
            onChange={handleFileSelect}
            disabled={isAtLimit}
            hidden
            aria-label="File upload input"
          />
        </div>
      </div>

      {filesWithSettings.map((fileWithSettings) => {
        const progress =
          fileWithSettings.status === 'uploaded'
            ? 100
            : fileWithSettings.status === 'failed'
              ? 100
              : fileWithSettings.status === 'uploading'
                ? 50 // Show 50% progress during upload since we don't have real progress
                : 0;

        return (
          <UploadedFileItem
            key={fileWithSettings.id}
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
