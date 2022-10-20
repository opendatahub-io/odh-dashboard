import * as React from 'react';
import { Button, Modal, Stack, StackItem } from '@patternfly/react-core';
import CreateNewStorageSection from './CreateNewStorageSection';
import AddExistingStorageSection from './AddExistingStorageSection';
import { useStorageDataObject } from '../../spawner/storage/utils';
import { checkRequiredFieldsForAddingStorage } from './utils';
import { assemblePvc, createPvc } from '../../../../../api';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';

import './AddStorageModal.scss';

type AddStorageModalProps = {
  isOpen: boolean;
  onClose: (submit: boolean) => void;
};

const AddStorageModal: React.FC<AddStorageModalProps> = ({ isOpen, onClose }) => {
  const [{ creating, existing }, setStorageData, resetData] = useStorageDataObject(
    'persistent',
    'new',
  );
  const [actionInProgress, setActionInProgress] = React.useState<boolean>(false);
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const onBeforeClose = (submitted: boolean) => {
    onClose(submitted);
    setActionInProgress(false);
    resetData();
  };

  const setChecked = (selection: 'existing' | 'creating') => {
    const isCreatingChecked = selection === 'creating';
    setStorageData('creating', { ...creating, enabled: isCreatingChecked });
    setStorageData('existing', { ...existing, enabled: !isCreatingChecked });
  };

  const isDisabled = !checkRequiredFieldsForAddingStorage(creating, existing);

  return (
    <Modal
      title="Add storage"
      description="Add and connect storage to your cluster"
      variant="medium"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      showClose
      actions={[
        <Button
          isDisabled={isDisabled || actionInProgress}
          key="add-storage-confirm"
          variant="primary"
          onClick={() => {
            setActionInProgress(true);
            if (creating.enabled) {
              const {
                nameDesc: { name, description },
                size,
              } = creating;
              const pvcData = assemblePvc(name, currentProject.metadata.name, description, size);
              createPvc(pvcData)
                .then(() => {
                  setActionInProgress(false);
                  onBeforeClose(true);
                  // TODO: update notebook volume and volumeMount
                })
                .catch((e) => {
                  console.error('Error creating new PVC: ' + e);
                  setActionInProgress(false);
                });
            } else if (existing.enabled) {
              // TODO: update notebook volume and volumeMount
            }
          }}
        >
          Add storage
        </Button>,
        <Button key="add-storage-cancel" variant="secondary" onClick={() => onBeforeClose(false)}>
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
