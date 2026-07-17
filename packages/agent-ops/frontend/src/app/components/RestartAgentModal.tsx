import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Button,
} from '@patternfly/react-core';

type RestartAgentModalProps = {
  agentName: string;
  isRestarting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const RestartAgentModal: React.FC<RestartAgentModalProps> = ({
  agentName,
  isRestarting,
  onConfirm,
  onCancel,
}) => (
  <Modal variant={ModalVariant.small} isOpen onClose={onCancel}>
    <ModalHeader title="Restart agent deployment?" />
    <ModalBody>
      Are you sure you want to restart <strong>{agentName}</strong>? The agent pod will be
      recreated.
    </ModalBody>
    <ModalFooter>
      <Button
        variant="primary"
        onClick={onConfirm}
        isLoading={isRestarting}
        isDisabled={isRestarting}
      >
        Restart
      </Button>
      <Button variant="link" onClick={onCancel} isDisabled={isRestarting}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default RestartAgentModal;
