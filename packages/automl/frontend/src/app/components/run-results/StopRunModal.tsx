import React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AUTOML_EVENTS, TrackingOutcome, type RunActionSource } from '~/app/utilities/tracking';

type StopRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isTerminating: boolean;
  runName?: string;
  source: RunActionSource;
};

const StopRunModal: React.FC<StopRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isTerminating,
  runName,
  source,
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
      // Error notification and tracking are handled by the confirm handler (useAutomlRunActions).
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm]);

  const handleCancel = React.useCallback(() => {
    // A stop request is already in flight (e.g. triggered via Escape/close-button, which
    // PatternFly's Modal invokes regardless of the disabled Cancel button) — don't record a
    // "cancel" outcome here, since handleStopClick's onConfirm will record the real submit
    // success/failure outcome.
    if (isSubmitting || isTerminating) {
      return;
    }
    fireFormTrackingEvent(AUTOML_EVENTS.RUN_STOPPED, { outcome: TrackingOutcome.cancel, source });
    onClose();
  }, [isSubmitting, isTerminating, onClose, source]);

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
