import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
  List,
  ListItem,
} from '@patternfly/react-core';
import { deleteCollection, isConflictError } from '~/app/api/dataRegistry';
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
      onDeleted();
      onClose();
    } catch (err) {
      if (isConflictError(err)) {
        setError('Collection is not empty. Remove all assets before deleting.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete collection');
      }
    } finally {
      setIsDeleting(false);
    }
  }, [collection, project, onDeleted, onClose]);

  const handleClose = React.useCallback(() => {
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
      <ModalHeader title="Delete collection?" titleIconVariant="warning" />
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
              The <strong>{collection.name}</strong> collection will be deleted. It contains no data
              assets.
            </p>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Delete"
          submitButtonVariant="danger"
          onSubmit={handleDelete}
          onCancel={handleClose}
          isSubmitDisabled={hasAssets || isDeleting}
          isSubmitLoading={isDeleting}
          submitButtonTestId="confirm-delete-button"
        />
      </ModalFooter>
    </Modal>
  );
};

export default DeleteCollectionModal;
