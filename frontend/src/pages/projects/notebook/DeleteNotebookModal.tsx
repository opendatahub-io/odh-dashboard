import * as React from 'react';
import { Alert, Button, Modal, Stack, StackItem } from '@patternfly/react-core';
import { NotebookKind } from '../../../k8sTypes';
import { getNotebookDisplayName } from '../utils';
import { deleteNotebook } from '../../../api';

type DeleteNotebookModalProps = {
  notebook?: NotebookKind;
  onClose: () => void;
};

const DeleteNotebookModal: React.FC<DeleteNotebookModalProps> = ({ notebook, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  return (
    <Modal
      title="Confirm notebook delete"
      variant="small"
      isOpen={!!notebook}
      onClose={onClose}
      actions={[
        <Button
          key="delete-notebook"
          variant="danger"
          isDisabled={isDeleting}
          onClick={() => {
            if (notebook) {
              setIsDeleting(true);
              deleteNotebook(notebook.metadata.name, notebook?.metadata.namespace)
                .then(() => {
                  onClose();
                })
                .catch((e) => {
                  setError(e);
                });
            }
          }}
        >
          Delete notebook
        </Button>,
        <Button key="cancel" variant="secondary" onClick={onClose}>
          Cancel
        </Button>,
      ]}
    >
      <Stack hasGutter>
        <StackItem>
          Are you sure you want to delete{' '}
          {notebook ? <strong>{getNotebookDisplayName(notebook)}</strong> : 'this notebook'}?
        </StackItem>
        {error && (
          <StackItem>
            <Alert title="Error deleting notebook" isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default DeleteNotebookModal;
