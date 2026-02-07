import * as React from 'react';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';

interface CompareChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CompareChatModal: React.FC<CompareChatModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const handleCancel = () => {
    fireFormTrackingEvent('Playground Compare Chat Canceled', {
      outcome: TrackingOutcome.cancel,
    });
    onClose();
  };

  const handleConfirm = () => {
    fireFormTrackingEvent('Playground Compare Chat Confirmed', {
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
      title="Start a chat compare session?"
      onClose={handleCancel}
      variant="small"
      dataTestId="compare-chat-modal"
      titleIconVariant="warning"
      contents="Starting a new chat compare session will delete your current chat session. This action cannot be undone."
      buttonActions={[
        {
          label: 'Start new chat session',
          onClick: handleConfirm,
          variant: 'primary',
          dataTestId: 'confirm-compare-button',
        },
        {
          label: 'Cancel',
          onClick: handleCancel,
          variant: 'link',
          dataTestId: 'cancel-compare-button',
        },
      ]}
    />
  );
};

export default CompareChatModal;
