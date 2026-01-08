import * as React from 'react';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const handleCancel = () => {
    fireFormTrackingEvent('Playground New Chat Canceled', {
      outcome: TrackingOutcome.cancel,
    });
    onClose();
  };

  const handleConfirm = () => {
    fireFormTrackingEvent('Playground New Chat Confirmed', {
      outcome: TrackingOutcome.submit,
      success: true,
    });
    onConfirm();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ContentModal
      title="Start a new chat?"
      onClose={handleCancel}
      variant="small"
      dataTestId="new-chat-modal"
      titleIconVariant="warning"
      contents="Starting a new chat clears your previous chat history permanently. This action cannot be undone."
      buttonActions={[
        {
          label: 'Start new chat',
          onClick: handleConfirm,
          variant: 'primary',
          dataTestId: 'confirm-button',
        },
        {
          label: 'Cancel',
          onClick: handleCancel,
          variant: 'link',
          dataTestId: 'cancel-button',
        },
      ]}
    />
  );
};

export default NewChatModal;
