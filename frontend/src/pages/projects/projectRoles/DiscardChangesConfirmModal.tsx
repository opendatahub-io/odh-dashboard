import * as React from 'react';
import ContentModal from '#~/components/modals/ContentModal';

type DiscardChangesConfirmModalProps = {
  onDiscard: () => void;
  onClose: () => void;
};

const DiscardChangesConfirmModal: React.FC<DiscardChangesConfirmModalProps> = ({
  onDiscard,
  onClose,
}) => (
  <ContentModal
    title="Replace current content?"
    titleIconVariant="warning"
    variant="small"
    dataTestId="discard-changes-confirm-modal"
    onClose={onClose}
    buttonActions={[
      {
        label: 'Continue',
        onClick: onDiscard,
        variant: 'primary',
        dataTestId: 'discard-confirm-button',
      },
      {
        label: 'Cancel',
        onClick: onClose,
        variant: 'link',
        dataTestId: 'discard-cancel-button',
      },
    ]}
    contents="Selecting a template will replace the current form content. Do you want to continue?"
  />
);

export default DiscardChangesConfirmModal;
