import * as React from 'react';
import { FileUpload } from '@patternfly/react-core';
import { FileField } from '~/concepts/connectionTypes/types';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';

type Props = {
  field: FileField;
  isPreview?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

const FileFormField: React.FC<Props> = ({ field, isPreview, onChange, value }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [filename, setFilename] = React.useState('');
  const readOnly = isPreview || field.properties.defaultReadOnly;
  return (
    <DataFormFieldGroup field={field} isPreview={!!isPreview} renderDefaultValue={false}>
      {(id) => (
        <FileUpload
          id={id}
          name={id}
          type="text"
          isLoading={isLoading}
          value={
            isPreview || field.properties.defaultReadOnly ? field.properties.defaultValue : value
          }
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
      )}
    </DataFormFieldGroup>
  );
};

export default FileFormField;
