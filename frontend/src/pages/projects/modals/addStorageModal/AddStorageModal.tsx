import * as React from 'react';
import { Button, Modal, Radio, Stack, StackItem } from '@patternfly/react-core';
import { DEFAULT_PVC_SIZE } from './const';
import CreateNewStorageForm from './CreateNewStorageForm';
import AddExistingStorageForm from './AddExistingStorageForm';
import { ExistingStorage } from './types';

import './addStorageModal.scss';

type AddStorageModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AddStorageModal: React.FC<AddStorageModalProps> = ({ isOpen, onClose }) => {
  const [storageType, setStorageType] = React.useState<'create' | 'existing'>('create');

  // states for creating new PV
  const [name, setName] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [size, setSize] = React.useState<string>(DEFAULT_PVC_SIZE);
  const [workbenchSelections, setWorkbenchSelections] = React.useState<string[]>([]);

  // states for adding existing PV
  const [existingSelections, setExistingSelections] = React.useState<ExistingStorage>({
    project: undefined,
    storage: undefined,
  });

  return (
    <Modal
      title="Add storage"
      description="Add and connect storage to your cluster"
      variant="medium"
      isOpen={isOpen}
      onClose={onClose}
      showClose
      actions={[
        <Button key="add-storage-confirm" variant="primary">
          Add storage
        </Button>,
        <Button key="add-storage-cancel" variant="secondary" onClick={onClose}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          <Radio
            className="radio-fix-body-width-50"
            id="create-new-storage-radio"
            name="create-new-storage-radio"
            label="Create new PV"
            isChecked={storageType === 'create'}
            onChange={() => setStorageType('create')}
            body={
              storageType === 'create' && (
                <CreateNewStorageForm
                  name={name}
                  setName={setName}
                  description={description}
                  setDescription={setDescription}
                  size={size}
                  setSize={setSize}
                  selections={workbenchSelections}
                  setSelections={setWorkbenchSelections}
                />
              )
            }
          />
        </StackItem>
        <StackItem>
          <Radio
            className="radio-fix-body-width-50"
            id="add-existing-storage-radio"
            name="add-existing-storage-radio"
            label="Add exisiting PV"
            isChecked={storageType === 'existing'}
            onChange={() => setStorageType('existing')}
            body={
              storageType === 'existing' && (
                <AddExistingStorageForm
                  selections={existingSelections}
                  setSelections={setExistingSelections}
                />
              )
            }
          />
        </StackItem>
      </Stack>
    </Modal>
  );
};

export default AddStorageModal;
