import * as React from 'react';
import { Button, Modal, Stack, StackItem } from '@patternfly/react-core';
import CreateNewStorageSection from './CreateNewStorageSection';
import AddExistingStorageSection from './AddExistingStorageSection';
import { useStorageDataObject } from '../../spawner/storage/utils';

import './addStorageModal.scss';

type AddStorageModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AddStorageModal: React.FC<AddStorageModalProps> = ({ isOpen, onClose }) => {
  const [{ creating, existing }, setStorageData] = useStorageDataObject('persistent', 'new');

  const setChecked = (selection: 'existing' | 'creating') => {
    const isCreatingChecked = selection === 'creating';
    setStorageData('creating', { ...creating, enabled: isCreatingChecked });
    setStorageData('existing', { ...existing, enabled: !isCreatingChecked });
  };

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
            isChecked={creating.enabled}
            setChecked={() => setChecked('creating')}
            data={creating}
            setData={(key, value) => setStorageData('creating', { ...creating, [key]: value })}
            availableSize={20}
          />
        </StackItem>
        <StackItem>
          <AddExistingStorageSection
            isChecked={existing.enabled}
            setChecked={() => setChecked('existing')}
            data={existing}
            setData={(data) => setStorageData('existing', data)}
          />
        </StackItem>
      </Stack>
    </Modal>
  );
};

export default AddStorageModal;
