import React, { useRef, useState } from 'react';
import { AlertGroup, Button, type DropEvent } from '@patternfly/react-core';
import { FileIcon } from '@patternfly/react-icons';
import { FileWithSettings } from '~/app/Chatbot/hooks/useSourceManagement';
import { FILE_UPLOAD_CONFIG } from '~/app/Chatbot/const';
import { UploadedFileItem } from './UploadedFileItem';

type ChatbotSourceUploadPanelProps = {
  successAlert?: React.ReactElement;
  errorAlert?: React.ReactElement;
  handleSourceDrop: (event: DropEvent, sources: File[]) => void | Promise<void>;
  removeUploadedSource: (sourceName: string) => void;
  filesWithSettings: FileWithSettings[];
  uploadedFilesCount?: number;
  maxFilesAllowed?: number;
  isFilesLoading?: boolean;
};

const ChatbotSourceUploadPanel: React.FC<ChatbotSourceUploadPanelProps> = ({
  successAlert,
  errorAlert,
  handleSourceDrop,
  removeUploadedSource,
  filesWithSettings,
  uploadedFilesCount = 0,
  maxFilesAllowed = FILE_UPLOAD_CONFIG.MAX_FILES_IN_VECTOR_STORE,
  isFilesLoading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Check if we've reached the file limit (only count successfully uploaded files from API)
  const currentFileCount = uploadedFilesCount;
  const isAtLimit = currentFileCount >= maxFilesAllowed;
  // Disable upload interactions during initial loading or when at limit
  const isUploadDisabled = isFilesLoading || isAtLimit;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploadDisabled) {
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
    if (isUploadDisabled) {
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      await handleSourceDrop(e as DropEvent, files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadDisabled) {
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
    if (!isUploadDisabled) {
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
          isDragOver && !isUploadDisabled
            ? 'pf-v6-u-border-color-primary pf-v6-u-background-color-primary-50'
            : ''
        } ${isUploadDisabled ? 'pf-v6-u-opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="pf-v6-c-multiple-file-upload__main">
          <div className="pf-v6-c-multiple-file-upload__title">
            <div className="pf-v6-c-multiple-file-upload__title-icon">
              <FileIcon aria-hidden="true" />
            </div>
            <div className="pf-v6-c-multiple-file-upload__title-text">Add files</div>
          </div>
          <div className="pf-v6-c-multiple-file-upload__upload">
            <Button variant="secondary" onClick={handleUploadClick} isDisabled={isUploadDisabled}>
              Upload
            </Button>
          </div>
          <div className="pf-v6-c-multiple-file-upload__info">
            Upload up to 10 PDF, CSV or TXT files. Maximum size{' '}
            {FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)} mb per file.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileSelect}
            disabled={isUploadDisabled}
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
