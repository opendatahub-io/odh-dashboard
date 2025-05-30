import {
  DropEvent,
  FileUpload,
  FileUploadProps,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import React from 'react';
import { ErrorCode } from 'react-dropzone';
import { MAX_SIZE, MAX_SIZE_AS_MB } from '#~/concepts/pipelines/content/const';

type SshKeyFileUploadProps = {
  onChange: (value: string) => void;
  onBlur: () => void;
  validated: FileUploadProps['validated'];
  data: string;
};

export const SshKeyFileUpload: React.FC<SshKeyFileUploadProps> = ({
  data,
  onChange,
  onBlur,
  validated,
}) => {
  const [filename, setFilename] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [rejectedReason, setRejectedReason] = React.useState<string | undefined>();

  const handleFileInputChange = (_event: DropEvent, file: File) => {
    setFilename(file.name);
    if (file.size > MAX_SIZE) {
      setRejectedReason(`File size exceeds ${MAX_SIZE_AS_MB} MB`);
    }
  };

  const handleTextChange = (_event: React.ChangeEvent<HTMLTextAreaElement>, val: string) => {
    const trimmedVal = val.trim();
    onChange(trimmedVal);
  };

  const handleDataChange = (_event: DropEvent, val: string) => {
    const trimmedVal = val.trim();
    onChange(trimmedVal);
  };

  const handleClear = () => {
    onChange('');
    setFilename('');
    setRejectedReason(undefined);
  };

  const handleFileReadStarted = () => {
    setRejectedReason(undefined);
    setIsLoading(true);
  };

  const handleFileReadFinished = () => {
    setIsLoading(false);
  };

  return (
    <>
      <FileUpload
        id="sshKeyFileUpload"
        data-testid="taxonomy-ssh-key"
        type="text"
        value={data}
        filename={filename}
        filenamePlaceholder="Drag and drop a file or upload one"
        onFileInputChange={handleFileInputChange}
        onDataChange={handleDataChange}
        onTextChange={handleTextChange}
        onReadStarted={handleFileReadStarted}
        onReadFinished={handleFileReadFinished}
        onClearClick={handleClear}
        isLoading={isLoading}
        dropzoneProps={{
          maxSize: MAX_SIZE,
          onDropRejected: (reason) => {
            const error = reason[0].errors[0];
            if (error.code === ErrorCode.FileTooLarge) {
              setRejectedReason(`File size exceeds ${MAX_SIZE_AS_MB} MB`);
            } else {
              setRejectedReason(error.message || 'File rejected');
            }
          },
        }}
        browseButtonText="Upload"
        allowEditingUploadedText
        onBlur={onBlur}
        validated={validated}
      />
      <FormHelperText>
        <HelperText isLiveRegion>
          <HelperTextItem
            id="ssh-key-helpText"
            data-testid="ssh-key-helpText"
            variant={rejectedReason ? 'error' : 'default'}
          >
            {rejectedReason}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </>
  );
};
