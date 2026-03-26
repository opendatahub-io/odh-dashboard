import * as React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

interface CloseChatCompareModalProps {
  chatLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const CloseChatCompareModal: React.FC<CloseChatCompareModalProps> = ({
  chatLabel,
  onConfirm,
  onCancel,
}) => (
  <Modal isOpen onClose={onCancel} variant="small" data-testid="close-compare-modal">
    <ModalHeader title="Close Chat Compare?" />
    <ModalBody>
      {`The chat configuration for ${chatLabel} will be lost. Are you sure you would like to close?`}
    </ModalBody>
    <ModalFooter>
      <Button variant="danger" onClick={onConfirm} data-testid="close-compare-confirm-button">
        Close
      </Button>
      <Button variant="link" onClick={onCancel} data-testid="close-compare-cancel-button">
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default CloseChatCompareModal;
