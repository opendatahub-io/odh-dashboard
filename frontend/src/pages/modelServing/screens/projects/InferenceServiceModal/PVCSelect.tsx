import React from 'react';
import { Alert, FormGroup, Label, Stack, StackItem } from '@patternfly/react-core';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getModelServingPVCAnnotations } from '#~/pages/modelServing/utils';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { getPvcAccessMode } from '#~/pages/projects/utils';
import { PVCFields } from './PVCFields';

type PvcSelectProps = {
  pvcs?: PersistentVolumeClaimKind[];
  selectedPVC?: PersistentVolumeClaimKind;
  onSelect: (selection: PersistentVolumeClaimKind) => void;
  setModelUri: (uri: string) => void;
  setIsConnectionValid: (isValid: boolean) => void;
  modelUri?: string;
};

export const PvcSelect: React.FC<PvcSelectProps> = ({
  pvcs,
  selectedPVC,
  onSelect,
  setModelUri,
  setIsConnectionValid,
  modelUri,
}) => {
  const [modelPath, setModelPath] = React.useState('');
  const lastPVCNameRef = React.useRef<string | undefined>();

  React.useEffect(() => {
    if (selectedPVC && selectedPVC.metadata.name !== lastPVCNameRef.current) {
      const { modelPath: annotatedPath } = getModelServingPVCAnnotations(selectedPVC);
      const path = annotatedPath ?? '';
      setModelPath(path);
      setModelUri(generateModelUri(selectedPVC.metadata.name, path));
      lastPVCNameRef.current = selectedPVC.metadata.name;
    } else if (!selectedPVC) {
      setModelPath('');
      setModelUri('');
      lastPVCNameRef.current = undefined;
    }
  }, [selectedPVC, setModelUri]);

  const handleModelPathChange = (newPath: string): void => {
    setModelPath(newPath);
    if (selectedPVC) {
      setModelUri(generateModelUri(selectedPVC.metadata.name, newPath));
    }
  };

  const generateModelUri = (pvcName: string, path: string): string => `pvc://${pvcName}/${path}`;

  React.useEffect(() => {
    const isValidPVCUri = (uri: string): boolean =>
      /^pvc:\/\/[a-zA-Z0-9-]+\/[^/\s][^\s]*$/.test(uri);
    setIsConnectionValid(!!selectedPVC && isValidPVCUri(modelUri ?? ''));
  }, [selectedPVC, modelUri, setIsConnectionValid]);

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      pvcs?.map((pvc) => {
        const displayName = getDisplayNameFromK8sResource(pvc);
        const { modelPath: modelPathAnnotation, modelName } = getModelServingPVCAnnotations(pvc);
        const isModelServingPVC = !!modelPathAnnotation || !!modelName;
        return {
          content: displayName,
          value: pvc.metadata.name,
          dropdownLabel: (
            <>
              {isModelServingPVC && (
                <Label isCompact color="green">
                  {modelName ?? 'unknown model'}
                </Label>
              )}
            </>
          ),
          isSelected: selectedPVC?.metadata.name === pvc.metadata.name,
        };
      }) || [],
    [pvcs, selectedPVC],
  );

  const accessMode = selectedPVC ? getPvcAccessMode(selectedPVC) : undefined;

  return (
    <FormGroup label="Cluster storage" isRequired>
      <Stack hasGutter>
        <StackItem>
          <TypeaheadSelect
            placeholder="Select existing storage"
            selectOptions={options}
            dataTestId="pvc-connection-selector"
            onSelect={(_, selection) => {
              const newlySelectedPVC = pvcs?.find((pvc) => pvc.metadata.name === selection);
              if (newlySelectedPVC) {
                onSelect(newlySelectedPVC);
              }
            }}
          />
        </StackItem>
        {selectedPVC && accessMode !== AccessMode.RWX && (
          <StackItem>
            <Alert variant="warning" title="Warning" isInline>
              This cluster storage access mode is not ReadWriteMany.
            </Alert>
          </StackItem>
        )}
        {selectedPVC && (
          <StackItem>
            <PVCFields
              selectedPVC={selectedPVC}
              modelPath={modelPath}
              setModelUri={handleModelPathChange}
            />
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};
