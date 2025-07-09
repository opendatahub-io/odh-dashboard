import React from 'react';
import {
  HelperText,
  HelperTextItem,
  StackItem,
  Radio,
  Stack,
  FormGroup,
} from '@patternfly/react-core';
import PVSizeField from '#~/pages/projects/components/PVSizeField';
import { MEMORY_UNITS_FOR_SELECTION } from '#~/utilities/valueUnits';
import NIMPVCSelector from './NIMPVCSelector';

// Constants
const DEFAULT_MODEL_PATH = '/mnt/models/cache';

// Types
type PVCMode = 'create-new' | 'use-existing';

type NIMPVCSizeSectionProps = {
  pvcSize: string;
  setPvcSize: (value: string) => void;
  pvcMode: PVCMode;
  setPvcMode: (mode: PVCMode) => void;
  existingPvcName: string;
  setExistingPvcName: (name: string) => void;
  modelPath: string;
  setModelPath: (path: string) => void;
  isEditing?: boolean;
  selectedModel?: string;
  namespace?: string;
};

const NIMPVCSizeSection: React.FC<NIMPVCSizeSectionProps> = ({
  pvcSize,
  setPvcSize,
  pvcMode,
  setPvcMode,
  existingPvcName,
  setExistingPvcName,
  modelPath,
  setModelPath,
  isEditing = false,
  selectedModel = '',
  namespace = '',
}) => (
  <StackItem>
    <Stack hasGutter>
      {/* Only show PVC Mode Selection for new deployments */}
      {!isEditing && (
        <StackItem>
          <FormGroup label="Storage option" fieldId="pvc-mode">
            <Radio
              id="create-new-pvc"
              name="pvc-mode"
              label="Create new storage for model caching"
              description="A new storage volume will be created and models will be downloaded at deployment time."
              isChecked={pvcMode === 'create-new'}
              onChange={() => setPvcMode('create-new')}
            />
            <Radio
              id="use-existing-pvc"
              name="pvc-mode"
              label="Use existing storage with pre-cached models"
              description="Use a storage volume that already contains downloaded models for faster deployment."
              isChecked={pvcMode === 'use-existing'}
              onChange={() => setPvcMode('use-existing')}
            />
          </FormGroup>
        </StackItem>
      )}

      {/* Show PVC Size Field for new deployments with create-new mode OR for editing existing deployments */}
      {((!isEditing && pvcMode === 'create-new') || isEditing) && (
        <StackItem>
          <PVSizeField
            fieldID="pvc-size"
            size={pvcSize}
            setSize={(value: string) => setPvcSize(value)}
            label="NVIDIA NIM storage size"
            options={MEMORY_UNITS_FOR_SELECTION.filter((option) => option.unit !== 'Mi')}
          />
          <HelperText>
            <HelperTextItem>
              Specify the size of the cluster storage instance that will be created to store the
              downloaded NVIDIA NIM.
            </HelperTextItem>
            <HelperTextItem>
              Make sure your storage size is greater than the NIM size specified by NVIDIA.
            </HelperTextItem>
          </HelperText>
        </StackItem>
      )}

      {/* Smart PVC Selector for new deployments with use-existing mode */}
      {!isEditing && pvcMode === 'use-existing' && (
        <StackItem>
          <Stack hasGutter>
            <NIMPVCSelector
              selectedModel={selectedModel}
              namespace={namespace}
              existingPvcName={existingPvcName}
              setExistingPvcName={setExistingPvcName}
              modelPath={modelPath}
              setModelPath={setModelPath}
            />
          </Stack>
        </StackItem>
      )}
    </Stack>
  </StackItem>
);

export default NIMPVCSizeSection;
