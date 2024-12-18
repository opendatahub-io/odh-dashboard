import React from 'react';
import { deleteHardwareProfile } from '~/api';
import { HardwareProfileKind } from '~/k8sTypes';
import DeleteModal from '~/pages/projects/components/DeleteModal';

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

  return (
    <DeleteModal
      title="Delete hardware profile?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        deleteHardwareProfile(hardwareProfile.metadata.name, hardwareProfile.metadata.namespace)
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
      deleteName={hardwareProfile.spec.displayName}
    >
      This action cannot be undone. Workloads already deployed using this profile will not be
      affected by this action.
    </DeleteModal>
  );
};

export default DeleteHardwareProfileModal;
