import React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

type StopRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isTerminating: boolean;
  runName?: string;
};

const StopRunModal: React.FC<StopRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isTerminating,
  runName,
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
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm]);

  const isDisabled = isSubmitting || isTerminating;

  return (
    <Modal variant="small" isOpen={isOpen} onClose={onClose} data-testid="stop-run-modal">
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
        <Button variant="link" onClick={onClose} isDisabled={isDisabled}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StopRunModal;
