import React from 'react';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { deleteAcceleratorProfile } from '#~/api';
import { useDashboardNamespace } from '#~/redux/selectors';

type DeleteAcceleratorProfileModalProps = {
  acceleratorProfile: AcceleratorProfileKind;
  onClose: (deleted: boolean) => void;
};

const DeleteAcceleratorProfileModal: React.FC<DeleteAcceleratorProfileModalProps> = ({
  acceleratorProfile,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { dashboardNamespace } = useDashboardNamespace();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const deleteName = acceleratorProfile.spec.displayName;

  return (
    <DeleteModal
      title="Delete accelerator profile?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);
        deleteAcceleratorProfile(acceleratorProfile.metadata.name, dashboardNamespace)
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
      deleteName={deleteName}
    >
      The <b>{deleteName}</b> accelerator profile will be deleted and will no longer be available
      for use with new workbenches and runtimes. Existing resources using this profile will retain
      it unless a new profile is selected.
    </DeleteModal>
  );
};

export default DeleteAcceleratorProfileModal;
