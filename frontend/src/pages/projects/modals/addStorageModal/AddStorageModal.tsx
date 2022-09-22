import * as React from 'react';
import { Button, Modal, Radio, Stack, StackItem } from '@patternfly/react-core';
import { DEFAULT_PVC_SIZE } from './const';
import CreateNewStorageForm from './CreateNewStorageForm';
import ConnectWorkbenchOptions from './ConnectWorkbenchOptions';
import AddExistingStorageForm from './AddExistingStorageForm';
import { ExistingStorage } from './types';

import './addStorageModal.scss';

type AddStorageModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const AddStorageModal: React.FC<AddStorageModalProps> = ({ isOpen, onClose }) => {
  const [isCreateNewPV, setCreateNewPV] = React.useState<boolean>(true);

  // states for creating new PV
  const [name, setName] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [size, setSize] = React.useState<string>(DEFAULT_PVC_SIZE);
  const [workbenchSelection, setWorkbenchSelection] = React.useState<string | string[] | null>([]);

  // states for adding existing PV
  const [projectSelection, setProjectSelection] = React.useState<string | null>(null);
  const [storageSelection, setStorageSelection] = React.useState<string | null>(null);
  const existingSelections: ExistingStorage = React.useMemo(
    () => ({ project: projectSelection, storage: storageSelection }),
    [projectSelection, storageSelection],
  );

  const updateWorkbench = (workbench: string | string[] | null) => {
    setWorkbenchSelection(workbench);
  };

  const updateExistingStorage = (selection: string, storageOnly: boolean) => {
    if (!storageOnly) {
      setProjectSelection(selection);
      setStorageSelection(null);
    } else {
      setStorageSelection(selection);
    }
  };

  const clearExistingStorage = (storageOnly: boolean) => {
    if (!storageOnly) {
      setProjectSelection(null);
    }
    setStorageSelection(null);
  };

  return (
    <Modal
      title="Add storage"
      description="Add and connect storage to your cluster"
      variant="large"
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
            isChecked={isCreateNewPV}
            onChange={() => setCreateNewPV(true)}
            body={
              isCreateNewPV && (
                <CreateNewStorageForm
                  name={name}
                  setName={setName}
                  description={description}
                  setDescription={setDescription}
                  size={size}
                  setSize={setSize}
                  workbenchOptions={
                    <ConnectWorkbenchOptions
                      allWorkbenches={[]}
                      workbenchSelection={workbenchSelection}
                      onUpdate={updateWorkbench}
                    />
                  }
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
            isChecked={!isCreateNewPV}
            onChange={() => setCreateNewPV(false)}
            body={
              !isCreateNewPV && (
                <AddExistingStorageForm
                  selections={existingSelections}
                  onClear={clearExistingStorage}
                  onUpdate={updateExistingStorage}
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
