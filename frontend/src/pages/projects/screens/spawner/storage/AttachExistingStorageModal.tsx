import { Form, Modal, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import { StorageData } from '~/pages/projects/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import SpawnerMountPathField from './SpawnerMountPathField';
import AddExistingStorageFormField from './AddExistingStorageFormField';

type AttachExistingStorageModalProps = {
  onClose: (submit: boolean, storageData?: StorageData['creating']) => void;
};

const storageDataInitialState: StorageData['creating'] = {
  nameDesc: {
    name: '',
    description: '',
  },
  size: '',
  mountPath: '',
};

const AttachExistingStorageModal: React.FC<AttachExistingStorageModalProps> = ({ onClose }) => {
  const [data, setData] = React.useState<StorageData['creating']>(storageDataInitialState);
  const [createEnabled, setCreateEnabled] = React.useState(false);

  React.useEffect(() => {
    setCreateEnabled(data.nameDesc.name !== '' && data.size !== '' && data.mountPath !== '');
  }, [data]);

  const onBeforeClose = (submitted: boolean, storageData?: StorageData['creating']) => {
    onClose(submitted, storageData);
    setData(storageDataInitialState);
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
          isSubmitDisabled={!createEnabled}
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
            <AddExistingStorageFormField data={data} setData={setData} />
          </StackItem>
          <StackItem>
            <SpawnerMountPathField
              isCreate
              mountPath={data.mountPath || ''}
              onChange={(path: string) => setData({ ...data, mountPath: path })}
            />
          </StackItem>
        </Stack>
      </Form>
    </Modal>
  );
};

export default AttachExistingStorageModal;
