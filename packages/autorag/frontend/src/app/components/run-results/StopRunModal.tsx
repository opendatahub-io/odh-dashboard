import React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

type StopRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isTerminating: boolean;
  runName?: string;
};

const StopRunModal: React.FC<StopRunModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isTerminating,
  runName,
}) => (
  <Modal variant="small" isOpen={isOpen} onClose={onClose} data-testid="stop-run-modal">
    <ModalHeader title="Stop pipeline run?" />
    <ModalBody>
      Are you sure you want to stop {runName ? `"${runName}"` : 'this run'}? All running tasks will
      be canceled and the run will be marked as canceled. This action cannot be undone.
    </ModalBody>
    <ModalFooter>
      <Button
        variant="danger"
        onClick={onConfirm}
        isDisabled={isTerminating}
        isLoading={isTerminating}
        spinnerAriaValueText="Stopping run"
        data-testid="confirm-stop-run-button"
      >
        Stop
      </Button>
      <Button variant="link" onClick={onClose} isDisabled={isTerminating}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default StopRunModal;
