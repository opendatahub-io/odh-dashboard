import * as React from 'react';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { deletePvc, removeNotebookPVC } from '#~/api';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import DeleteModalConnectedAlert from '#~/pages/projects/components/DeleteModalConnectedAlert';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';

type DeletePVCModalProps = {
  pvcToDelete: PersistentVolumeClaimKind;
  onClose: (deleted: boolean) => void;
};

const DeletePVCModal: React.FC<DeletePVCModalProps> = ({ pvcToDelete, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const {
    notebooks: connectedNotebooks,
    loaded: notebookLoaded,
    error: notebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.EXISTING_PVC, pvcToDelete.metadata.name);

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = getDisplayNameFromK8sResource(pvcToDelete);

  return (
    <DeleteModal
      title="Delete storage?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete storage"
      onDelete={() => {
        const { name, namespace } = pvcToDelete.metadata;
        setIsDeleting(true);
        Promise.all(
          connectedNotebooks.map((notebook) =>
            removeNotebookPVC(notebook.metadata.name, namespace, name),
          ),
        )
          .then(() =>
            deletePvc(name, namespace).then(() => {
              onBeforeClose(true);
            }),
          )
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={displayName}
    >
      <DeleteModalConnectedAlert
        connectedNotebooks={connectedNotebooks}
        error={notebookError}
        loaded={notebookLoaded}
      />
    </DeleteModal>
  );
};

export default DeletePVCModal;
