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
    title="Replace current content?"
    titleIconVariant="warning"
    variant="small"
    dataTestId="replace-content-confirm-modal"
    onClose={onClose}
    buttonActions={[
      {
        label: 'Continue',
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
    contents="Selecting a template will replace the current form content. Do you want to continue?"
  />
);

export default ReplaceContentConfirmModal;
