import * as React from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';

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
      <DashboardModalFooter
        submitLabel="Close"
        submitButtonVariant="danger"
        onSubmit={onConfirm}
        onCancel={onCancel}
      />
    </ModalFooter>
  </Modal>
);

export default CloseChatCompareModal;
