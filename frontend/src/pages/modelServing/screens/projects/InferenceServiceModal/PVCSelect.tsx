import React from 'react';
import { Alert, FormGroup, Stack, StackItem } from '@patternfly/react-core';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { getModelServingPVCAnnotations } from '#~/pages/modelServing/utils';
import { getModelPathFromUri } from '#~/pages/modelServing/screens/projects/utils';
import { AccessMode } from '#~/pages/storageClasses/storageEnums';
import { getPvcAccessMode } from '#~/pages/projects/utils';
import { PVCFields } from './PVCFields';

type PvcSelectProps = {
  pvcs?: PersistentVolumeClaimKind[];
  selectedPVC?: PersistentVolumeClaimKind;
  onSelect: (selection: PersistentVolumeClaimKind) => void;
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
  // Get the model path from the URI if it's a PVC URI
  const initialModelPath = React.useMemo(() => {
    if (existingUriOption) {
      return getModelPathFromUri(existingUriOption);
    }
    return undefined;
  }, [existingUriOption]);

  // Check whether the PVC from URI exists
  const pvcExists = React.useMemo(() => {
    if (!pvcNameFromUri || !pvcs) {
      return false; // If no PVC name from URI or no PVCs loaded, assume it doesn't exist
    }
    return Boolean(pvcs.some((pvc) => pvc.metadata.name === pvcNameFromUri) && pvcNameFromUri);
  }, [pvcs, pvcNameFromUri]);

  const [modelPath, setModelPath] = React.useState(initialModelPath ?? '');
  const getModelPath = (pvc: PersistentVolumeClaimKind): string => {
    const { modelPath: annotatedPath } = getModelServingPVCAnnotations(pvc);
    return annotatedPath ?? '';
  };

  // Whether the model path has been prefilled
  const didInitialPrefill = React.useRef(false);

  // Whether to show the PVC not founderror
  const showPVCError = React.useMemo(
    () => Boolean(existingUriOption && !pvcExists && pvcNameFromUri && !selectedPVC),
    [existingUriOption, pvcExists, pvcNameFromUri, selectedPVC],
  );

  // Create a local copy of pvcs with the missing PVC added if needed
  const localPvcs = React.useMemo(() => {
    // Only add the missing PVC if it's not present in the list of PVCs
    if (
      !pvcExists &&
      pvcNameFromUri &&
      pvcs &&
      !pvcs.find((pvc) => pvc.metadata.name === pvcNameFromUri)
    ) {
      return [
        ...pvcs,
        // Mock PVC to populate the dropdown with the missing PVC
        {
          metadata: {
            name: pvcNameFromUri,
            namespace: 'default',
            // Add the model path annotation if the uri has a model path
            ...(initialModelPath && {
              annotations: {
                'dashboard.opendatahub.io/model-path': initialModelPath,
                // Don't show the model storage description for the missing PVC
                'dont-show-model-storage-description': 'true',
              },
            }),
          },
          apiVersion: 'v1',
          kind: 'PersistentVolumeClaim',
          spec: {
            // RWX access mode to ignore the access mode error
            accessModes: [AccessMode.RWX],
            resources: {
              requests: {
                storage: '',
              },
            },
            volumeMode: 'Filesystem' as const,
          },
        },
      ];
    }
    // Otherwise, return the original list of PVCs
    return pvcs || [];
  }, [pvcs, pvcExists, pvcNameFromUri, initialModelPath]);

  // Handle the PVC select change for prefilling and updating the model path
  const handlePVCSelectChange = (newlySelectedPVC?: PersistentVolumeClaimKind) => {
    if (newlySelectedPVC) {
      if (!didInitialPrefill.current && initialModelPath !== undefined && pvcExists) {
        setModelPath(initialModelPath);
        didInitialPrefill.current = true;
      } else {
        setModelPath(getModelPath(newlySelectedPVC));
      }
    } else if (!pvcExists && pvcNameFromUri && initialModelPath !== undefined) {
      // Handle case where PVC doesn't exist but we have an initial model path from the URI
      if (!didInitialPrefill.current) {
        setModelPath(initialModelPath);
        didInitialPrefill.current = true;
      }
    }
  };

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      localPvcs.map((pvc) => {
        const displayName = getDisplayNameFromK8sResource(pvc);
        const { modelPath: modelPathAnnotation, modelName } = getModelServingPVCAnnotations(pvc);
        const isModelServingPVC =
          (!!modelPathAnnotation || !!modelName) &&
          !pvc.metadata.annotations?.['dont-show-model-storage-description']; // Don't show the model storage description for the missing PVC
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
    [localPvcs, selectedPVC, pvcNameFromUri, pvcExists],
  );

  const accessMode = selectedPVC ? getPvcAccessMode(selectedPVC) : undefined;

  return (
    <FormGroup label="Cluster storage" isRequired>
      <Stack hasGutter>
        <StackItem>
          <TypeaheadSelect
            placeholder="Select existing storage"
            selectOptions={options}
            selected={
              selectedPVC?.metadata.name ||
              (!pvcExists && pvcNameFromUri ? pvcNameFromUri : undefined)
            }
            dataTestId="pvc-connection-selector"
            onSelect={(_, selection) => {
              const newlySelectedPVC = localPvcs.find((pvc) => pvc.metadata.name === selection);
              handlePVCSelectChange(newlySelectedPVC);
              if (newlySelectedPVC) {
                onSelect(newlySelectedPVC);
              }
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
