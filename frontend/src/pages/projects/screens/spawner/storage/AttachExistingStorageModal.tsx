import { Form, Stack, StackItem } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import React from 'react';
import { ExistingStorageObject, MountPath } from '~/pages/projects/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
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
    <Modal
      title="Attach Existing Storage"
      variant="medium"
      onClose={() => onBeforeClose(false)}
      showClose
      isOpen
      footer={
        <DashboardModalFooter
          submitLabel="Attach storage"
          onSubmit={() => onBeforeClose(true, data)}
          onCancel={() => onBeforeClose(false)}
          isSubmitDisabled={!data.mountPath.value || !!data.mountPath.error}
          alertTitle="Error creating storage"
        />
      }
    >
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
    </Modal>
  );
};

export default AttachExistingStorageModal;
