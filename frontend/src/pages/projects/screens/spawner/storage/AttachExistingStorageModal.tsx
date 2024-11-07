import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import { ExistingStorageObject, MountPath } from '~/pages/projects/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import SpawnerMountPathField from './SpawnerMountPathField';
import AddExistingStorageField from './AddExistingStorageField';

type AttachExistingStorageModalData = ExistingStorageObject & {
  mountPath: MountPath;
};

type AttachExistingStorageModalProps = {
  onClose: (submit: boolean, storageData?: AttachExistingStorageModalData) => void;
};

const initialState: AttachExistingStorageModalData = {
  storage: '',
  mountPath: { value: '', error: '' },
};

const AttachExistingStorageModal: React.FC<AttachExistingStorageModalProps> = ({ onClose }) => {
  const [data, setData] = React.useState<AttachExistingStorageModalData>(initialState);

  const onBeforeClose = (submitted: boolean, storageData?: AttachExistingStorageModalData) => {
    onClose(submitted, storageData);
    setData(initialState);
  };

  const isValid =
    data.mountPath.value.length > 0 &&
    data.mountPath.value !== '/' &&
    !data.mountPath.error &&
    data.storage.trim() !== '';

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
          isSubmitDisabled={!isValid}
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
              setData={(storageName) => setData({ ...data, storage: storageName.storage })}
            />
          </StackItem>
          <StackItem>
            <SpawnerMountPathField
              isCreate
              mountPath={data.mountPath}
              onChange={(path) => setData({ ...data, mountPath: path })}
            />
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  );
};

export default AttachExistingStorageModal;
