import React from 'react';
import { 
  HelperText, 
  HelperTextItem, 
  StackItem,
  Radio,
  Stack,
  FormGroup,
  TextInput  
} from '@patternfly/react-core';
import PVSizeField from '#~/pages/projects/components/PVSizeField';
import { MEMORY_UNITS_FOR_SELECTION } from '#~/utilities/valueUnits';

// Add new type for PVC mode
type PVCMode = 'create-new' | 'use-existing';

type NIMPVCSizeSectionProps = {
  pvcSize: string;
  setPvcSize: (value: string) => void;
  pvcMode: PVCMode;
  setPvcMode: (mode: PVCMode) => void;
  // Add these new props
  existingPvcName: string;
  setExistingPvcName: (name: string) => void;
  modelPath: string;
  setModelPath: (path: string) => void;
};

const NIMPVCSizeSection: React.FC<NIMPVCSizeSectionProps> = ({ 
  pvcSize, 
  setPvcSize,
  pvcMode,
  setPvcMode,
  existingPvcName,
  setExistingPvcName,
  modelPath,
  setModelPath
}) => (
  <StackItem>
    <Stack hasGutter>
      {/* New: PVC Mode Selection */}
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
      {/* Existing: PVC Size Field - only show when creating new */}
      {pvcMode === 'create-new' && (
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
      {pvcMode === 'use-existing' && (
        <StackItem>
          <Stack hasGutter>
            <StackItem>
              <FormGroup 
                label="Existing storage name" 
                fieldId="existing-pvc-name"
                isRequired
              >
                <TextInput
                  id="existing-pvc-name"
                  value={existingPvcName}
                  onChange={(_event, value) => setExistingPvcName(value)}
                  placeholder="Enter PVC name (e.g., nim-pvc-f75f401f3966fvfnhxw6yvfc)"
                />
              </FormGroup>
              <HelperText>
                <HelperTextItem>
                  Enter the exact name of the Persistent Volume Claim (PVC) that contains your pre-downloaded models.
                </HelperTextItem>
                <HelperTextItem>
                  The PVC must exist in the same project/namespace and be accessible to the deployment.
                </HelperTextItem>
              </HelperText>
            </StackItem>
            
            <StackItem>
              <FormGroup 
                label="Model path in storage" 
                fieldId="model-path"
                isRequired
              >
                <TextInput
                  id="model-path"
                  value={modelPath}
                  onChange={(_event, value) => setModelPath(value)}
                  placeholder="/mnt/models/cache"
                />
              </FormGroup>
              <HelperText>
                <HelperTextItem>
                  Specify the directory path within the storage where your model files are located.
                </HelperTextItem>
                <HelperTextItem>
                  This path will be mounted into the container and should contain the model files that NIM expects.
                </HelperTextItem>
              </HelperText>
            </StackItem>
          </Stack>
        </StackItem>
      )}
    </Stack>
  </StackItem>
);

export default NIMPVCSizeSection;