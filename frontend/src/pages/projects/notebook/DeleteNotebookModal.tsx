import * as React from 'react';
import { NotebookKind } from '../../../k8sTypes';
import { getNotebookDisplayName } from '../utils';
import { deleteNotebook } from '../../../api';
import DeleteModal from '../components/DeleteModal';

type DeleteNotebookModalProps = {
  notebook?: NotebookKind;
  onClose: (deleted: boolean) => void;
};

const DeleteNotebookModal: React.FC<DeleteNotebookModalProps> = ({ notebook, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = notebook ? getNotebookDisplayName(notebook) : 'this workbench';

  return (
    <DeleteModal
      title="Delete workbench?"
      isOpen={!!notebook}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete workbench"
      onDelete={() => {
        if (notebook) {
          setIsDeleting(true);
          deleteNotebook(notebook.metadata.name, notebook.metadata.namespace)
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
      deleteName={displayName}
    >
      This action cannot be undone.
    </DeleteModal>
  );
};

export default DeleteNotebookModal;
