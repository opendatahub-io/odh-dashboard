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
    title="Discard unsaved changes?"
    titleIconVariant="warning"
    variant="small"
    dataTestId="discard-changes-confirm-modal"
    onClose={onClose}
    buttonActions={[
      {
        label: 'Discard',
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
    contents={
      <>
        Your changes to this form are not saved yet. Discard your changes and start creating a new
        role from the template, or cancel to continue editing.
      </>
    }
  />
);

export default DiscardChangesConfirmModal;
