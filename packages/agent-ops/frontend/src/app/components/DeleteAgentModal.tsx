import * as React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';

type DeleteAgentModalProps = {
  agentName: string;
  agentNamespace: string;
  isDeleting: boolean;
  onDelete: () => void;
  onClose: () => void;
};

const DeleteAgentModal: React.FC<DeleteAgentModalProps> = ({
  agentName,
  agentNamespace,
  isDeleting,
  onDelete,
  onClose,
}) => (
  <Modal
    variant="small"
    isOpen
    onClose={onClose}
    aria-labelledby="delete-agent-modal-title"
    data-testid="delete-agent-modal"
  >
    <ModalHeader title="Delete agent?" labelId="delete-agent-modal-title" />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>
          Are you sure you want to delete agent <strong>{agentName}</strong> in project{' '}
          <strong>{agentNamespace}</strong>? This action cannot be undone.
        </StackItem>
      </Stack>
    </ModalBody>
    <ModalFooter>
      <Button
        variant="danger"
        onClick={onDelete}
        isDisabled={isDeleting}
        isLoading={isDeleting}
        data-testid="delete-agent-confirm-button"
      >
        Delete
      </Button>
      <Button
        variant="link"
        onClick={onClose}
        isDisabled={isDeleting}
        data-testid="delete-agent-cancel-button"
      >
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default DeleteAgentModal;
