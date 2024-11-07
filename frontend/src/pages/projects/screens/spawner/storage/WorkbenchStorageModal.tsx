import * as React from 'react';
import { StackItem } from '@patternfly/react-core';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { CreatingStorageObject, MountPath } from '~/pages/projects/types';
import BaseStorageModal from '~/pages/projects/screens/detail/storage/BaseStorageModal';
import SpawnerMountPathField from './SpawnerMountPathField';

type WorkbenchStorageModalProps = {
  existingData?: PersistentVolumeClaimKind;
  onClose: (submit: boolean) => void;
};

const WorkbenchStorageModal: React.FC<WorkbenchStorageModalProps> = (props) => {
  const [mountPath, setMountPath] = React.useState<MountPath>({
    value: '',
    error: '',
  });
  const [actionInProgress, setActionInProgress] = React.useState(false);

  //TODO: handleSubmit function to be completed in RHOAIENG-1101
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSubmit = async (createData: CreatingStorageObject) => {
    setActionInProgress(true);
  };

  const isValid =
    !actionInProgress &&
    mountPath.error === '' &&
    mountPath.value.length > 0 &&
    mountPath.value !== '/';

  return (
    <BaseStorageModal
      {...props}
      onSubmit={(createData) => handleSubmit(createData)}
      title={props.existingData ? 'Edit storage' : 'Create storage'}
      submitLabel={props.existingData ? 'Save' : 'Create'}
      isValid={isValid}
    >
      <StackItem>
        <SpawnerMountPathField
          isCreate
          mountPath={mountPath}
          onChange={(path) => setMountPath(path)}
        />
      </StackItem>
    </BaseStorageModal>
  );
};

export default WorkbenchStorageModal;
