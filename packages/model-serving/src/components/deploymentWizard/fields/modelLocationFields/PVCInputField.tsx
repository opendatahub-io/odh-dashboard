import React from 'react';
import {
  FormGroup,
  InputGroupText,
  TextInput,
  InputGroupItem,
  InputGroup,
  HelperText,
  HelperTextItem,
  FormHelperText,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';
import { getModelServingPVCAnnotations } from '@odh-dashboard/internal/pages/modelServing/utils';
import {
  getModelPathFromUri,
  getPVCNameFromURI,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';

type PVCInputFieldProps = {
  selectedPVC?: PersistentVolumeClaimKind;
  selectedPVCName: string;
  setModelUri: (uri: string) => void;
  existingUriOption?: string;
  setIsConnectionValid: (isValid: boolean) => void;
};

export const PVCInputField: React.FC<PVCInputFieldProps> = ({
  selectedPVC,
  selectedPVCName,
  setModelUri,
  existingUriOption,
  setIsConnectionValid,
}) => {
  // Get the model path from the existing URI, if it's a PVC URI
  const initialModelPath = React.useMemo(() => {
    if (existingUriOption) {
      return getModelPathFromUri(existingUriOption);
    }
    return undefined;
  }, [existingUriOption]);

  // Get the model path from the PVC annotation
  const getModelPath = (pvc?: PersistentVolumeClaimKind): string => {
    if (!pvc) {
      return '';
    }
    const { modelPath: annotatedPath } = getModelServingPVCAnnotations(pvc);
    return annotatedPath ?? '';
  };

  // Get the PVC name from the URI
  const pvcNameFromUri = React.useMemo(() => {
    if (existingUriOption) {
      return getPVCNameFromURI(existingUriOption);
    }
    return undefined;
  }, [existingUriOption]);

  // Whether the model path has been prefilled on initial load
  const didInitialPrefill = React.useRef(false);

  // Compute the model path based on selectedPVC and prefill logic
  const computedModelPath = React.useMemo(() => {
    if (
      !didInitialPrefill.current &&
      initialModelPath &&
      selectedPVC?.metadata.name === pvcNameFromUri
    ) {
      // Initial mount with original PVC: use URI path (what it was deployed with)
      didInitialPrefill.current = true;
      return initialModelPath;
    }
    if (selectedPVC) {
      // Any other PVC selection: use PVC annotation path
      return getModelPath(selectedPVC);
    }
    if (existingUriOption) {
      // If the selected PVC doesn't exist, use the URI path (what it was deployed with)
      return getModelPathFromUri(existingUriOption);
    }
    return '';
  }, [selectedPVC, initialModelPath, pvcNameFromUri]);

  // If the user has manually edited the path, use the user input path instead of the computed path
  const [userHasEdited, setUserHasEdited] = React.useState(false);
  // User input path
  const [userModelPath, setUserModelPath] = React.useState('');
  // The name of the previously selected PVC
  const [lastPVCName, setLastPVCName] = React.useState(selectedPVC?.metadata.name);

  // Reset userHasEdited when PVC changes
  if (selectedPVC?.metadata.name !== lastPVCName) {
    setUserHasEdited(false);
    setLastPVCName(selectedPVC?.metadata.name);
  }

  // Use computed path unless user has manually edited
  const modelPath = userHasEdited ? userModelPath : computedModelPath;
  const pathRegex = React.useMemo(() => /^pvc:\/\/[a-zA-Z0-9-]+\/[^/\s][^\s]*$/, []);
  const generateModelUri = (pvcName: string, path: string): string => `pvc://${pvcName}/${path}`;

  const validateModelPath = (newPath: string): boolean => {
    const uri = generateModelUri(selectedPVCName, newPath);
    return pathRegex.test(uri);
  };

  const handlePathChange = (newPath: string) => {
    const trimmedPath = newPath.trim();
    setUserModelPath(trimmedPath);
    setUserHasEdited(true);
    if (trimmedPath && validateModelPath(trimmedPath)) {
      setModelUri(generateModelUri(selectedPVCName, trimmedPath));
      setIsConnectionValid(true);
    } else {
      setModelUri('');
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
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Model path" isRequired>
          <InputGroup>
            <InputGroupText>pvc://{selectedPVCName}/</InputGroupText>
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
                onBlur={() => {
                  const trimmed = modelPath.trim();
                  if (trimmed !== modelPath) {
                    handlePathChange(trimmed);
                  }
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text').trim();
                  handlePathChange(pastedText);
                  e.preventDefault();
                }}
              />
            </InputGroupItem>
          </InputGroup>
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              Enter a path to your model or a folder containing your model. The path cannot point to
              a root folder.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </StackItem>
    </Stack>
  );
};
