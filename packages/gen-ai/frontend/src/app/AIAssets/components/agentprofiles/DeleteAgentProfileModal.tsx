import * as React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Content,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { AgentProfileSummary } from '~/app/agentProfile/types';

type DeleteAgentProfileModalProps = {
  profile: AgentProfileSummary;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

const DeleteAgentProfileModal: React.FC<DeleteAgentProfileModalProps> = ({
  profile,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      variant="small"
      isOpen
      onClose={onClose}
      aria-labelledby="delete-agent-profile-modal-title"
      data-testid="delete-agent-profile-modal"
    >
      <ModalHeader
        title="Delete agent profile?"
        labelId="delete-agent-profile-modal-title"
        titleIconVariant="warning"
      />
      <ModalBody>
        <Content>
          <p>
            The <strong>{profile.displayName}</strong> agent profile will be permanently deleted.
            This action cannot be undone.
          </p>
          {error && (
            <HelperText>
              <HelperTextItem variant="error">{error}</HelperTextItem>
            </HelperText>
          )}
        </Content>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleConfirm}
          isLoading={isDeleting}
          isDisabled={isDeleting}
          data-testid="delete-agent-profile-confirm-button"
        >
          Delete
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isDeleting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteAgentProfileModal;
