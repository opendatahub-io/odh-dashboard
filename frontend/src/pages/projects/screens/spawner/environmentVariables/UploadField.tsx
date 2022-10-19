import * as React from 'react';
import { FileUpload } from '@patternfly/react-core';
import { EnvVariable } from '../../../types';

type UploadFieldProps = {
  fieldIndex: string;
  variable: EnvVariable;
  onUpdateVariable: (updatedVariable: EnvVariable) => void;
};

export const UploadField: React.FC<UploadFieldProps> = ({

}) => {
  const [value, setValue] = React.useState('');
  const [filename, setFilename] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFileInputChange = (
    _event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLElement>,
    file: File,
  ) => {
    setFilename(file.name);
  };

  const handleTextOrDataChange = (value: string) => {
    setValue(value);
  };

  const handleClear = (_event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setFilename('');
    setValue('');
  };

  const handleFileReadStarted = (_fileHandle: File) => {
    setIsLoading(true);
  };

  const handleFileReadFinished = (_fileHandle: File) => {
    setIsLoading(false);
  };


  return (
    <div className="odh-notebook-controller__env-var-field">
      <FileUpload
        id="config-map-uploaded"
        type="text"
        value={value}
        filename={filename}
        filenamePlaceholder="Drag and drop a file or upload one"
        onFileInputChange={handleFileInputChange}
        onDataChange={handleTextOrDataChange}
        onTextChange={handleTextOrDataChange}
        onReadStarted={handleFileReadStarted}
        onReadFinished={handleFileReadFinished}
        onClearClick={handleClear}
        isLoading={isLoading}
        allowEditingUploadedText={false}
        browseButtonText="Upload"
      />
    </div>
  );
};

export default UploadField;
