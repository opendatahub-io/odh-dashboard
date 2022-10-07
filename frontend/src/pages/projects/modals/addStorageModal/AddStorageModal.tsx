import * as React from 'react';
import { Button, Modal, Stack, StackItem } from '@patternfly/react-core';
import CreateNewStorageSection from './CreateNewStorageSection';
import AddExistingStorageSection from './AddExistingStorageSection';
import { useCreatingStorageObject, useExistingStorageObject } from '../../utils';

import './addStorageModal.scss';

type AddStorageModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AddStorageModal: React.FC<AddStorageModalProps> = ({ isOpen, onClose }) => {
  const [storageType, setStorageType] = React.useState<'new' | 'existing'>('new');
  const [creatingObject, setCreatingObject] = useCreatingStorageObject();
  const [existingObject, setExistingObject] = useExistingStorageObject();

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
          <CreateNewStorageSection
            isChecked={storageType === 'new'}
            setChecked={() => setStorageType('new')}
            creatingObject={creatingObject}
            setCreatingObject={setCreatingObject}
            availableSize={20}
          />
        </StackItem>
        <StackItem>
          <AddExistingStorageSection
            isChecked={storageType === 'existing'}
            setChecked={() => setStorageType('existing')}
            existingObject={existingObject}
            setExistingObject={setExistingObject}
          />
        </StackItem>
      </Stack>
    </Modal>
  );
};

export default AddStorageModal;
