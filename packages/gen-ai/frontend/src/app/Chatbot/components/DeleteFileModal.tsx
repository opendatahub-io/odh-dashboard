import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { FileModel } from '~/app/types';

interface DeleteFileModalProps {
  isOpen: boolean;
  file: FileModel | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

const DeleteFileModal: React.FC<DeleteFileModalProps> = ({
  isOpen,
  file,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!file) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant="small" data-testid="delete-file-modal">
      <ModalHeader title="Delete file?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            Are you sure you want to delete <strong>{file.filename}</strong>?
          </StackItem>
          <StackItem>This action cannot be undone.</StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="delete-button"
          variant="danger"
          isLoading={isDeleting}
          isDisabled={isDeleting}
          onClick={onConfirm}
        >
          Delete
        </Button>
        <Button key="cancel-button" variant="link" onClick={onClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteFileModal;
