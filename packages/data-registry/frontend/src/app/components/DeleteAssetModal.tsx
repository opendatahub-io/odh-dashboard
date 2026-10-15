import React from 'react';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import './DeleteAssetModal.scss';

type DeleteAssetModalProps = {
  assetName: string;
  onDelete: () => Promise<void>;
  onClose: () => void;
};

const DeleteAssetModal: React.FC<DeleteAssetModalProps> = ({ assetName, onDelete, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [confirmation, setConfirmation] = React.useState('');

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
      <ModalHeader title="Delete data asset?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <p>
              The <strong>{assetName}</strong> data asset will be deleted.
            </p>
          </StackItem>
          <StackItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                Type <strong>{assetName}</strong> to confirm deletion:
                <span
                  className="pf-v6-c-form__label-required odh-data-registry-delete-asset__required"
                  aria-hidden="true"
                  data-testid="delete-asset-confirmation-required"
                >
                  *
                </span>
              </FlexItem>
              <TextInput
                id="delete-asset-confirmation"
                aria-label="Delete asset confirmation"
                value={confirmation}
                onChange={(_event, value) => setConfirmation(value)}
                isDisabled={isDeleting}
                data-testid="delete-asset-confirmation"
              />
            </Flex>
          </StackItem>
          {error ? (
            <StackItem>
              <Alert variant="danger" isInline title={error} />
            </StackItem>
          ) : null}
        </Stack>
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
