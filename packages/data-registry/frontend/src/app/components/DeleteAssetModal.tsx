import React from 'react';
import {
  Alert,
  Button,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from '@patternfly/react-core';

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
  const [confirmation, setConfirmation] = React.useState('');
  const assetTypeLabel = assetType === 'table' ? 'structured' : 'unstructured';

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
      variant="medium"
      data-testid="delete-asset-modal"
    >
      <ModalHeader
        title={`Permanently delete "${assetName}" ${assetTypeLabel} asset?`}
        titleIconVariant="warning"
      />
      <ModalBody>
        {error ? <Alert variant="danger" isInline title={error} /> : null}
        <p>
          <strong>{assetName}</strong> and its data will be lost forever.
        </p>
        <FormGroup
          label={
            <>
              To confirm deletion, type <strong>{assetName}</strong> below:
            </>
          }
          isRequired
          fieldId="delete-asset-confirmation"
        >
          <TextInput
            id="delete-asset-confirmation"
            value={confirmation}
            onChange={(_event, value) => setConfirmation(value)}
            isDisabled={isDeleting}
            data-testid="delete-asset-confirmation"
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleDelete}
          isLoading={isDeleting}
          isDisabled={isDeleting || confirmation !== assetName}
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
