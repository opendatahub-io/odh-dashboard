import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, TextInput } from '@patternfly/react-core';

type DataConnectionFolderPathFieldProps = {
  folderPath: string;
  setFolderPath: (folderPath: string) => void;
};

const DataConnectionFolderPathField: React.FC<DataConnectionFolderPathFieldProps> = ({
  folderPath,
  setFolderPath,
}) => (
  <FormGroup fieldId="folder-path" label="Folder path">
    <InputGroup>
      <InputGroupText variant="plain">/</InputGroupText>
      <TextInput
        aria-label="folder-path"
        type="text"
        value={folderPath}
        placeholder="eg. data"
        onChange={(value) => setFolderPath(value)}
      />
    </InputGroup>
  </FormGroup>
);

export default DataConnectionFolderPathField;
