import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { deleteHardwareProfile } from '#~/api';
import { HardwareProfileKind } from '#~/k8sTypes';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { getHardwareProfileDisplayName } from './utils';

type DeleteHardwareProfileModalProps = {
  hardwareProfile: HardwareProfileKind;
  onClose: (deleted: boolean) => void;
};

const DeleteHardwareProfileModal: React.FC<DeleteHardwareProfileModalProps> = ({
  hardwareProfile,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = getHardwareProfileDisplayName(hardwareProfile);

  return (
    <DeleteModal
      title="Delete hardware profile?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      deleteName={displayName}
      onDelete={() => {
        setIsDeleting(true);

        const deletePromise = () => {
          return deleteHardwareProfile(
            hardwareProfile.metadata.name,
            hardwareProfile.metadata.namespace,
          );
        };

        deletePromise()
          .then(() => {
            onBeforeClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
    >
      <Stack hasGutter>
        <StackItem>Deployed workloads using this profile will not be affected.</StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteHardwareProfileModal;
