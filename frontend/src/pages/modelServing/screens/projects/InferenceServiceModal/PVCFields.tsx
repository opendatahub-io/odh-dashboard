import React from 'react';
import {
  FormGroup,
  InputGroupText,
  TextInput,
  InputGroupItem,
  InputGroup,
} from '@patternfly/react-core';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { trimInputOnBlur, trimInputOnPaste } from '#~/concepts/connectionTypes/utils';

type PVCFieldsProps = {
  selectedPVC: PersistentVolumeClaimKind;
  setModelUri: (uri: string) => void;
  modelPath?: string;
};

export const PVCFields: React.FC<PVCFieldsProps> = ({ selectedPVC, setModelUri, modelPath }) => (
  <FormGroup label="Model path" isRequired>
    <InputGroup>
      <InputGroupText>pvc://{selectedPVC.metadata.name}/</InputGroupText>
      <InputGroupItem isFill>
        <TextInput
          id="pvc-model-path"
          aria-label="Model path"
          data-testid="pvc-model-path"
          type="text"
          value={modelPath ?? ''}
          isRequired
          onChange={(e, value: string) => {
            setModelUri(value.trim());
          }}
          onBlur={trimInputOnBlur(modelPath, setModelUri)}
          onPaste={trimInputOnPaste(modelPath, setModelUri)}
        />
      </InputGroupItem>
    </InputGroup>
  </FormGroup>
);
