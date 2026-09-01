import React from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader, Button, Alert } from '@patternfly/react-core';

type DeleteAssetModalProps = {
  assetName: string;
  assetType: 'table' | 'volume';
  onDelete: () => Promise<void>;
  onClose: () => void;
};

const DeleteAssetModal: React.FC<DeleteAssetModalProps> = ({
  assetName,
  assetType,
  onDelete,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const handleDelete = React.useCallback(async () => {
    setIsDeleting(true);
    setError(undefined);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete asset');
      setIsDeleting(false);
    }
  }, [onDelete]);

  return (
    <Modal
      isOpen
      onClose={isDeleting ? undefined : onClose}
      variant="small"
      data-testid="delete-asset-modal"
    >
      <ModalHeader title={`Delete ${assetType}?`} />
      <ModalBody>
        {error ? <Alert variant="danger" isInline title={error} /> : null}
        <p>
          Are you sure you want to delete the {assetType} <strong>{assetName}</strong>? This action
          cannot be undone.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleDelete}
          isLoading={isDeleting}
          isDisabled={isDeleting}
          data-testid="delete-asset-confirm"
        >
          Delete
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteAssetModal;
