import * as React from 'react';
import { FormGroup, TextInput } from '@patternfly/react-core';
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
      helperText="Can consist of lower case letters and dashes"
      helperTextInvalid={mountPath.error}
      label="Mount folder"
      validated={mountPath.error ? 'error' : 'success'}
    >
      <TextInput
        isRequired
        aria-label="mount-path-folder-value"
        type="text"
        value={mountPath.value}
        placeholder="data"
        onChange={(value) => {
          let error = '';
          if (value.length === 0) {
            error = 'Required';
          } else if (!/^[a-z-]+$/.test(value)) {
            error = 'Must only consist of lower case letters and dashes';
          } else if (inUseMountPaths.includes(value)) {
            error = 'Mount folder is already in use for this workbench';
          }
          setMountPath({ value, error });
        }}
      />
    </FormGroup>
  );
};

export default MountPathField;
