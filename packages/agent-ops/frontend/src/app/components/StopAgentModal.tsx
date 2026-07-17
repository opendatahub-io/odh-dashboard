import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Button,
} from '@patternfly/react-core';

type StopAgentModalProps = {
  agentName: string;
  isStopping: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const StopAgentModal: React.FC<StopAgentModalProps> = ({
  agentName,
  isStopping,
  onConfirm,
  onCancel,
}) => (
  <Modal variant={ModalVariant.small} isOpen onClose={onCancel}>
    <ModalHeader title="Stop agent deployment?" />
    <ModalBody>
      Are you sure you want to stop <strong>{agentName}</strong>? The agent will stop serving
      requests until it is started again.
    </ModalBody>
    <ModalFooter>
      <Button
        variant="primary"
        onClick={onConfirm}
        isLoading={isStopping}
        isDisabled={isStopping}
      >
        Stop
      </Button>
      <Button variant="link" onClick={onCancel} isDisabled={isStopping}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default StopAgentModal;
