import React from 'react';

import { Form, FormGroup, Modal, ModalVariant, TextArea, TextInput } from '@patternfly/react-core';

import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import PVSizeField from '~/pages/projects/components/PVSizeField';
import { StorageData } from '~/pages/projects/types';
import StorageClassSelect from './StorageClassSelect';

interface ClusterStorageEditModalProps {
  storageData: StorageData;
  setStorageData: (storageData: StorageData) => void;
  onClose: () => void;
}

export const ClusterStorageEditModal: React.FC<ClusterStorageEditModalProps> = ({
  storageData,
  setStorageData,
  onClose,
}) => {
  const [name, setName] = React.useState(storageData.creating.nameDesc.name);
  const [description, setDescription] = React.useState(storageData.creating.nameDesc.description);
  const [size, setSize] = React.useState(storageData.creating.size);
  const [storageClassName, setStorageClassName] = React.useState(
    storageData.creating.storageClassName,
  );
  const [mountPath, setMountPath] = React.useState(storageData.creating.mountPath);

  const onSubmit = () => {
    setStorageData({
      ...storageData,
      creating: { nameDesc: { name, description }, size, storageClassName, mountPath },
    });
    onClose();
  };

  return (
    <Modal
      isOpen
      variant={ModalVariant.small}
      title="Edit storage"
      onClose={onClose}
      footer={
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={onSubmit}
          submitLabel="Save"
          isSubmitDisabled={!name}
          alertTitle="Error updating storage class"
        />
      }
      data-testid="edit-cluster-storage-modal"
    >
      <Form id="edit-cluster-storage-form">
        <FormGroup label="Display name" fieldId="name" isRequired>
          <TextInput
            isRequired
            value={name}
            onChange={(_, value) => setName(value)}
            id="display-name"
            data-testid="display-name-input"
          />
        </FormGroup>

        <FormGroup label="Description" fieldId="description">
          <TextArea
            value={description}
            onChange={(_, value) => setDescription(value)}
            resizeOrientation="vertical"
            autoResize
            id="description"
            data-testid="description-textarea"
          />
        </FormGroup>

        <StorageClassSelect
          storageClassName={storageClassName}
          setStorageClassName={(newName) => setStorageClassName(newName)}
        />

        <PVSizeField
          fieldID="storage-size"
          size={size}
          setSize={(storageSize) => setSize(storageSize)}
        />

        <FormGroup label="Mount path" fieldId="mount-path" isRequired>
          <TextInput
            isRequired
            value={mountPath}
            onChange={(_, value) => setMountPath(value)}
            id="mount-path"
            data-testid="mount-path-input"
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};
