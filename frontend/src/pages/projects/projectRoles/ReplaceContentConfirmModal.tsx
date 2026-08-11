import * as React from 'react';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';

type ReplaceContentConfirmModalProps = {
  onConfirm: () => void;
  onClose: () => void;
};

const ReplaceContentConfirmModal: React.FC<ReplaceContentConfirmModalProps> = ({
  onConfirm,
  onClose,
}) => (
  <ContentModal
    title="Discard unsaved changes?"
    titleIconVariant="warning"
    variant="small"
    dataTestId="replace-content-confirm-modal"
    onClose={onClose}
    buttonActions={[
      {
        label: 'Discard',
        onClick: onConfirm,
        variant: 'primary',
        dataTestId: 'replace-confirm-button',
      },
      {
        label: 'Cancel',
        onClick: onClose,
        variant: 'link',
        dataTestId: 'replace-cancel-button',
      },
    ]}
    contents="Your changes to this form are not saved yet. Discard your changes and start creating a new role from the template, or cancel to continue editing."
  />
);

export default ReplaceContentConfirmModal;
