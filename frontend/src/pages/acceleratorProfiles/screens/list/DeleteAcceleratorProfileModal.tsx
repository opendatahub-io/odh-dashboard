import React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { AcceleratorKind } from '~/k8sTypes';
import { deleteAcceleratorProfile } from '~/services/acceleratorProfileService';

type DeleteAcceleratorProfileModalProps = {
  acceleratorProfile?: AcceleratorKind;
  onClose: (deleted: boolean) => void;
};

const DeleteAcceleratorProfileModal: React.FC<DeleteAcceleratorProfileModalProps> = ({
  acceleratorProfile,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = acceleratorProfile?.spec.displayName || 'this accelerator profile';

  return (
    <DeleteModal
      title="Delete accelerator profile?"
      isOpen={!!acceleratorProfile}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete accelerator profile"
      onDelete={() => {
        if (acceleratorProfile) {
          setIsDeleting(true);
          deleteAcceleratorProfile(acceleratorProfile.metadata.name)
            .then(() => {
              onBeforeClose(true);
            })
            .catch((e) => {
              setError(e);
              setIsDeleting(false);
            });
        }
      }}
      deleting={isDeleting}
      error={error}
      deleteName={deleteName}
    >
      The <b>{deleteName}</b> accelerator profile will be deleted and will be unavailable for any
      workbenches and runtimes. Existing resources will retain their settings but cannot revert to
      this profile once changed.
    </DeleteModal>
  );
};

export default DeleteAcceleratorProfileModal;
