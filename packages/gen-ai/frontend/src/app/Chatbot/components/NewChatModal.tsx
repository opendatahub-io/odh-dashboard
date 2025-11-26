import * as React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const handleCancel = () => {
    fireFormTrackingEvent('Playground New Chat', {
      outcome: TrackingOutcome.cancel,
    });
    onClose();
  };

  const handleConfirm = () => {
    fireFormTrackingEvent('Playground New Chat', {
      outcome: TrackingOutcome.submit,
      success: true,
    });
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      variant={ModalVariant.small}
      data-testid="new-chat-modal"
    >
      <ModalHeader title="Start a new chat?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            Starting a new chat clears your previous chat history permanently. This action cannot be
            undone.
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="confirm"
          variant="primary"
          onClick={handleConfirm}
          data-testid="confirm-button"
        >
          Start new chat
        </Button>
        <Button key="cancel" variant="link" onClick={handleCancel} data-testid="cancel-button">
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default NewChatModal;
