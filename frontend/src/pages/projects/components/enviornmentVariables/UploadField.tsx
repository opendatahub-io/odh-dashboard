import * as React from 'react';
import { FileUpload } from '@patternfly/react-core';
import { EnvVarType, VariableRow } from './types';

type UploadFieldProps = {
  fieldIndex: string;
  variable: EnvVarType;
  variableRow: VariableRow;
  onUpdateVariable: (updatedVariable: EnvVarType) => void;
};

export const UploadField: React.FC<UploadFieldProps> = ({
  fieldIndex,
  variable,
  onUpdateVariable,
  variableRow,
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

  const validated = variableRow.errors[variable.name] !== undefined ? 'error' : 'default';
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
