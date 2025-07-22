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
  initialModelPath?: string;
};

export const PvcSelect: React.FC<PvcSelectProps> = ({
  pvcs,
  selectedPVC,
  onSelect,
  setModelUri,
  setIsConnectionValid,
  initialModelPath,
}) => {
  const [modelPath, setModelPath] = React.useState(initialModelPath ?? '');
  const getModelPath = (pvc: PersistentVolumeClaimKind): string => {
    const { modelPath: annotatedPath } = getModelServingPVCAnnotations(pvc);
    return annotatedPath ?? '';
  };

  const didInitialPrefill = React.useRef(false);

  React.useEffect(() => {
    if (selectedPVC) {
      if (!didInitialPrefill.current && initialModelPath !== undefined) {
        setModelPath(initialModelPath);
        didInitialPrefill.current = true;
      } else {
        setModelPath(getModelPath(selectedPVC));
      }
    }
    // Only run when selectedPVC changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPVC]);

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      pvcs?.map((pvc) => {
        const displayName = getDisplayNameFromK8sResource(pvc);
        const { modelPath: modelPathAnnotation, modelName } = getModelServingPVCAnnotations(pvc);
        const isModelServingPVC = !!modelPathAnnotation || !!modelName;
        return {
          content: displayName,
          value: pvc.metadata.name,
          dropdownLabel: isModelServingPVC ? (
            <Label isCompact color="green">
              {modelName ?? 'unknown model'}
            </Label>
          ) : undefined,
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
            selected={selectedPVC?.metadata.name}
            dataTestId="pvc-connection-selector"
            onSelect={(_, selection) => {
              const newlySelectedPVC = pvcs?.find((pvc) => pvc.metadata.name === selection);
              if (newlySelectedPVC) {
                onSelect(newlySelectedPVC);
                setModelPath(getModelPath(newlySelectedPVC));
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
              setModelPath={setModelPath}
              setModelUri={setModelUri}
              setIsConnectionValid={setIsConnectionValid}
            />
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};
