import * as React from 'react';
import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

type DeleteConfirmationModalProps = {
  title: string;
  body: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  actionError?: string | null;
  isSubmitting?: boolean;
  ariaLabel?: string;
  dataTestId?: string;
  confirmTestId?: string;
  cancelTestId?: string;
};

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  title,
  body,
  onClose,
  onConfirm,
  actionError,
  isSubmitting = false,
  ariaLabel = title,
  dataTestId,
  confirmTestId,
  cancelTestId,
}) => (
  <Modal isOpen onClose={onClose} variant="small" aria-label={ariaLabel} data-testid={dataTestId}>
    <ModalHeader title={title} titleIconVariant="warning" />
    <ModalBody>
      {actionError && (
        <Alert variant="danger" isInline isPlain title={actionError} className="pf-v6-u-mb-md" />
      )}
      {body}
    </ModalBody>
    <ModalFooter>
      <Button
        variant="danger"
        onClick={onConfirm}
        isLoading={isSubmitting}
        isDisabled={isSubmitting}
        data-testid={confirmTestId}
      >
        Delete
      </Button>
      <Button variant="link" onClick={onClose} isDisabled={isSubmitting} data-testid={cancelTestId}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default DeleteConfirmationModal;
