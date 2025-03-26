import {
  DropEvent,
  FileUpload,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import React from 'react';
import { ZodIssue } from 'zod';
import { ZodErrorHelperText } from '~/components/ZodErrorFormHelperText';

const MAX_SIZE = 1024 * 1024; // 1 MB as bytes

export const SshKeyFileUpload: React.FC<{
  onChange: (value: string) => void;
  validationIssues: ZodIssue[];
}> = ({ onChange, validationIssues }) => {
  const [value, setValue] = React.useState('');
  const [filename, setFilename] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [rejectedReason, setRejectedReason] = React.useState<string | undefined>();

  const handleFileInputChange = (_event: DropEvent, file: File) => {
    setFilename(file.name);
    if (file.size > MAX_SIZE) {
      setRejectedReason(`File size (${(file.size / 1024).toFixed(1)} KB) exceeds 1 MB limit`);
    }
  };

  const handleTextChange = (_event: React.ChangeEvent<HTMLTextAreaElement>, val: string) => {
    const trimmedVal = val.trim();
    setValue(trimmedVal);
    onChange(trimmedVal);
  };

  const handleDataChange = (_event: DropEvent, val: string) => {
    const trimmedVal = val.trim();
    onChange(trimmedVal);
    setValue(trimmedVal);
  };

  const handleClear = () => {
    onChange('');
    setFilename('');
    setValue('');
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
        value={value}
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
            if (error.code === 'file-too-large') {
              setRejectedReason(`File exceeds maximum size (${MAX_SIZE / 1024} KB)`);
            } else {
              setRejectedReason(error.message || 'File rejected');
            }
          },
        }}
        validated={validationIssues.length > 0 ? 'error' : 'default'}
        browseButtonText="Upload"
        allowEditingUploadedText
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
      <ZodErrorHelperText zodIssue={validationIssues} />
    </>
  );
};
