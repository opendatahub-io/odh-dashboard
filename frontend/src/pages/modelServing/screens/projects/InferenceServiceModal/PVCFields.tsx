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
  modelPath: string;
  setIsConnectionValid: (isValid: boolean) => void;
  setModelPath: (path: string) => void;
};

export const PVCFields: React.FC<PVCFieldsProps> = ({
  selectedPVC,
  setModelUri,
  modelPath,
  setModelPath,
  setIsConnectionValid,
}) => {
  const pathRegex = React.useMemo(() => /^pvc:\/\/[a-zA-Z0-9-]+\/[^/\s][^\s]*$/, []);
  const generateModelUri = (pvcName: string, path: string): string => `pvc://${pvcName}/${path}`;

  const validateModelPath = (newPath: string): boolean => {
    const uri = generateModelUri(selectedPVC.metadata.name, newPath);
    return pathRegex.test(uri);
  };

  const handlePathChange = (newPath: string) => {
    const trimmedPath = newPath.trim();
    setModelPath(trimmedPath);
    if (trimmedPath && validateModelPath(trimmedPath)) {
      setModelUri(generateModelUri(selectedPVC.metadata.name, trimmedPath));
      setIsConnectionValid(true);
    } else {
      setIsConnectionValid(false);
    }
  };

  // Validate model path when modelPath changes / is prefilled
  React.useEffect(() => {
    handlePathChange(modelPath);
    // Only run when selectedPVC or modelPath changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPVC, modelPath]);

  return (
    <FormGroup label="Model path" isRequired>
      <InputGroup>
        <InputGroupText>pvc://{selectedPVC.metadata.name}/</InputGroupText>
        <InputGroupItem isFill>
          <TextInput
            id="folder-path"
            aria-label="Model path"
            data-testid="folder-path"
            type="text"
            value={modelPath}
            isRequired
            onChange={(e, value: string) => {
              handlePathChange(value);
            }}
            onBlur={trimInputOnBlur(modelPath, setModelUri)}
            onPaste={trimInputOnPaste(modelPath, setModelUri)}
          />
        </InputGroupItem>
      </InputGroup>
    </FormGroup>
  );
};
