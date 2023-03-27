import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, TextInput } from '@patternfly/react-core';

type DataConnectionFolderPathFieldProps = {
  folderPath: string;
  setFolderPath: (folderPath: string) => void;
};

const DataConnectionFolderPathField: React.FC<DataConnectionFolderPathFieldProps> = ({
  folderPath,
  setFolderPath,
}) => {
  const [error, setError] = React.useState('');

  const formatLeadingSlash = (value: string) => {
    if (folderPath === '/') {
      return '';
    }
    return value;
  };
  return (
    <FormGroup
      helperTextInvalid={error}
      validated={error ? 'error' : 'default'}
      fieldId="folder-path"
      label="Folder path"
    >
      <InputGroup>
        <InputGroupText variant="plain">/</InputGroupText>
        <TextInput
          aria-label="folder-path"
          type="text"
          value={formatLeadingSlash(folderPath)}
          placeholder="eg. data"
          onChange={(value) => {
            const cleanedPath = value.replace(/^\/+/, '');
            let error = '';
            if (!/^[a-zA-Z0-9.\-_*'()/]+$/.test(cleanedPath)) {
              error =
                "Must only consist of letters (a-z, A-Z), numbers (0-9), periods (.), hyphens (-), \
                 underscores (_), asterisks (*), single quotes ('), and parentheses ()";
            }
            setFolderPath(cleanedPath.length === 0 ? '/' : cleanedPath);
            setError(error);
          }}
        />
      </InputGroup>
    </FormGroup>
  );
};

export default DataConnectionFolderPathField;
