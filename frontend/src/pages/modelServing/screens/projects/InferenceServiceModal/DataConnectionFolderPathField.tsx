import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, TextInput } from '@patternfly/react-core';
import { MountPath } from '~/pages/projects/types';

type DataConnectionFolderPathFieldProps = {
  inUseMountPaths: string[];
  mountPath: MountPath;
  setMountPath: (mountPath: MountPath) => void;
};

const DataConnectionFolderPathField: React.FC<DataConnectionFolderPathFieldProps> = ({
  inUseMountPaths,
  mountPath,
  setMountPath,
}) => (
  <FormGroup
    helperText="Must consist of lower case letters and dashes"
    helperTextInvalid={mountPath.error}
    validated={mountPath.error ? 'error' : 'default'}
    fieldId="folder-path"
    label="Folder path"
  >
    <InputGroup>
      <InputGroupText variant="plain">/</InputGroupText>
      <TextInput
        aria-label="folder-path"
        type="text"
        value={mountPath.value}
        placeholder="eg. data"
        onChange={(value) => {
          let error = '';
          if (!/^[a-zA-Z0-9\.\-_*'()]+$/.test(value)) {
            error = 'Must only consist of ';
          }
          setMountPath({ value, error });
        }}
      />
    </InputGroup>
  </FormGroup>
);

export default DataConnectionFolderPathField;
