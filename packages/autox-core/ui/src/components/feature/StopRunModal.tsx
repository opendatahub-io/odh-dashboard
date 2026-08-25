import React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

type StopRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isTerminating: boolean;
  runName?: string;
  /**
   * Called when the modal is dismissed without confirming and no stop request
   * is already in flight — e.g. for firing a product-specific tracking event.
   * Not called for a cancel while a stop request is in flight (Escape/close
   * button while submitting), since `onConfirm`'s own outcome tracking covers
   * that case.
   */
  onCancel?: () => void;
};

/**
 * Confirmation modal for stopping a pipeline run. Owns the submitting/loading
 * state and the cancel-while-submitting guard; callers supply `onConfirm` (the
 * actual stop mutation) and an optional `onCancel` for tracking.
 */
const StopRunModal: React.FC<StopRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isTerminating,
  runName,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset submitting state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleStopClick = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch {
      // Error notification and tracking are handled by the caller's onConfirm.
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm]);

  const handleCancel = React.useCallback(() => {
    // A stop request is already in flight (e.g. triggered via Escape/close-button, which
    // PatternFly's Modal invokes regardless of the disabled Cancel button) — don't record a
    // cancel outcome here, since handleStopClick's onConfirm will record the real submit
    // success/failure outcome.
    if (isSubmitting || isTerminating) {
      return;
    }
    onCancel?.();
    onClose();
  }, [isSubmitting, isTerminating, onClose, onCancel]);

  const isDisabled = isSubmitting || isTerminating;

  return (
    <Modal variant="small" isOpen={isOpen} onClose={handleCancel} data-testid="stop-run-modal">
      <ModalHeader title="Stop pipeline run?" />
      <ModalBody>
        Are you sure you want to stop {runName ? `"${runName}"` : 'this run'}? All running tasks
        will be canceled and the run will be marked as failed. This action cannot be undone.
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleStopClick}
          isDisabled={isDisabled}
          isLoading={isDisabled}
          spinnerAriaValueText="Stopping run"
          data-testid="confirm-stop-run-button"
        >
          Stop
        </Button>
        <Button variant="link" onClick={handleCancel} isDisabled={isDisabled}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StopRunModal;
