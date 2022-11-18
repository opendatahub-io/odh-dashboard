import * as React from 'react';
import { FormGroup, InputGroup, InputGroupText, TextInput } from '@patternfly/react-core';
import { MountPath } from '../types';

type MountPathFieldProps = {
  inUseMountPaths: string[];
  mountPath: MountPath;
  setMountPath: (mountPath: MountPath) => void;
};

const MountPathField: React.FC<MountPathFieldProps> = ({
  inUseMountPaths,
  mountPath,
  setMountPath,
}) => {
  return (
    <FormGroup
      isRequired
      helperText="Must consist of lower case letters and dashes"
      helperTextInvalid={mountPath.error}
      label="Mount folder name"
      validated={mountPath.error ? 'error' : 'default'}
    >
      <InputGroup>
        <InputGroupText variant="plain">/</InputGroupText>
        <TextInput
          isRequired
          aria-label="mount-path-folder-value"
          type="text"
          value={mountPath.value}
          placeholder="eg. data"
          onChange={(value) => {
            let error = '';
            if (value.length === 0) {
              error = 'Required';
            } else if (!/^[a-z-]+$/.test(value)) {
              error = 'Must only consist of lower case letters and dashes';
            } else if (inUseMountPaths.includes(`/${value}`)) {
              error = 'Mount folder is already in use for this workbench';
            }
            setMountPath({ value, error });
          }}
        />
      </InputGroup>
    </FormGroup>
  );
};

export default MountPathField;
