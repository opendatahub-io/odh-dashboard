import * as React from 'react';
import { FileUpload } from '@patternfly/react-core';
import { FileField } from '~/concepts/connectionTypes/types';
import { FieldProps } from '~/concepts/connectionTypes/fields/types';

const FileFormField: React.FC<FieldProps<FileField>> = ({
  id,
  field,
  mode,
  onChange,
  value,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  const [isLoading, setIsLoading] = React.useState(false);
  const [filename, setFilename] = React.useState('');
  const readOnly = isPreview || field.properties.defaultReadOnly;
  return (
    <FileUpload
      id={id}
      name={id}
      data-testid={dataTestId}
      type="text"
      isLoading={isLoading}
      value={isPreview || field.properties.defaultReadOnly ? field.properties.defaultValue : value}
      filename={filename}
      allowEditingUploadedText
      isReadOnly={readOnly}
      isDisabled={readOnly}
      filenamePlaceholder={readOnly ? '' : 'Drag and drop a file or upload one'}
      browseButtonText="Upload"
      clearButtonText="Clear"
      onDataChange={isPreview || !onChange ? undefined : (e, content) => onChange(content)}
      onFileInputChange={(_e, file) => setFilename(file.name)}
      onReadStarted={() => {
        setIsLoading(true);
      }}
      onReadFinished={() => {
        setIsLoading(false);
      }}
    />
  );
};

export default FileFormField;
