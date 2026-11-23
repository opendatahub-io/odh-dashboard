import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import {
  Alert,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { deleteCollectionWithAssets } from '~/app/utilities/deleteCollectionWithAssets';
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

  const assetCount = collection ? collection.tableCount + collection.volumeCount : 0;
  const hasAssets = assetCount > 0;

  const handleDelete = React.useCallback(async () => {
    if (!collection) {
      return;
    }
    const listed = collection.assets ?? [];
    if (listed.length !== assetCount) {
      setError(
        'The asset list does not match this collection. Nothing was deleted. Refresh and try again.',
      );
      return;
    }
    setIsDeleting(true);
    setError('');
    try {
      await deleteCollectionWithAssets(project, collection.name, listed);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
    } finally {
      setIsDeleting(false);
    }
  }, [assetCount, collection, project, onDeleted, onClose]);

  const handleClose = React.useCallback(() => {
    if (!isDeleting) {
      setError('');
      onClose();
    }
  }, [isDeleting, onClose]);

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
      <ModalHeader
        title={hasAssets ? 'Delete collection and assets?' : 'Delete collection?'}
        titleIconVariant="warning"
      />
      <ModalBody>
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert variant="danger" isInline title="Delete failed">
                {error}
              </Alert>
            </StackItem>
          ) : null}
          {hasAssets ? (
            <StackItem>
              <Alert variant="warning" isInline title="This deletes registry records">
                <p>
                  {collection.name} contains {collection.tableCount} table record(s) and{' '}
                  {collection.volumeCount} volume record(s). Each registry record is deleted, and
                  the collection is removed only after all of those deletes succeed. Storage files
                  are not deleted. If a delete fails, the collection stays. Records deleted before
                  the failure stay deleted.
                </p>
                <List>
                  {listedNames(collection).map((name) => (
                    <ListItem key={name}>{name}</ListItem>
                  ))}
                </List>
              </Alert>
            </StackItem>
          ) : (
            <StackItem>
              <p>
                The <strong>{collection.name}</strong> collection will be deleted. It contains no
                data assets.
              </p>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel={hasAssets ? 'Delete collection and assets' : 'Delete'}
          submitButtonVariant="danger"
          onSubmit={handleDelete}
          onCancel={handleClose}
          isSubmitDisabled={isDeleting}
          isSubmitLoading={isDeleting}
          submitButtonTestId="confirm-delete-button"
        />
      </ModalFooter>
    </Modal>
  );
};

const listedNames = (collection: CollectionInfo): string[] =>
  collection.assets?.length ? collection.assets.map((asset) => asset.name) : collection.assetNames;

export default DeleteCollectionModal;
