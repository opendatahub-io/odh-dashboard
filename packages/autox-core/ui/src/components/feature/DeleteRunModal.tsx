import React from 'react';
import {
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

type DeleteRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  runName?: string;
  productName: string;
  /**
   * Called when the modal is dismissed without confirming and no delete request
   * is already in flight — e.g. for firing a product-specific tracking event.
   * Not called for a cancel while a delete request is in flight (Escape/close
   * button while submitting), since the caller's own outcome tracking around
   * `onConfirm` covers that case.
   */
  onCancel?: () => void;
};

/**
 * Confirmation modal for deleting a pipeline run, requiring the user to type
 * the run name before the Delete button is enabled. Owns the submitting/loading
 * state and the cancel-while-submitting guard; callers supply `onConfirm` (the
 * actual delete mutation) and an optional `onCancel` for tracking.
 */
const DeleteRunModal: React.FC<DeleteRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  runName,
  productName,
  onCancel,
}) => {
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  // Mirrors `isDeleting` but flips to `true` synchronously the instant the Delete button is
  // clicked, instead of waiting for the mutation library's (microtask-scheduled) notification
  // to update the `isDeleting` prop. This closes the narrow race window between the click and
  // the prop actually updating, during which Escape/backdrop-close could otherwise still see
  // `isDeleting: false` and incorrectly fire a cancel event / close the modal.
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isBusy = isSubmitting || isDeleting;
  const confirmMessage = runName ?? '';
  const isDisabled = !confirmMessage || confirmInputValue.trim() !== confirmMessage || isBusy;

  React.useEffect(() => {
    // Reset once the real deletion is no longer in flight — covers both the success case
    // (the modal will be closed/unmounted by the parent anyway) and the failure case (the
    // modal stays open and the user needs to be able to retry or cancel again).
    if (!isDeleting) {
      setIsSubmitting(false);
    }
  }, [isDeleting]);

  React.useEffect(() => {
    // Avoid stale busy state if the modal is reopened for a different run.
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = React.useCallback(() => {
    // Deletion is already in flight (e.g. triggered via Escape/backdrop, which PatternFly's
    // Modal invokes regardless of the disabled Cancel button) — don't record a "cancel"
    // outcome here, since the caller's onConfirm handling will record the real submit
    // success/failure outcome.
    if (isBusy) {
      return;
    }
    setConfirmInputValue('');
    onCancel?.();
    onClose();
  }, [isBusy, onClose, onCancel]);

  const handleDeleteClick = React.useCallback(() => {
    // Set synchronously, before calling onConfirm(), so isBusy is already true by the time
    // any subsequent event (e.g. an Escape keydown) is processed — no need to wait for the
    // async `isDeleting` prop update.
    setIsSubmitting(true);
    onConfirm();
  }, [onConfirm]);

  return (
    <Modal variant="small" isOpen={isOpen} onClose={handleClose} data-testid="delete-run-modal">
      <ModalHeader title={`Delete ${productName} optimization run?`} titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>The run will be permanently deleted. This action cannot be undone.</StackItem>
          <StackItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                Type <strong>{confirmMessage}</strong> to confirm deletion:
              </FlexItem>
              <TextInput
                id="confirm-delete-input"
                data-testid="confirm-delete-input"
                aria-label="confirm delete input"
                value={confirmInputValue}
                onChange={(_e, newValue) => setConfirmInputValue(newValue)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isDisabled) {
                    handleDeleteClick();
                  }
                }}
              />
            </Flex>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleDeleteClick}
          isDisabled={isDisabled}
          isLoading={isBusy}
          spinnerAriaValueText="Deleting run"
          data-testid="confirm-delete-run-button"
        >
          Delete
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isBusy}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteRunModal;
