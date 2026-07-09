import * as React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

type AgentDeleteModalProps = {
  agentName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const AgentDeleteModal: React.FC<AgentDeleteModalProps> = ({
  agentName,
  isDeleting,
  onConfirm,
  onCancel,
}) => (
  <Modal
    variant="small"
    isOpen
    onClose={onCancel}
    aria-labelledby="delete-agent-modal-title"
    aria-describedby="delete-agent-modal-body"
    data-testid="agent-delete-modal"
  >
    <ModalHeader
      title="Delete agent deployment?"
      labelId="delete-agent-modal-title"
      titleIconVariant="warning"
    />
    <ModalBody>
      <p id="delete-agent-modal-body">
        Are you sure you want to delete <strong>{agentName}</strong>? This action cannot be undone.
      </p>
    </ModalBody>
    <ModalFooter>
      <Button
        variant="danger"
        isLoading={isDeleting}
        isDisabled={isDeleting}
        onClick={onConfirm}
        data-testid="agent-delete-modal-confirm"
      >
        Delete
      </Button>
      <Button
        variant="link"
        isDisabled={isDeleting}
        onClick={onCancel}
        data-testid="agent-delete-modal-cancel"
      >
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default AgentDeleteModal;
