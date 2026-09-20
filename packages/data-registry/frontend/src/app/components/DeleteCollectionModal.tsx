import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  TextInput,
  FormGroup,
  List,
  ListItem,
} from '@patternfly/react-core';
import { deleteCollection, ApiError } from '~/app/api/dataRegistry';
import { CollectionInfo } from '~/app/hooks/useCollections';

type DeleteCollectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  collection: CollectionInfo | null;
  onDeleted: () => void;
};

const DeleteCollectionModal: React.FC<DeleteCollectionModalProps> = ({
  isOpen,
  onClose,
  project,
  collection,
  onDeleted,
}) => {
  const [confirmText, setConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState('');

  const hasAssets = collection ? collection.tableCount + collection.volumeCount > 0 : false;

  const handleDelete = React.useCallback(async () => {
    if (!collection) {
      return;
    }
    setIsDeleting(true);
    setError('');
    try {
      await deleteCollection(project, collection.name);
      setConfirmText('');
      onDeleted();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('Collection is not empty. Remove all assets before deleting.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete collection');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [collection, project, onDeleted, onClose]);

  const handleClose = React.useCallback(() => {
    setConfirmText('');
    setError('');
    onClose();
  }, [onClose]);

  if (!collection) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="small"
      data-testid="delete-collection-modal"
    >
      <ModalHeader title={`Delete collection "${collection.name}"?`} />
      <ModalBody>
        {hasAssets ? (
          <Alert variant="warning" isInline title="Collection is not empty">
            This collection contains {collection.tableCount} table(s) and {collection.volumeCount}{' '}
            volume(s). You must delete all assets before this collection can be removed:
            <List>
              {collection.assetNames.map((name) => (
                <ListItem key={name}>{name}</ListItem>
              ))}
            </List>
          </Alert>
        ) : (
          <>
            {error ? (
              <Alert variant="danger" isInline title="Error">
                {error}
              </Alert>
            ) : null}
            <p>
              This action cannot be undone. Type <strong>{collection.name}</strong> to confirm.
            </p>
            <FormGroup label="Collection name" fieldId="confirm-delete">
              <TextInput
                id="confirm-delete"
                value={confirmText}
                onChange={(_event, value) => setConfirmText(value)}
                data-testid="confirm-delete-input"
              />
            </FormGroup>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleDelete}
          isDisabled={hasAssets || confirmText !== collection.name || isDeleting}
          isLoading={isDeleting}
          data-testid="confirm-delete-button"
        >
          Delete
        </Button>
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteCollectionModal;
