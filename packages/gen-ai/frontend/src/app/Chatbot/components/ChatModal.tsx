import * as React from 'react';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';

export type PlaygroundConfirmModalVariant = 'new-chat' | 'compare';

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  variant?: PlaygroundConfirmModalVariant;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  variant = 'new-chat',
}) => {
  const isCompare = variant === 'compare';

  const handleCancel = () => {
    fireFormTrackingEvent(
      isCompare ? 'Playground Compare Chat Canceled' : 'Playground New Chat Canceled',
      { outcome: TrackingOutcome.cancel },
    );
    onClose();
  };

  const handleConfirm = () => {
    fireFormTrackingEvent(
      isCompare ? 'Playground Compare Chat Confirmed' : 'Playground New Chat Confirmed',
      { outcome: TrackingOutcome.submit, success: true },
    );
    onConfirm();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ContentModal
      title="Start a new session?"
      onClose={handleCancel}
      variant="small"
      dataTestId={isCompare ? 'compare-chat-modal' : 'new-chat-modal'}
      titleIconVariant="warning"
      contents="The current chat history will be deleted. Your chat settings will not be affected. This action cannot be undone."
      buttonActions={[
        {
          label: 'Start a new chat session',
          onClick: handleConfirm,
          variant: 'primary',
          dataTestId: isCompare ? 'confirm-compare-button' : 'confirm-button',
        },
        {
          label: 'Cancel',
          onClick: handleCancel,
          variant: 'link',
          dataTestId: isCompare ? 'cancel-compare-button' : 'cancel-button',
        },
      ]}
    />
  );
};

export default ChatModal;
