import {
  DropEvent,
  FileUpload,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import React from 'react';

export const PemFileUpload: React.FC<{ onChange: (value: string) => void }> = ({ onChange }) => {
  const [value, setValue] = React.useState('');
  const [filename, setFilename] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRejected, setIsRejected] = React.useState(false);

  const handleFileInputChange = (_event: DropEvent, file: File) => {
    setFilename(file.name);
  };

  const handleTextChange = (_event: React.ChangeEvent<HTMLTextAreaElement>, val: string) => {
    setValue(val);
  };

  const handleDataChange = (_event: DropEvent, val: string) => {
    onChange(val);
    setValue(val);
  };

  const handleClear = () => {
    onChange('');
    setFilename('');
    setValue('');
    setIsRejected(false);
  };

  const handleFileRejected = () => {
    setIsRejected(true);
  };

  const handleFileReadStarted = () => {
    setIsLoading(true);
  };

  const handleFileReadFinished = () => {
    setIsLoading(false);
  };

  return (
    <>
      <FileUpload
        id="pemFileUpload"
        data-testid="new-certificate-upload"
        type="text"
        isReadOnly
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
          accept: { 'text/pem': ['.pem'] },
          onDropRejected: handleFileRejected,
        }}
        browseButtonText="Upload"
      />
      <FormHelperText>
        <HelperText isLiveRegion>
          <HelperTextItem
            id="restricted-file-example-helpText"
            data-testid="restricted-file-example-helpText"
            variant={isRejected ? 'error' : 'default'}
          >
            {isRejected ? 'Must be a PEM file' : 'Upload a PEM file'}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </>
  );
};
