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
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AUTOML_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

type DeleteRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  runName?: string;
};

const DeleteRunModal: React.FC<DeleteRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  runName,
}) => {
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const confirmMessage = runName ?? '';
  const isDisabled = !confirmMessage || confirmInputValue.trim() !== confirmMessage || isDeleting;

  const handleClose = React.useCallback(() => {
    // Deletion is already in flight (e.g. triggered via Escape/backdrop, which PatternFly's
    // Modal invokes regardless of the disabled Cancel button) — don't record a "cancel"
    // outcome here, since handleDelete will record the real submit success/failure outcome.
    if (isDeleting) {
      return;
    }
    setConfirmInputValue('');
    fireFormTrackingEvent(AUTOML_EVENTS.RUN_DELETED, {
      outcome: TrackingOutcome.cancel,
      source: 'runsList',
    });
    onClose();
  }, [isDeleting, onClose]);

  return (
    <Modal variant="small" isOpen={isOpen} onClose={handleClose} data-testid="delete-run-modal">
      <ModalHeader title="Delete AutoML optimization run?" titleIconVariant="warning" />
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
                    onConfirm();
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
          onClick={onConfirm}
          isDisabled={isDisabled}
          isLoading={isDeleting}
          spinnerAriaValueText="Deleting run"
          data-testid="confirm-delete-run-button"
        >
          Delete
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteRunModal;
