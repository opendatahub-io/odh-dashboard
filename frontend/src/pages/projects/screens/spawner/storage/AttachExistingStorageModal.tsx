import {
  Form,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import React from 'react';
import { ExistingStorageObject, MountPath } from '#~/pages/projects/types';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import SpawnerMountPathField from './SpawnerMountPathField';
import AddExistingStorageField from './AddExistingStorageField';
import { MOUNT_PATH_PREFIX } from './const';

type AttachExistingStorageModalData = ExistingStorageObject & {
  mountPath: MountPath;
};

type AttachExistingStorageModalProps = {
  existingMountPaths: string[];
  existingStorageNames: string[];
  onClose: (submit: boolean, storageData?: AttachExistingStorageModalData) => void;
};

const initialState: AttachExistingStorageModalData = {
  storage: '',
  pvc: undefined,
  mountPath: { value: MOUNT_PATH_PREFIX, error: '' },
};

const AttachExistingStorageModal: React.FC<AttachExistingStorageModalProps> = ({
  existingMountPaths,
  existingStorageNames,
  onClose,
}) => {
  const [data, setData] = React.useState<AttachExistingStorageModalData>(initialState);

  const onBeforeClose = (submitted: boolean, storageData?: AttachExistingStorageModalData) => {
    onClose(submitted, storageData);
    setData(initialState);
  };

  return (
    <Modal variant="medium" onClose={() => onBeforeClose(false)} isOpen>
      <ModalHeader title="Attach existing storage" />
      <ModalBody>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            onBeforeClose(true, data);
          }}
        >
          <Stack hasGutter>
            <StackItem>
              <AddExistingStorageField
                data={data}
                setData={(existingStorage) =>
                  setData({ ...data, storage: existingStorage.storage, pvc: existingStorage.pvc })
                }
                existingStorageNames={existingStorageNames}
              />
            </StackItem>
            <StackItem>
              <SpawnerMountPathField
                mountPath={data.mountPath}
                inUseMountPaths={existingMountPaths}
                onChange={(path) => setData({ ...data, mountPath: path })}
              />
            </StackItem>
          </Stack>
        </Form>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Attach storage"
          onSubmit={() => onBeforeClose(true, data)}
          onCancel={() => onBeforeClose(false)}
          isSubmitDisabled={!data.mountPath.value || !!data.mountPath.error}
          alertTitle="Error creating storage"
        />
      </ModalFooter>
    </Modal>
  );
};

export default AttachExistingStorageModal;
