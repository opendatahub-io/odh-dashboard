import * as React from 'react';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { StorageData } from '~/pages/projects/types';
import BaseStorageModal from '~/pages/projects/screens/detail/storage/BaseStorageModal';

type WorkbenchStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  onClose: (submit: boolean, storageData?: StorageData['creating']) => void;
};

const WorkbenchStorageModal: React.FC<WorkbenchStorageModalProps> = (props) => {
  const handleSubmit = async () => Promise.resolve();
  return (
    <BaseStorageModal
      {...props}
      onSubmit={handleSubmit}
      title="Add workbench storage"
      description="Configure storage for your workbench."
      submitLabel="Add storage"
      isSpawnerPage
    />
  );
};

export default WorkbenchStorageModal;
