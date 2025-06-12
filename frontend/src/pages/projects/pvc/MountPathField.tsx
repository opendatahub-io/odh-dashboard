import * as React from 'react';
import {
  FormGroup,
  InputGroup,
  InputGroupText,
  TextInput,
  InputGroupItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { MountPath } from '#~/pages/projects/types';

type MountPathFieldProps = {
  inUseMountPaths: string[];
  mountPath: MountPath;
  setMountPath: (mountPath: MountPath) => void;
};

const MountPathField: React.FC<MountPathFieldProps> = ({
  inUseMountPaths,
  mountPath,
  setMountPath,
}) => (
  <FormGroup isRequired label="Mount folder name">
    <InputGroup>
      <InputGroupText isPlain>/</InputGroupText>
      <InputGroupItem isFill>
        <TextInput
          isRequired
          data-testid="mount-path-folder-value"
          aria-label="mount-path-folder-value"
          type="text"
          value={mountPath.value}
          placeholder="eg. data"
          validated={mountPath.error ? 'error' : 'default'}
          onChange={(e, value) => {
            let error = '';
            if (value.length === 0) {
              error = 'Enter a path to a model or folder. This path cannot point to a root folder.';
            } else if (!/^[a-z-]+\/?$/.test(value)) {
              error = 'Must only consist of lowercase letters and dashes.';
            } else if (inUseMountPaths.includes(`/${value}`)) {
              error = 'Mount folder is already in use for this workbench.';
            }
            setMountPath({ value, error });
          }}
        />
      </InputGroupItem>
    </InputGroup>
    <FormHelperText>
      <HelperText>
        <HelperTextItem
          variant={mountPath.error ? 'error' : 'default'}
          data-testid="mount-path-folder-helper-text"
        >
          {mountPath.error || 'Must consist of lowercase letters and dashes.'}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </FormGroup>
);

export default MountPathField;
