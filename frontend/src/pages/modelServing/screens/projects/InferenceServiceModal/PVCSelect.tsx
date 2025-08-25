import React from 'react';
import { Alert, FormGroup, Stack, StackItem } from '@patternfly/react-core';
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
  onSelect: (selection?: PersistentVolumeClaimKind | undefined) => void;
  setModelUri: (uri: string) => void;
  setIsConnectionValid: (isValid: boolean) => void;
  pvcNameFromUri?: string;
  existingUriOption?: string;
};

export const PvcSelect: React.FC<PvcSelectProps> = ({
  pvcs,
  selectedPVC,
  onSelect,
  setModelUri,
  setIsConnectionValid,
  pvcNameFromUri,
  existingUriOption,
}) => {
  // Check whether the PVC from URI exists
  const pvcExists = React.useMemo(() => {
    if (!pvcNameFromUri || !pvcs) {
      return false; // If no PVC name from URI or no PVCs loaded, assume it doesn't exist
    }
    return Boolean(pvcs.some((pvc) => pvc.metadata.name === pvcNameFromUri) && pvcNameFromUri);
  }, [pvcs, pvcNameFromUri]);

  // Whether to show the PVC not founderror
  const showPVCError = React.useMemo(
    () => Boolean(existingUriOption && !pvcExists && pvcNameFromUri && !selectedPVC),
    [existingUriOption, pvcExists, pvcNameFromUri, selectedPVC],
  );

  const options: TypeaheadSelectOption[] | undefined = React.useMemo(
    () =>
      pvcs?.map((pvc) => {
        const displayName = getDisplayNameFromK8sResource(pvc);
        const { modelPath: modelPathAnnotation, modelName } = getModelServingPVCAnnotations(pvc);
        const isModelServingPVC = !!modelPathAnnotation || !!modelName;
        return {
          content: displayName,
          value: pvc.metadata.name,
          isSelected:
            selectedPVC?.metadata.name === pvc.metadata.name ||
            (pvc.metadata.name === pvcNameFromUri && !pvcExists && !selectedPVC),
          description: isModelServingPVC
            ? `Stored model: ${modelName ?? 'Model name not specified'}`
            : undefined,
        };
      }),
    [pvcs, selectedPVC, pvcNameFromUri, pvcExists],
  );
  const additionalOptions = React.useMemo(() => {
    if (!pvcExists && pvcNameFromUri) {
      return [
        ...(options ?? []),
        {
          content: pvcNameFromUri || '',
          value: pvcNameFromUri || '',
          isSelected: !selectedPVC,
          description: 'Cluster storage not found',
        },
      ];
    }
    return options;
  }, [options, pvcNameFromUri, pvcExists, selectedPVC]);

  const accessMode = selectedPVC ? getPvcAccessMode(selectedPVC) : undefined;

  return (
    <FormGroup label="Cluster storage" isRequired>
      <Stack hasGutter>
        <StackItem>
          <TypeaheadSelect
            placeholder="Select existing storage"
            selectOptions={additionalOptions ?? []}
            selected={
              selectedPVC?.metadata.name ||
              (!pvcExists && pvcNameFromUri ? pvcNameFromUri : undefined)
            }
            dataTestId="pvc-connection-selector"
            onSelect={(_, selection) => {
              const newlySelectedPVC = pvcs?.find((pvc) => pvc.metadata.name === selection);
              onSelect(newlySelectedPVC);
            }}
          />
        </StackItem>
        {selectedPVC && accessMode !== AccessMode.RWX && (
          <StackItem>
            <Alert variant="warning" title="Storage access mode warning" isInline>
              The access mode of the selected cluster storage is not <strong>ReadWriteMany</strong>.
              This can prevent replicas from working as expected.
            </Alert>
          </StackItem>
        )}
        {showPVCError && !selectedPVC && (
          <StackItem>
            <Alert variant="warning" title="Cannot access cluster storage" isInline>
              The selected <strong>{pvcNameFromUri}</strong> cluster storage has been deleted or
              cannot be reached. Before redeploying the model, select or create a different source
              model location.
            </Alert>
          </StackItem>
        )}
        {(selectedPVC || pvcNameFromUri) && (
          <StackItem>
            <PVCFields
              selectedPVC={selectedPVC}
              selectedPVCName={selectedPVC?.metadata.name || pvcNameFromUri || ''}
              existingUriOption={existingUriOption}
              setModelUri={setModelUri}
              setIsConnectionValid={setIsConnectionValid}
            />
          </StackItem>
        )}
      </Stack>
    </FormGroup>
  );
};
