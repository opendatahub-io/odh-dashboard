import * as React from 'react';
import { MountPath, StorageData } from '#~/pages/projects/types';
import BaseStorageModal from '#~/pages/projects/screens/detail/storage/BaseStorageModal';
import SpawnerMountPathField from './SpawnerMountPathField';
import { MOUNT_PATH_PREFIX } from './const';

type WorkbenchStorageModalProps = {
  onSubmit: (storageData: StorageData) => void;
  onClose: (submit: boolean) => void;
  existingStorageNames: string[];
  existingMountPaths: string[];
  formData?: StorageData;
};

const WorkbenchStorageModal: React.FC<WorkbenchStorageModalProps> = ({
  formData,
  existingStorageNames,
  existingMountPaths,
  onSubmit,
  onClose,
}) => {
  const existingMountPath = formData?.mountPath;
  const [mountPath, setMountPath] = React.useState<MountPath>({
    value: existingMountPath ?? MOUNT_PATH_PREFIX,
    error: '',
  });
  const [actionInProgress, setActionInProgress] = React.useState(false);
  const [hasDuplicateName, setHasDuplicateName] = React.useState(false);

  React.useEffect(() => {
    if (existingMountPath) {
      setMountPath({
        value: existingMountPath,
        error: '',
      });
    }
  }, [existingMountPath]);

  const handleSubmit = async (createData: StorageData) => {
    onSubmit({ ...formData, ...createData, mountPath: mountPath.value });
    setActionInProgress(true);
  };

  return (
    <BaseStorageModal
      existingData={formData}
      existingPvc={formData?.existingPvc}
      hasDuplicateName={hasDuplicateName}
      onSubmit={handleSubmit}
      onNameChange={(newName) => {
        if (existingStorageNames.includes(newName)) {
          setHasDuplicateName(true);
        } else {
          setHasDuplicateName(false);
        }
      }}
      title={formData ? 'Edit storage' : 'Create storage'}
      submitLabel={formData ? 'Save' : 'Create'}
      isValid={!actionInProgress && !mountPath.error && !hasDuplicateName}
      onClose={onClose}
    >
      <SpawnerMountPathField
        mountPath={mountPath}
        inUseMountPaths={existingMountPaths}
        onChange={setMountPath}
      />
    </BaseStorageModal>
  );
};

export default WorkbenchStorageModal;
